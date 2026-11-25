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
/* Module-level architectural daylight facade textures                 */
/* ------------------------------------------------------------------ */

const facadeTextureCache = new Map<string, THREE.CanvasTexture>();

function getDaylightFacadeTexture(
  variant: "limestone" | "warm-stone" | "civic-glass"
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const cached = facadeTextureCache.get(variant);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle =
    variant === "civic-glass"
      ? "#EEF3F9"
      : variant === "warm-stone"
        ? "#F6F5F2"
        : "#F7F8FA";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const windowColors =
    variant === "civic-glass"
      ? ["#AEC4DE", "#BFD2E8", "#9DB7D4"]
      : variant === "warm-stone"
        ? ["#C8CFD8", "#D7DDE6", "#BCC5D1"]
        : ["#C2CCD9", "#D3DBE6", "#B4C0CE"];

  let seed = variant === "warm-stone" ? 19 : variant === "civic-glass" ? 41 : 73;
  const nextRand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed % 100) / 100;
  };

  for (let row = 5; row < 123; row += 10) {
    for (let col = 4; col < 60; col += 9) {
      ctx.fillStyle = windowColors[Math.floor(nextRand() * windowColors.length)];
      ctx.globalAlpha = 0.72 + nextRand() * 0.2;
      ctx.fillRect(col, row, 5, 6);
    }
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  facadeTextureCache.set(variant, texture);
  return texture;
}

/* ------------------------------------------------------------------ */
/* Soft off-white Dhaka architectural buildings & civic landmarks      */
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
        ? "civic-glass"
        : b.archetype === "dhaka-apartment"
          ? "warm-stone"
          : "limestone";
    return getDaylightFacadeTexture(variant);
  }, [renderMode, isEmphasized, b.tone, b.archetype]);

  const fillColor =
    b.tone === "landmark"
      ? "#FFFFFF"
      : b.tone === "civic"
        ? "#F4F7FB"
        : b.tone === "primary"
          ? "#F8F9FB"
          : "#F2F4F7";

  const roofColor =
    isSelectedLandmark || hovered
      ? "#007AFF"
      : b.tone === "landmark"
        ? "#E4ECF7"
        : "#E5E9F0";

  const bodyOpacity =
    renderMode === "xray"
      ? isEmphasized
        ? 0.22
        : 0.12
      : renderMode === "heatmap"
        ? isEmphasized
          ? 0.48
          : 0.25
        : isEmphasized
          ? 1
          : 0.36;

  const isTransparent = bodyOpacity < 1;
  const edgeColor =
    isSelectedLandmark || hovered
      ? "#007AFF"
      : b.tone === "landmark"
        ? "#93B4DC"
        : "#CBD3DF";
  const edgeOpacity =
    renderMode === "xray"
      ? isEmphasized
        ? 0.55
        : 0.25
      : isSelectedLandmark || hovered
        ? 0.95
        : isEmphasized
          ? 0.55
          : 0.25;

  const hasSetback =
    b.archetype === "highrise-stepped" || b.archetype === "civic-tower";
  const setbackH = hasSetback ? Math.min(0.62, b.h * 0.26) : 0;

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
      {/* Subtle architectural plinth */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <boxGeometry args={[b.w * 1.06, 0.14, b.d * 1.06]} />
        <meshStandardMaterial
          color="#E2E7EE"
          roughness={0.85}
          transparent={isTransparent}
          opacity={bodyOpacity}
          depthWrite={!isTransparent}
        />
      </mesh>

      {/* Main building mass */}
      <mesh position={[0, b.h / 2, 0]} castShadow={isEmphasized && !isTransparent} receiveShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color={fillColor}
          map={facadeTex}
          roughness={0.72}
          metalness={0.04}
          emissive={isSelectedLandmark ? "#007AFF" : "#000000"}
          emissiveIntensity={isSelectedLandmark ? 0.12 : 0}
          transparent={isTransparent}
          opacity={bodyOpacity}
          depthWrite={!isTransparent}
        />
      </mesh>

      {/* Stepped upper setback tier */}
      {hasSetback && renderMode !== "xray" ? (
        <mesh position={[0, b.h + setbackH / 2, 0]} castShadow={isEmphasized && !isTransparent} receiveShadow>
          <boxGeometry args={[b.w * 0.68, setbackH, b.d * 0.68]} />
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.68}
            metalness={0.05}
            transparent={isTransparent}
            opacity={bodyOpacity}
            depthWrite={!isTransparent}
          />
        </mesh>
      ) : null}

      {/* Balcony cornice bands on residential apartments */}
      {b.archetype === "dhaka-apartment" && b.h >= 1.7 && renderMode === "twin" ? (
        <mesh position={[0, b.h * 0.52, 0]}>
          <boxGeometry args={[b.w * 1.04, 0.05, b.d * 1.04]} />
          <meshStandardMaterial
            color="#DCE2EC"
            roughness={0.75}
            transparent={isTransparent}
            opacity={bodyOpacity}
          />
        </mesh>
      ) : null}

      {/* Clean roof cap */}
      <mesh position={[0, b.h + setbackH + 0.03, 0]} receiveShadow>
        <boxGeometry
          args={[b.w * (hasSetback ? 0.6 : 0.88), 0.06, b.d * (hasSetback ? 0.6 : 0.88)]}
        />
        <meshStandardMaterial
          color={roofColor}
          roughness={0.65}
          transparent={isTransparent}
          opacity={bodyOpacity}
          depthWrite={!isTransparent}
        />
      </mesh>

      {/* Rooftop architectural details */}
      {renderMode === "twin" && isEmphasized && b.roofFeature === "water-tank" ? (
        <group position={[b.w * 0.16, b.h + setbackH + 0.15, b.d * 0.12]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.095, 0.095, 0.17, 10]} />
            <meshStandardMaterial color="#8E9AA9" metalness={0.15} roughness={0.55} />
          </mesh>
          <mesh position={[-0.22, 0, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.15, 10]} />
            <meshStandardMaterial color="#A3AEBD" metalness={0.15} roughness={0.6} />
          </mesh>
        </group>
      ) : null}

      {renderMode === "twin" && isEmphasized && b.roofFeature === "solar" ? (
        <mesh position={[0, b.h + setbackH + 0.1, 0]} rotation={[-0.16, 0, 0]} castShadow>
          <boxGeometry args={[b.w * 0.52, 0.035, b.d * 0.46]} />
          <meshStandardMaterial color="#3B6EA5" roughness={0.3} metalness={0.35} />
        </mesh>
      ) : null}

      {renderMode === "twin" && isEmphasized && b.roofFeature === "spire" ? (
        <mesh position={[0, b.h + setbackH + 0.32, 0]}>
          <cylinderGeometry args={[0.014, 0.028, 0.55, 8]} />
          <meshStandardMaterial color="#8E9AA9" metalness={0.4} roughness={0.35} />
        </mesh>
      ) : null}

      {renderMode === "twin" && isEmphasized && b.roofFeature === "helipad" ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, b.h + setbackH + 0.07, 0]}>
          <ringGeometry args={[0.22, 0.29, 20]} />
          <meshBasicMaterial color="#007AFF" transparent opacity={0.75} />
        </mesh>
      ) : null}

      {b.roofFeature === "dome" ? (
        <group position={[0, b.h + 0.06, 0]}>
          <mesh castShadow>
            <sphereGeometry
              args={[Math.min(b.w, b.d) * 0.31, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial
              color="#34A867"
              roughness={0.45}
              transparent={isTransparent}
              opacity={bodyOpacity}
            />
          </mesh>
          <mesh position={[b.w * 0.35, 0.44, -b.d * 0.33]} castShadow>
            <cylinderGeometry args={[0.065, 0.095, 0.96, 10]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.65}
              transparent={isTransparent}
              opacity={bodyOpacity}
            />
          </mesh>
        </group>
      ) : null}

      {/* Landmark ground selection ring (Apple Blue when hovered/selected) */}
      {isLandmark ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
          <ringGeometry args={[Math.max(b.w, b.d) * 0.64, Math.max(b.w, b.d) * 0.72, 28]} />
          <meshBasicMaterial
            color="#007AFF"
            transparent
            opacity={isSelectedLandmark || hovered ? 0.85 : 0.24}
          />
        </mesh>
      ) : null}

      {/* Crisp architectural edges */}
      <lineSegments position={[0, b.h / 2, 0]} geometry={edgesGeo}>
        <lineBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
      </lineSegments>
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Elevated Metro Rail & sleek white commuter train                    */
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
    trainRef.current.position.z = Math.sin(t * 0.32) * 11.8;
  });

  const isXray = renderMode === "xray";

  return (
    <group position={[-1.5, 0, 0]}>
      {/* Viaduct deck */}
      <mesh position={[0, 2.88, 0]} castShadow={!isXray} receiveShadow>
        <boxGeometry args={[0.58, 0.16, 28]} />
        <meshStandardMaterial
          color="#DCE2EB"
          roughness={0.75}
          transparent={isXray}
          opacity={isXray ? 0.32 : 0.96}
        />
      </mesh>
      {/* Clean blue rail accent */}
      <mesh position={[0, 2.97, 0]}>
        <boxGeometry args={[0.1, 0.025, 28]} />
        <meshBasicMaterial color="#007AFF" transparent opacity={0.45} />
      </mesh>

      {/* Piers */}
      {pierPositions.map((pz, idx) => (
        <mesh key={`pier-${idx}`} position={[0, 1.42, pz]} castShadow={!isXray}>
          <cylinderGeometry args={[0.11, 0.15, 2.84, 10]} />
          <meshStandardMaterial
            color="#CFD6E0"
            roughness={0.75}
            transparent={isXray}
            opacity={isXray ? 0.32 : 0.95}
          />
        </mesh>
      ))}

      {/* Sector 04 Metro Station canopy */}
      <group
        position={[0, 3.12, 3.4]}
        onClick={(event) => {
          event.stopPropagation();
          onSelectStation();
        }}
      >
        <mesh castShadow={!isXray}>
          <boxGeometry args={[1.25, 0.09, 2.8]} />
          <meshStandardMaterial
            color="#007AFF"
            roughness={0.35}
            transparent
            opacity={isXray ? 0.35 : 0.85}
          />
        </mesh>
      </group>

      {/* Animated 3-car white Metro train */}
      <group ref={trainRef} position={[0, 3.12, 0]}>
        {[-0.95, 0, 0.95].map((dz, idx) => (
          <mesh key={`car-${idx}`} position={[0, 0, dz]} castShadow>
            <boxGeometry args={[0.32, 0.24, 0.82]} />
            <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Canal Bridges, Pedestrian Footbridges & Muted Natural Trees         */
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
      {/* Concrete canal bridges */}
      {canalBridgeZs.map((bz, idx) => (
        <group key={`cbridge-${idx}`} position={[-6.2, 0.13, bz]}>
          <mesh receiveShadow>
            <boxGeometry args={[2.1, 0.14, 1.75]} />
            <meshStandardMaterial color="#D6DCE5" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.11, 0.84]}>
            <boxGeometry args={[2.1, 0.08, 0.06]} />
            <meshStandardMaterial color="#B8C2CF" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.11, -0.84]}>
            <boxGeometry args={[2.1, 0.08, 0.06]} />
            <meshStandardMaterial color="#B8C2CF" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Pedestrian overbridges */}
      {[
        { x: 5.4, z: -2.2 },
        { x: 2.2, z: -5.0 },
      ].map((fb, idx) => (
        <group key={`fbridge-${idx}`} position={[fb.x, 0, fb.z]}>
          <mesh position={[0, 1.55, 0]} castShadow={!isMuted}>
            <boxGeometry args={[2.15, 0.09, 0.46]} />
            <meshStandardMaterial
              color="#FFFFFF"
              roughness={0.6}
              transparent={isMuted}
              opacity={isMuted ? 0.35 : 0.96}
            />
          </mesh>
          <mesh position={[-0.95, 0.78, 0]}>
            <boxGeometry args={[0.11, 1.56, 0.36]} />
            <meshStandardMaterial
              color="#CBD3DF"
              transparent={isMuted}
              opacity={isMuted ? 0.35 : 0.95}
            />
          </mesh>
          <mesh position={[0.95, 0.78, 0]}>
            <boxGeometry args={[0.11, 1.56, 0.36]} />
            <meshStandardMaterial
              color="#CBD3DF"
              transparent={isMuted}
              opacity={isMuted ? 0.35 : 0.95}
            />
          </mesh>
        </group>
      ))}

      {/* Muted natural green vegetation */}
      {URBAN_TREES.map((tree) => (
        <group key={tree.id} position={[tree.x, 0, tree.z]} scale={tree.scale}>
          <mesh position={[0, 0.17, 0]}>
            <cylinderGeometry args={[0.04, 0.055, 0.34, 6]} />
            <meshStandardMaterial
              color="#8C7A6B"
              transparent={isMuted}
              opacity={isMuted ? 0.25 : 0.95}
            />
          </mesh>
          <mesh position={[0, 0.52, 0]} castShadow={!isMuted}>
            <dodecahedronGeometry args={[0.28, 0]} />
            <meshStandardMaterial
              color="#66A674"
              roughness={0.85}
              transparent={isMuted}
              opacity={isMuted ? 0.22 : 0.96}
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
                <cylinderGeometry args={[conduit.radius, conduit.radius, seg.length, 10]} />
                <meshStandardMaterial
                  color={conduit.color}
                  roughness={0.35}
                  transparent
                  opacity={0.88}
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
                  opacity={0.18 * zone.intensity}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
                <ringGeometry args={[zone.radius * 0.88, zone.radius * 0.96, 32]} />
                <meshBasicMaterial color={zone.color} transparent opacity={0.55} />
              </mesh>
            </group>
          ))
        : null}

      {showFlood ? (
        <group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7.1, 0.022, -2.5]}>
            <circleGeometry args={[2.8, 32]} />
            <meshStandardMaterial
              color="#63AEE6"
              transparent
              opacity={0.36}
              roughness={0.25}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.0, 0.022, -5.2]}>
            <circleGeometry args={[1.9, 28]} />
            <meshStandardMaterial
              color="#63AEE6"
              transparent
              opacity={0.3}
              roughness={0.25}
            />
          </mesh>
        </group>
      ) : null}

      {showSmartGlow ? (
        <group>
          {[-5.2, -3.5, -1.8, -0.1, 2.8, 4.8].map((z, idx) => (
            <mesh key={`led-pool-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[5.6, 0.022, z]}>
              <circleGeometry args={[0.85, 20]} />
              <meshBasicMaterial color="#34C759" transparent opacity={0.18} />
            </mesh>
          ))}
        </group>
      ) : null}
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Subtle daylight arterial vehicle capsules                           */
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
      pulse1.current.position.x = ((t * 2.8) % 28) - 14;
    }
    if (pulse2.current) {
      pulse2.current.position.x = 14 - ((t * 2.3 + 9) % 28);
    }
    if (pulse3.current) {
      pulse3.current.position.z = ((t * 2.5 + 4) % 26) - 13;
    }
  });

  if (!visible) return null;

  return (
    <group>
      <mesh ref={pulse1} position={[0, 0.06, 1.55]}>
        <boxGeometry args={[0.38, 0.09, 0.16]} />
        <meshStandardMaterial color="#1D1D1F" roughness={0.4} />
      </mesh>
      <mesh ref={pulse2} position={[0, 0.06, 0.85]}>
        <boxGeometry args={[0.38, 0.09, 0.16]} />
        <meshStandardMaterial color="#007AFF" roughness={0.35} />
      </mesh>
      <mesh ref={pulse3} position={[5.4, 0.06, 0]}>
        <boxGeometry args={[0.16, 0.09, 0.38]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>
    </group>
  );
});
