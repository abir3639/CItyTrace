"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  HEATMAP_ZONES,
  URBAN_TREES,
  UTILITY_CONDUITS,
  type BuildingSpec,
  type CityMapId,
  type CityRenderMode,
} from "./cityMapsData";

/* ------------------------------------------------------------------ */
/* Module-level procedural window facade textures                      */
/* ------------------------------------------------------------------ */

const facadeTextureCache = new Map<string, THREE.CanvasTexture>();

function getFacadeTexture(variant: "cyan" | "warm" | "civic"): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const cached = facadeTextureCache.get(variant);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const litColors =
    variant === "warm"
      ? ["#fbbf24", "#38bdf8", "#94a3b8", "#f59e0b"]
      : variant === "civic"
        ? ["#22d3ee", "#34d399", "#7dd3fc", "#0ea5e9"]
        : ["#38bdf8", "#22d3ee", "#64748b", "#bae6fd"];

  let seed = variant === "warm" ? 17 : variant === "civic" ? 43 : 71;
  const nextRand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 100) / 100;
  };

  for (let row = 4; row < 124; row += 10) {
    for (let col = 4; col < 60; col += 9) {
      const r = nextRand();
      if (r > 0.36) {
        ctx.fillStyle = litColors[Math.floor(nextRand() * litColors.length)];
        ctx.globalAlpha = 0.45 + nextRand() * 0.5;
        ctx.fillRect(col, row, 5, 6);
      } else {
        ctx.fillStyle = "#0f172a";
        ctx.globalAlpha = 0.65;
        ctx.fillRect(col, row, 5, 6);
      }
    }
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  facadeTextureCache.set(variant, texture);
  return texture;
}

/* ------------------------------------------------------------------ */
/* Architecturally varied Dhaka buildings & clickable landmarks         */
/* ------------------------------------------------------------------ */

export const DetailedBuilding = memo(function DetailedBuilding({
  b,
  renderMode,
  isEmphasized,
  isSelectedLandmark,
  onSelectLandmark,
}: {
  b: BuildingSpec;
  renderMode: CityRenderMode;
  isEmphasized: boolean;
  isSelectedLandmark: boolean;
  onSelectLandmark: (landmarkId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const isLandmark = Boolean(b.landmarkId);
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(b.w, b.h, b.d);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [b.w, b.h, b.d]);

  useEffect(() => () => edgesGeo.dispose(), [edgesGeo]);

  useEffect(() => {
    if (!isLandmark) return;
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, isLandmark]);

  const facadeTex = useMemo(() => {
    if (renderMode !== "twin" || !isEmphasized) return null;
    const variant =
      b.tone === "landmark" || b.tone === "civic"
        ? "civic"
        : b.archetype === "dhaka-apartment"
          ? "warm"
          : "cyan";
    return getFacadeTexture(variant);
  }, [renderMode, isEmphasized, b.tone, b.archetype]);

  const fillColor =
    b.tone === "landmark"
      ? "#153252"
      : b.tone === "civic"
        ? "#132944"
        : b.tone === "primary"
          ? "#0e2038"
          : "#0a1729";
  const roofColor =
    isSelectedLandmark || hovered
      ? "#0891b2"
      : b.edgeGlow
        ? "#173c5e"
        : "#11243c";

  const bodyOpacity =
    renderMode === "xray"
      ? isEmphasized
        ? 0.16
        : 0.08
      : renderMode === "heatmap"
        ? isEmphasized
          ? 0.36
          : 0.18
        : isEmphasized
          ? 1
          : 0.32;

  const isTransparent = bodyOpacity < 1;
  const edgeColor =
    isSelectedLandmark || hovered
      ? "#38bdf8"
      : b.tone === "landmark"
        ? "#22d3ee"
        : b.edgeGlow
          ? "#22d3ee"
          : "#1e3a5f";
  const edgeOpacity =
    renderMode === "xray"
      ? isEmphasized
        ? 0.42
        : 0.18
      : isSelectedLandmark || hovered
        ? 0.95
        : isEmphasized
          ? b.edgeGlow
            ? 0.55
            : 0.3
          : 0.15;

  const hasSetback =
    b.archetype === "highrise-stepped" || b.archetype === "civic-tower";
  const setbackH = hasSetback ? Math.min(0.65, b.h * 0.28) : 0;

  return (
    <group
      position={[b.x, 0, b.z]}
      onClick={
        b.landmarkId
          ? (event) => {
              event.stopPropagation();
              onSelectLandmark(b.landmarkId!);
            }
          : undefined
      }
      onPointerOver={
        b.landmarkId
          ? (event) => {
              event.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={
        b.landmarkId
          ? () => {
              setHovered(false);
            }
          : undefined
      }
    >
      {/* Ground podium plinth */}
      <mesh position={[0, 0.09, 0]}>
        <boxGeometry args={[b.w * 1.07, 0.18, b.d * 1.07]} />
        <meshStandardMaterial
          color="#091525"
          roughness={0.85}
          transparent={isTransparent}
          opacity={bodyOpacity}
          depthWrite={!isTransparent}
        />
      </mesh>

      {/* Main tower body */}
      <mesh position={[0, b.h / 2, 0]}>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color={fillColor}
          roughness={0.74}
          metalness={0.24}
          emissive={
            isSelectedLandmark
              ? "#06b6d4"
              : facadeTex
                ? "#ffffff"
                : b.tone === "landmark"
                  ? "#083344"
                  : "#000000"
          }
          emissiveMap={facadeTex}
          emissiveIntensity={
            isSelectedLandmark ? 0.45 : facadeTex ? 0.58 : b.tone === "landmark" ? 0.3 : 0
          }
          transparent={isTransparent}
          opacity={bodyOpacity}
          depthWrite={!isTransparent}
        />
      </mesh>

      {/* Stepped upper setback tier for tall Dhaka towers */}
      {hasSetback && renderMode !== "xray" ? (
        <mesh position={[0, b.h + setbackH / 2, 0]}>
          <boxGeometry args={[b.w * 0.68, setbackH, b.d * 0.68]} />
          <meshStandardMaterial
            color={roofColor}
            roughness={0.62}
            metalness={0.28}
            transparent={isTransparent}
            opacity={bodyOpacity}
            depthWrite={!isTransparent}
          />
        </mesh>
      ) : null}

      {/* Horizontal balcony / cornice bands on Dhaka apartments */}
      {b.archetype === "dhaka-apartment" && b.h >= 1.7 && renderMode === "twin" ? (
        <mesh position={[0, b.h * 0.52, 0]}>
          <boxGeometry args={[b.w * 1.05, 0.06, b.d * 1.05]} />
          <meshStandardMaterial
            color="#1e3a5f"
            roughness={0.7}
            transparent={isTransparent}
            opacity={bodyOpacity}
          />
        </mesh>
      ) : null}

      {/* Roof cap */}
      <mesh position={[0, b.h + setbackH + 0.035, 0]}>
        <boxGeometry args={[b.w * (hasSetback ? 0.6 : 0.86), 0.07, b.d * (hasSetback ? 0.6 : 0.86)]} />
        <meshStandardMaterial
          color={roofColor}
          emissive={
            isSelectedLandmark || hovered
              ? "#22d3ee"
              : b.edgeGlow
                ? "#083344"
                : "#000000"
          }
          emissiveIntensity={isSelectedLandmark || hovered ? 1.15 : b.edgeGlow ? 0.55 : 0}
          roughness={0.58}
          transparent={isTransparent}
          opacity={bodyOpacity}
          depthWrite={!isTransparent}
        />
      </mesh>

      {/* Rooftop architectural details */}
      {renderMode === "twin" && isEmphasized && b.roofFeature === "water-tank" ? (
        <group position={[b.w * 0.16, b.h + setbackH + 0.16, b.d * 0.12]}>
          <mesh>
            <cylinderGeometry args={[0.1, 0.1, 0.18, 8]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-0.24, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.16, 8]} />
            <meshStandardMaterial color="#0f172a" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ) : null}

      {renderMode === "twin" && isEmphasized && b.roofFeature === "solar" ? (
        <mesh
          position={[0, b.h + setbackH + 0.11, 0]}
          rotation={[-0.18, 0, 0]}
        >
          <boxGeometry args={[b.w * 0.54, 0.04, b.d * 0.48]} />
          <meshStandardMaterial
            color="#0ea5e9"
            emissive="#0284c7"
            emissiveIntensity={0.4}
            roughness={0.25}
            metalness={0.6}
          />
        </mesh>
      ) : null}

      {renderMode === "twin" && isEmphasized && b.roofFeature === "spire" ? (
        <mesh position={[0, b.h + setbackH + 0.35, 0]}>
          <cylinderGeometry args={[0.015, 0.03, 0.6, 6]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} />
        </mesh>
      ) : null}

      {renderMode === "twin" && isEmphasized && b.roofFeature === "helipad" ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, b.h + setbackH + 0.08, 0]}
        >
          <ringGeometry args={[0.22, 0.3, 18]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
        </mesh>
      ) : null}

      {b.roofFeature === "dome" ? (
        <group position={[0, b.h + 0.08, 0]}>
          <mesh>
            <sphereGeometry args={[Math.min(b.w, b.d) * 0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#059669"
              emissiveIntensity={renderMode === "twin" ? 0.55 : 0.2}
              roughness={0.35}
              transparent={isTransparent}
              opacity={bodyOpacity}
            />
          </mesh>
          <mesh position={[b.w * 0.36, 0.45, -b.d * 0.34]}>
            <cylinderGeometry args={[0.07, 0.1, 1.0, 8]} />
            <meshStandardMaterial
              color="#173c5e"
              emissive="#22d3ee"
              emissiveIntensity={0.35}
              transparent={isTransparent}
              opacity={bodyOpacity}
            />
          </mesh>
        </group>
      ) : null}

      {/* Landmark glowing rooftop beacon ring */}
      {isLandmark ? (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.035, 0]}
        >
          <ringGeometry args={[Math.max(b.w, b.d) * 0.64, Math.max(b.w, b.d) * 0.74, 24]} />
          <meshBasicMaterial
            color={isSelectedLandmark || hovered ? "#38bdf8" : "#22d3ee"}
            transparent
            opacity={isSelectedLandmark || hovered ? 0.85 : 0.38}
          />
        </mesh>
      ) : null}

      {/* Crisp blueprint edges */}
      <lineSegments position={[0, b.h / 2, 0]} geometry={edgesGeo}>
        <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
      </lineSegments>
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Elevated Metro Rail & animated train                                */
/* ------------------------------------------------------------------ */

export const ElevatedMetroLine = memo(function ElevatedMetroLine({
  renderMode,
  onSelectStation,
}: {
  renderMode: CityRenderMode;
  onSelectStation: () => void;
}) {
  const trainRef = useRef<THREE.Group | null>(null);
  const pierPositions = [-12.5, -8.5, -4.5, -1.0, 3.2, 7.2, 11.2];

  useFrame(({ clock }) => {
    if (!trainRef.current) return;
    const t = clock.getElapsedTime();
    trainRef.current.position.z = Math.sin(t * 0.34) * 11.8;
  });

  const isXray = renderMode === "xray";

  return (
    <group position={[-1.5, 0, 0]}>
      {/* Viaduct deck along N-S Arterial */}
      <mesh position={[0, 2.88, 0]}>
        <boxGeometry args={[0.58, 0.16, 28]} />
        <meshStandardMaterial
          color="#132944"
          roughness={0.55}
          metalness={0.3}
          transparent={isXray}
          opacity={isXray ? 0.35 : 0.95}
        />
      </mesh>
      {/* Viaduct guideway neon rail */}
      <mesh position={[0, 2.97, 0]}>
        <boxGeometry args={[0.12, 0.03, 28]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.55} />
      </mesh>

      {/* Support piers (skipping z=1.2 intersection pad) */}
      {pierPositions.map((pz, idx) => (
        <mesh key={`pier-${idx}`} position={[0, 1.42, pz]}>
          <cylinderGeometry args={[0.12, 0.16, 2.84, 8]} />
          <meshStandardMaterial
            color="#1e3a5f"
            roughness={0.7}
            transparent={isXray}
            opacity={isXray ? 0.35 : 0.9}
          />
        </mesh>
      ))}

      {/* Sector 04 Station platform canopy */}
      <group
        position={[0, 3.12, 3.4]}
        onClick={(event) => {
          event.stopPropagation();
          onSelectStation();
        }}
      >
        <mesh>
          <boxGeometry args={[1.25, 0.09, 2.8]} />
          <meshStandardMaterial
            color="#0e7490"
            emissive="#0891b2"
            emissiveIntensity={0.45}
            transparent
            opacity={isXray ? 0.4 : 0.88}
          />
        </mesh>
      </group>

      {/* Animated 3-car Metro Train */}
      <group ref={trainRef} position={[0, 3.12, 0]}>
        {[-0.95, 0, 0.95].map((dz, idx) => (
          <mesh key={`car-${idx}`} position={[0, 0, dz]}>
            <boxGeometry args={[0.32, 0.24, 0.82]} />
            <meshStandardMaterial
              color="#e2e8f0"
              emissive="#22d3ee"
              emissiveIntensity={0.75}
              roughness={0.25}
              metalness={0.5}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Canal Bridges, Pedestrian Footbridges & Parks                       */
/* ------------------------------------------------------------------ */

export const BridgesAndGreenery = memo(function BridgesAndGreenery({
  renderMode,
}: {
  renderMode: CityRenderMode;
}) {
  const isMuted = renderMode !== "twin";
  const canalBridgeZs = [1.2, -5.0, 5.2];

  return (
    <group>
      {/* Canal crossing bridges */}
      {canalBridgeZs.map((bz, idx) => (
        <group key={`cbridge-${idx}`} position={[-6.2, 0.14, bz]}>
          <mesh>
            <boxGeometry args={[2.1, 0.14, 1.75]} />
            <meshStandardMaterial color="#1b3352" roughness={0.75} />
          </mesh>
          <mesh position={[0, 0.12, 0.84]}>
            <boxGeometry args={[2.1, 0.1, 0.06]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
          </mesh>
          <mesh position={[0, 0.12, -0.84]}>
            <boxGeometry args={[2.1, 0.1, 0.06]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.45} />
          </mesh>
        </group>
      ))}

      {/* East Boulevard School Zone & South Market Pedestrian Footbridges */}
      {[
        { x: 5.4, z: -2.2 },
        { x: 2.2, z: -5.0 },
      ].map((fb, idx) => (
        <group key={`fbridge-${idx}`} position={[fb.x, 0, fb.z]}>
          <mesh position={[0, 1.55, 0]}>
            <boxGeometry args={[2.15, 0.1, 0.48]} />
            <meshStandardMaterial
              color="#10b981"
              emissive="#059669"
              emissiveIntensity={0.4}
              transparent={isMuted}
              opacity={isMuted ? 0.35 : 0.9}
            />
          </mesh>
          <mesh position={[-0.95, 0.78, 0]}>
            <boxGeometry args={[0.12, 1.56, 0.38]} />
            <meshStandardMaterial color="#1e3a5f" transparent={isMuted} opacity={isMuted ? 0.35 : 0.9} />
          </mesh>
          <mesh position={[0.95, 0.78, 0]}>
            <boxGeometry args={[0.12, 1.56, 0.38]} />
            <meshStandardMaterial color="#1e3a5f" transparent={isMuted} opacity={isMuted ? 0.35 : 0.9} />
          </mesh>
        </group>
      ))}

      {/* Urban Parks & Street Trees */}
      {URBAN_TREES.map((tree) => (
        <group key={tree.id} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.04, 0.055, 0.36, 5]} />
            <meshStandardMaterial
              color="#334155"
              transparent={isMuted}
              opacity={isMuted ? 0.25 : 0.9}
            />
          </mesh>
          <mesh position={[0, 0.52, 0]}>
            <dodecahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial
              color="#065f46"
              emissive="#10b981"
              emissiveIntensity={renderMode === "twin" ? 0.25 : 0.05}
              roughness={0.8}
              transparent={isMuted}
              opacity={isMuted ? 0.22 : 0.92}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Subsurface Utilities (X-Ray & Engineering Map)                      */
/* ------------------------------------------------------------------ */

export const SubsurfaceUtilities = memo(function SubsurfaceUtilities({
  visible,
}: {
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <group position={[0, 0.06, 0]}>
      {UTILITY_CONDUITS.map((conduit) => {
        const segments: {
          key: string;
          cx: number;
          cz: number;
          length: number;
          angle: number;
        }[] = [];

        for (let i = 0; i < conduit.points.length - 1; i += 1) {
          const [x1, z1] = conduit.points[i];
          const [x2, z2] = conduit.points[i + 1];
          const dx = x2 - x1;
          const dz = z2 - z1;
          segments.push({
            key: `${conduit.id}-${i}`,
            cx: (x1 + x2) / 2,
            cz: (z1 + z2) / 2,
            length: Math.hypot(dx, dz),
            angle: Math.atan2(dx, dz),
          });
        }

        return (
          <group key={conduit.id}>
            {segments.map((seg) => (
              <mesh
                key={seg.key}
                position={[seg.cx, 0, seg.cz]}
                rotation={[Math.PI / 2, 0, -seg.angle]}
              >
                <cylinderGeometry args={[conduit.radius, conduit.radius, seg.length, 8]} />
                <meshStandardMaterial
                  color={conduit.color}
                  emissive={conduit.color}
                  emissiveIntensity={1.2}
                  transparent
                  opacity={0.9}
                />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Risk Heatmap & Hydrology Floodplain Overlays                        */
/* ------------------------------------------------------------------ */

export const MapOverlayLayers = memo(function MapOverlayLayers({
  mapId,
  renderMode,
}: {
  mapId: CityMapId;
  renderMode: CityRenderMode;
}) {
  const showHeatmap = renderMode === "heatmap";
  const showFlood = mapId === "hydrology-basin";
  const showSmartGlow = mapId === "smart-corridor";

  return (
    <group>
      {showHeatmap
        ? HEATMAP_ZONES.map((zone) => (
            <group key={zone.id} position={[zone.x, 0.024, zone.z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[zone.radius, 32]} />
                <meshBasicMaterial
                  color={zone.color}
                  transparent
                  opacity={0.22 * zone.intensity}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
                <ringGeometry args={[zone.radius * 0.84, zone.radius * 0.96, 32]} />
                <meshBasicMaterial color={zone.color} transparent opacity={0.65} />
              </mesh>
            </group>
          ))
        : null}

      {showFlood ? (
        <group>
          {/* Monsoon standing-water basins along Canal West & South Market */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7.1, 0.022, -2.5]}>
            <circleGeometry args={[2.8, 32]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0ea5e9"
              emissiveIntensity={0.45}
              transparent
              opacity={0.34}
              roughness={0.2}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.0, 0.022, -5.2]}>
            <circleGeometry args={[1.9, 28]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0ea5e9"
              emissiveIntensity={0.38}
              transparent
              opacity={0.28}
              roughness={0.2}
            />
          </mesh>
        </group>
      ) : null}

      {showSmartGlow ? (
        <group>
          {/* Illuminated LED corridor ground pools along East Civic Boulevard */}
          {[-5.2, -3.5, -1.8, -0.1, 2.8, 4.8].map((z, idx) => (
            <mesh key={`led-pool-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[5.6, 0.022, z]}>
              <circleGeometry args={[0.9, 20]} />
              <meshBasicMaterial color="#10b981" transparent opacity={0.26} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Subtle animated arterial traffic pulses                             */
/* ------------------------------------------------------------------ */

export const TrafficPulses = memo(function TrafficPulses({
  visible,
}: {
  visible: boolean;
}) {
  const pulse1 = useRef<THREE.Mesh | null>(null);
  const pulse2 = useRef<THREE.Mesh | null>(null);
  const pulse3 = useRef<THREE.Mesh | null>(null);

  useFrame(({ clock }) => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (pulse1.current) {
      pulse1.current.position.x = ((t * 3.1) % 28) - 14;
    }
    if (pulse2.current) {
      pulse2.current.position.x = 14 - ((t * 2.5 + 9) % 28);
    }
    if (pulse3.current) {
      pulse3.current.position.z = ((t * 2.7 + 4) % 26) - 13;
    }
  });

  if (!visible) return null;

  return (
    <group>
      <mesh ref={pulse1} position={[0, 0.07, 1.55]}>
        <boxGeometry args={[0.42, 0.06, 0.14]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
      </mesh>
      <mesh ref={pulse2} position={[0, 0.07, 0.85]}>
        <boxGeometry args={[0.42, 0.06, 0.14]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} />
      </mesh>
      <mesh ref={pulse3} position={[5.4, 0.07, 0]}>
        <boxGeometry args={[0.14, 0.06, 0.42]} />
        <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
      </mesh>
    </group>
  );
});
