"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Compass, Layers, MousePointerClick, Navigation } from "lucide-react";
import type { MapFeature, MapPosition } from "@/types/citytrace";
import { TONES, mapFeatureTone } from "@/utils/formatters";
import {
  CITY_MAPS,
  CIVIC_LANDMARKS,
  DHAKA_BUILDINGS,
  type CityMapId,
  type CityRenderMode,
} from "./cityMapsData";
import {
  BridgesAndGreenery,
  DetailedBuilding,
  ElevatedMetroLine,
  MapOverlayLayers,
  SubsurfaceUtilities,
  TrafficPulses,
} from "./CityBuildings";

/* ------------------------------------------------------------------ */
/* Streetlight corridor & expanded 42x42 Dhaka road/canal network      */
/* ------------------------------------------------------------------ */

function StreetlightCorridor({ renderMode }: { renderMode: CityRenderMode }) {
  const lampZPositions = [-7.0, -5.2, -3.5, -1.8, -0.1, 2.8, 4.8, 6.8];
  const dimmed = renderMode === "xray";
  return (
    <group>
      {lampZPositions.map((z, idx) => (
        <group key={`lamp-${idx}`} position={[6.18, 0, z]}>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.24, 6]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.5}
              roughness={0.4}
              transparent={dimmed}
              opacity={dimmed ? 0.3 : 1}
            />
          </mesh>
          <mesh position={[-0.14, 1.24, 0]}>
            <boxGeometry args={[0.28, 0.05, 0.07]} />
            <meshStandardMaterial
              color="#34d399"
              emissive="#10b981"
              emissiveIntensity={dimmed ? 0.5 : 1.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface CorridorDef {
  id: string;
  label: string;
  preferredFeatureIds: string[];
  position: [number, number, number];
  size: [number, number];
  color: string;
  hoverColor: string;
}

const CLICKABLE_CORRIDORS: CorridorDef[] = [
  {
    id: "begum-rokeya-link-road",
    label: "Begum Rokeya Sarani Link Road (3× repaired) — click to inspect",
    preferredFeatureIds: ["issue:ISS-003", "project:P-R01"],
    position: [-1.8, 0.018, 1.55],
    size: [4.2, 1.85],
    color: "#ef4444",
    hoverColor: "#f87171",
  },
  {
    id: "west-canal-outfall",
    label: "Western Storm Canal & Culvert (Delayed) — click to inspect",
    preferredFeatureIds: ["project:P-D02", "issue:ISS-005"],
    position: [-6.8, 0.018, -3.4],
    size: [2.2, 4.4],
    color: "#f59e0b",
    hoverColor: "#fbbf24",
  },
  {
    id: "east-boulevard-led",
    label: "East Civic Boulevard Smart LED (Verified) — click to inspect",
    preferredFeatureIds: ["project:P-L03"],
    position: [5.8, 0.018, 0.0],
    size: [1.65, 11.2],
    color: "#10b981",
    hoverColor: "#34d399",
  },
  {
    id: "civic-core-intersection",
    label: "Civic Core Main Intersection (Stalled) — click to inspect",
    preferredFeatureIds: ["project:P-R10", "issue:ISS-009"],
    position: [0.8, 0.018, -0.4],
    size: [2.4, 2.2],
    color: "#ef4444",
    hoverColor: "#f87171",
  },
];

function DhakaDistrictRoads({
  mapId,
  renderMode,
  onSelectCorridor,
  onHoverCorridor,
}: {
  mapId: CityMapId;
  renderMode: CityRenderMode;
  onSelectCorridor: (preferredFeatureIds: string[]) => void;
  onHoverCorridor: (label: string | null) => void;
}) {
  const [hoveredCorridor, setHoveredCorridor] = useState<string | null>(null);
  const dashPositionsX = [
    -13.6, -11.6, -9.5, -7.8, -4.4, -2.9, 0.1, 1.8, 3.6, 6.9, 8.8, 11.4, 13.4,
  ];
  const dashPositionsZ = [-11.5, -9.5, -7.8, -6.4, -4.6, -2.8, -1.0, 2.9, 4.7, 6.5, 8.5, 10.6];

  useEffect(() => {
    document.body.style.cursor = hoveredCorridor ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredCorridor]);

  const roadOpacity = renderMode === "xray" ? 0.42 : 1;
  const roadColor = mapId === "arterial-engineering" ? "#0d1a2e" : "#0b1525";

  return (
    <group>
      {/* Expanded ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#050b16" roughness={0.95} metalness={0.08} />
      </mesh>

      <gridHelper args={[40, 40, "#0e4a63", "#0b1e33"]} position={[0, -0.025, 0]} />

      {/* Main East-West Avenue (z = 1.2) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.2]}>
        <planeGeometry args={[32, 1.75]} />
        <meshStandardMaterial color={roadColor} roughness={0.85} transparent opacity={roadOpacity} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.08]}>
        <planeGeometry args={[32, 0.04]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.32]}>
        <planeGeometry args={[32, 0.04]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.45} />
      </mesh>
      {dashPositionsX.map((dx, i) => (
        <mesh key={`dash-x-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.012, 1.2]}>
          <planeGeometry args={[0.72, 0.06]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* Secondary East-West Avenues: North Gate (z = 5.2) & South Market (z = -5.0) */}
      {[5.2, -5.0].map((rz, idx) => (
        <mesh key={`ew-sec-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, rz]}>
          <planeGeometry args={[30, 1.2]} />
          <meshStandardMaterial color="#091322" roughness={0.88} transparent opacity={roadOpacity} />
        </mesh>
      ))}

      {/* Outer Ring Roads (z = 9.5 & z = -9.5) */}
      {[9.5, -9.5].map((rz, idx) => (
        <mesh key={`ew-ring-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, rz]}>
          <planeGeometry args={[30, 1.05]} />
          <meshStandardMaterial color="#08111e" roughness={0.9} transparent opacity={roadOpacity} />
        </mesh>
      ))}

      {/* North-South Main Arterial (x = -1.5) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.006, 0]}>
        <planeGeometry args={[1.65, 28]} />
        <meshStandardMaterial color={roadColor} roughness={0.85} transparent opacity={roadOpacity} />
      </mesh>
      {dashPositionsZ.map((dz, i) => (
        <mesh key={`dash-z-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.013, dz]}>
          <planeGeometry args={[0.06, 0.72]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* East Civic Boulevard (x = 5.4) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.4, 0.006, 0]}>
        <planeGeometry args={[1.35, 28]} />
        <meshStandardMaterial color="#0b1525" roughness={0.85} transparent opacity={roadOpacity} />
      </mesh>

      {/* Outer North-South Connectors (x = -10.6 & x = 10.6) */}
      {[-10.6, 10.6].map((rx, idx) => (
        <mesh key={`ns-outer-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[rx, 0.004, 0]}>
          <planeGeometry args={[1.15, 26]} />
          <meshStandardMaterial color="#08111e" roughness={0.9} transparent opacity={roadOpacity} />
        </mesh>
      ))}

      {/* Main Intersection pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.009, 1.2]}>
        <planeGeometry args={[2.0, 2.0]} />
        <meshStandardMaterial color="#101f36" roughness={0.8} transparent opacity={roadOpacity} />
      </mesh>

      {/* Western Storm Canal (x = -6.2) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.2, 0.002, 0]}>
        <planeGeometry args={[1.6, 28]} />
        <meshStandardMaterial
          color="#06283d"
          emissive={mapId === "hydrology-basin" ? "#0284c7" : "#083344"}
          emissiveIntensity={mapId === "hydrology-basin" ? 0.75 : 0.45}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[-7.04, 0.09, 0]}>
        <boxGeometry args={[0.14, 0.18, 28]} />
        <meshStandardMaterial color="#162b45" />
      </mesh>
      <mesh position={[-5.36, 0.09, 0]}>
        <boxGeometry args={[0.14, 0.18, 28]} />
        <meshStandardMaterial color="#162b45" />
      </mesh>

      {/* Interactive road & infrastructure corridors */}
      {CLICKABLE_CORRIDORS.map((corridor) => {
        const isHovered = hoveredCorridor === corridor.id;
        return (
          <mesh
            key={corridor.id}
            rotation={[-Math.PI / 2, 0, 0]}
            position={corridor.position}
            onClick={(event) => {
              event.stopPropagation();
              onSelectCorridor(corridor.preferredFeatureIds);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredCorridor(corridor.id);
              onHoverCorridor(corridor.label);
            }}
            onPointerOut={() => {
              setHoveredCorridor(null);
              onHoverCorridor(null);
            }}
          >
            <planeGeometry args={corridor.size} />
            <meshBasicMaterial
              color={isHovered ? corridor.hoverColor : corridor.color}
              transparent
              opacity={isHovered ? 0.36 : 0.14}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Markers                                                             */
/* ------------------------------------------------------------------ */

function FeatureMarker({
  feature,
  isSelected,
  onSelect,
  onHover,
}: {
  feature: MapFeature;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef<THREE.Mesh | null>(null);
  const beaconRef = useRef<THREE.Mesh | null>(null);
  const hex = TONES[mapFeatureTone(feature.state)].hex;
  const [x, , z] = [feature.coordinates[0], 0, feature.coordinates[1]];

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (pulseRef.current) {
      const s = 1 + 0.45 * ((Math.sin(t * 2.6) + 1) / 2);
      pulseRef.current.scale.set(s, s, 1);
    }
    if (beaconRef.current) {
      beaconRef.current.position.y = 1.65 + Math.sin(t * 2.4) * 0.12;
      beaconRef.current.rotation.y = t * 1.1;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color={hex} transparent opacity={isSelected ? 0.42 : 0.2} />
      </mesh>

      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.52, 0.66, 24]} />
        <meshBasicMaterial
          color={isSelected ? "#22d3ee" : hex}
          transparent
          opacity={isSelected ? 0.9 : 0.6}
        />
      </mesh>

      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.45, 8]} />
        <meshBasicMaterial color={hex} transparent opacity={0.8} />
      </mesh>

      <mesh ref={beaconRef} position={[0, 1.65, 0]}>
        <octahedronGeometry args={[isSelected || hovered ? 0.34 : 0.28, 0]} />
        <meshStandardMaterial
          color={hex}
          emissive={hex}
          emissiveIntensity={isSelected || hovered ? 1.5 : 1.05}
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>

      <mesh
        position={[0, 1.2, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(feature.id);
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          onHover(feature.id);
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
        }}
      >
        <sphereGeometry args={[0.9, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* eslint-disable react-hooks/immutability -- imperative R3F frame loop writing projected screen coords to DOM labels */
function MarkerProjector({
  features,
  activeId,
  markerDomRefs,
}: {
  features: MapFeature[];
  activeId: string | null;
  markerDomRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}) {
  const { camera, size } = useThree();
  const projected = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    for (const feature of features) {
      const el = markerDomRefs.current[feature.id];
      if (!el) continue;

      const isActive = feature.id === activeId;
      if (!isActive) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        continue;
      }

      projected.set(feature.coordinates[0], 2.5, feature.coordinates[1]);
      projected.project(camera);

      const behindCamera = projected.z > 1 || projected.z < -1;
      const px = (projected.x * 0.5 + 0.5) * size.width;
      const py = (-projected.y * 0.5 + 0.5) * size.height;
      const inBounds =
        px >= 40 && px <= size.width - 40 && py >= 20 && py <= size.height - 20;

      if (behindCamera || !inBounds) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        continue;
      }

      el.style.opacity = "1";
      el.style.pointerEvents = "auto";
      el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}
/* eslint-enable react-hooks/immutability */

function CameraRig({
  mapId,
  autoRotate,
  resetSignal,
  selectedFeature,
  selectedLandmarkCoords,
  sectorFocus,
  panGoal,
}: {
  mapId: CityMapId;
  autoRotate: boolean;
  resetSignal: number;
  selectedFeature: MapFeature | null;
  selectedLandmarkCoords: MapPosition | null;
  sectorFocus: MapPosition | null;
  panGoal: { point: MapPosition; seq: number } | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const modeRef = useRef<"idle" | "reset" | "focus">("idle");
  const activeMap = useMemo(
    () => CITY_MAPS.find((m) => m.id === mapId) ?? CITY_MAPS[0],
    [mapId]
  );
  const targetGoalRef = useRef(new THREE.Vector3(...activeMap.cameraTarget));
  const cameraGoalRef = useRef(new THREE.Vector3(...activeMap.cameraPos));

  useEffect(() => {
    targetGoalRef.current.set(...activeMap.cameraTarget);
    cameraGoalRef.current.set(...activeMap.cameraPos);
    modeRef.current = "reset";
  }, [activeMap, resetSignal]);

  useEffect(() => {
    if (!sectorFocus) return;
    const [sx, sz] = sectorFocus;
    targetGoalRef.current.set(sx * 0.65, 0.45, sz * 0.65);
    cameraGoalRef.current.set(sx * 0.65 + 9.2, 8.8, sz * 0.65 + 10.4);
    modeRef.current = "focus";
  }, [sectorFocus]);

  useEffect(() => {
    if (!panGoal) return;
    const [px, pz] = panGoal.point;
    targetGoalRef.current.set(px, 0.4, pz);
    cameraGoalRef.current.set(px + 8.5, 8.6, pz + 9.8);
    modeRef.current = "focus";
  }, [panGoal]);

  useEffect(() => {
    if (!selectedLandmarkCoords) return;
    const [lx, lz] = selectedLandmarkCoords;
    targetGoalRef.current.set(lx * 0.72, 0.7, lz * 0.72);
    cameraGoalRef.current.set(lx * 0.72 + 7.6, 7.6, lz * 0.72 + 8.6);
    modeRef.current = "focus";
  }, [selectedLandmarkCoords]);

  useEffect(() => {
    if (!selectedFeature) return;
    const [mx, mz] = selectedFeature.coordinates;
    targetGoalRef.current.set(mx * 0.65, 0.45, mz * 0.65);
    cameraGoalRef.current.set(mx * 0.65 + 8.4, 8.0, mz * 0.65 + 9.6);
    modeRef.current = "focus";
  }, [selectedFeature]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (modeRef.current === "idle") {
      controls.autoRotate = autoRotate;
      return;
    }

    controls.autoRotate = false;
    const step = 1 - Math.exp(-4.5 * delta);
    camera.position.lerp(cameraGoalRef.current, step);
    controls.target.lerp(targetGoalRef.current, step);
    controls.update();

    if (
      camera.position.distanceTo(cameraGoalRef.current) < 0.08 &&
      controls.target.distanceTo(targetGoalRef.current) < 0.06
    ) {
      modeRef.current = "idle";
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.07}
      minDistance={5.0}
      maxDistance={36}
      maxPolarAngle={Math.PI / 2.15}
      minPolarAngle={0.2}
      autoRotate={autoRotate}
      autoRotateSpeed={0.38}
      onStart={() => {
        modeRef.current = "idle";
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Interactive 2D Radar Mini-Map HUD                                   */
/* ------------------------------------------------------------------ */

function RadarMiniMap({
  features,
  selectedId,
  selectedLandmarkId,
  onPanTo,
}: {
  features: MapFeature[];
  selectedId: string | null;
  selectedLandmarkId: string | null;
  onPanTo: (point: MapPosition) => void;
}) {
  const mapExtent = 18; // [-18, +18] mapped to 0..120 SVG viewBox

  const toSvg = (v: number) => ((v + mapExtent) / (mapExtent * 2)) * 120;

  return (
    <div className="hidden sm:block">
      <div className="rounded-lg border border-cyan-500/30 bg-[#050b14]/90 p-1.5 backdrop-blur-md">
        <div className="mb-1 flex items-center justify-between gap-2 px-0.5 font-mono text-[8px] tracking-wider text-cyan-300 uppercase">
          <span className="inline-flex items-center gap-1">
            <Navigation className="h-2.5 w-2.5" /> Radar
          </span>
          <span className="text-slate-500">Click to pan</span>
        </div>
        <svg
          viewBox="0 0 120 120"
          className="h-[104px] w-[104px] cursor-crosshair rounded border border-slate-800 bg-[#040811]"
          role="img"
          aria-label="District radar mini-map. Click anywhere to pan the 3D camera."
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const nx = (event.clientX - rect.left) / rect.width;
            const nz = (event.clientY - rect.top) / rect.height;
            const wx = Number((nx * mapExtent * 2 - mapExtent).toFixed(2));
            const wz = Number((nz * mapExtent * 2 - mapExtent).toFixed(2));
            onPanTo([wx, wz]);
          }}
        >
          {/* Canal */}
          <rect x={toSvg(-6.2) - 2.5} y={10} width={5} height={100} fill="#083344" opacity={0.85} />
          {/* Main avenues */}
          <rect x={6} y={toSvg(1.2) - 2} width={108} height={4} fill="#162842" />
          <rect x={6} y={toSvg(5.2) - 1.2} width={108} height={2.4} fill="#112036" />
          <rect x={6} y={toSvg(-5.0) - 1.2} width={108} height={2.4} fill="#112036" />
          <rect x={toSvg(-1.5) - 2} y={8} width={4} height={104} fill="#162842" />
          <rect x={toSvg(5.4) - 1.5} y={8} width={3} height={104} fill="#112036" />

          {/* Building footprints */}
          {DHAKA_BUILDINGS.map((b) => (
            <rect
              key={`mini-${b.id}`}
              x={toSvg(b.x - b.w / 2)}
              y={toSvg(b.z - b.d / 2)}
              width={Math.max(1.8, (b.w / (mapExtent * 2)) * 120)}
              height={Math.max(1.8, (b.d / (mapExtent * 2)) * 120)}
              fill={
                b.landmarkId === selectedLandmarkId
                  ? "#22d3ee"
                  : b.landmarkId
                    ? "#0891b2"
                    : "#1e3a5f"
              }
              opacity={b.landmarkId ? 0.95 : 0.65}
            />
          ))}

          {/* Live beacons */}
          {features.map((f) => {
            const hex = TONES[mapFeatureTone(f.state)].hex;
            const active = f.id === selectedId;
            return (
              <circle
                key={`mini-f-${f.id}`}
                cx={toSvg(f.coordinates[0])}
                cy={toSvg(f.coordinates[1])}
                r={active ? 3.1 : 1.9}
                fill={hex}
                stroke={active ? "#ffffff" : "none"}
                strokeWidth={0.8}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Scene                                                          */
/* ------------------------------------------------------------------ */

const MemoFeatureMarker = memo(FeatureMarker);

interface CitySceneProps {
  mapId: CityMapId;
  renderMode: CityRenderMode;
  features: MapFeature[];
  selectedId: string | null;
  selectedLandmarkId: string | null;
  onSelect: (id: string | null) => void;
  onSelectLandmark: (landmarkId: string | null) => void;
  autoRotate: boolean;
  resetSignal: number;
  sectorFocus?: MapPosition | null;
}

export default function CityScene({
  mapId,
  renderMode,
  features,
  selectedId,
  selectedLandmarkId,
  onSelect,
  onSelectLandmark,
  autoRotate,
  resetSignal,
  sectorFocus = null,
}: CitySceneProps) {
  const markerDomRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredCorridorLabel, setHoveredCorridorLabel] = useState<string | null>(null);
  const [panGoal, setPanGoal] = useState<{ point: MapPosition; seq: number } | null>(null);

  const activeMap = useMemo(
    () => CITY_MAPS.find((m) => m.id === mapId) ?? CITY_MAPS[0],
    [mapId]
  );

  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedId) ?? null,
    [features, selectedId]
  );

  const selectedLandmarkCoords = useMemo(() => {
    if (!selectedLandmarkId) return null;
    return CIVIC_LANDMARKS.find((item) => item.id === selectedLandmarkId)?.coordinates ?? null;
  }, [selectedLandmarkId]);

  const handleSelectCorridor = useCallback(
    (preferredFeatureIds: string[]) => {
      const target = features.find((feature) => preferredFeatureIds.includes(feature.id));
      if (target) onSelect(target.id);
    },
    [features, onSelect]
  );

  const handlePanTo = useCallback((point: MapPosition) => {
    setPanGoal((prev) => ({ point, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const activeId = selectedId ?? hoveredId;
  const activeFeature = useMemo(
    () => features.find((feature) => feature.id === activeId) ?? null,
    [features, activeId]
  );

  const showUtilities =
    renderMode === "xray" ||
    mapId === "arterial-engineering" ||
    mapId === "hydrology-basin";

  return (
    <div className="ct-panel ct-panel-glow relative h-[460px] w-full overflow-hidden rounded-xl sm:h-[580px] xl:h-[calc(100vh-290px)] xl:min-h-[560px]">
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#060b14]/85 px-3 py-1.5 backdrop-blur-sm">
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.15em] text-cyan-300 uppercase">
            {activeMap.code} · {activeMap.title}
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            {hoveredCorridorLabel ?? activeMap.highlightNote}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-20 hidden items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-[#060b14]/85 px-2.5 py-1 font-mono text-[10px] text-cyan-200 backdrop-blur-sm sm:flex">
        <MousePointerClick className="h-3.5 w-3.5 text-cyan-400" />
        <span>
          {features.length} beacons · {DHAKA_BUILDINGS.length} buildings
        </span>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [16.5, 13.5, 18.0], fov: 42, near: 0.2, far: 110 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => {
          onSelect(null);
          onSelectLandmark(null);
        }}
      >
        <color attach="background" args={["#050a14"]} />
        <fog attach="fog" args={["#050a14", 26, 56]} />

        <ambientLight intensity={0.78} color="#94a3b8" />
        <directionalLight position={[14, 20, 10]} intensity={1.2} color="#bae6fd" />
        <directionalLight position={[-12, 10, -12]} intensity={0.48} color="#22d3ee" />

        <DhakaDistrictRoads
          mapId={mapId}
          renderMode={renderMode}
          onSelectCorridor={handleSelectCorridor}
          onHoverCorridor={setHoveredCorridorLabel}
        />

        {DHAKA_BUILDINGS.map((b) => {
          const isEmphasized =
            activeMap.sectors.length === 0 || activeMap.sectors.includes(b.sectorId);
          return (
            <DetailedBuilding
              key={b.id}
              b={b}
              renderMode={renderMode}
              isEmphasized={isEmphasized}
              isSelectedLandmark={b.landmarkId !== undefined && b.landmarkId === selectedLandmarkId}
              onSelectLandmark={(landmarkId) => onSelectLandmark(landmarkId)}
            />
          );
        })}

        <ElevatedMetroLine
          renderMode={renderMode}
          onSelectStation={() => onSelectLandmark("LMD-MRT")}
        />
        <BridgesAndGreenery renderMode={renderMode} />
        <StreetlightCorridor renderMode={renderMode} />
        <SubsurfaceUtilities visible={showUtilities} />
        <MapOverlayLayers mapId={mapId} renderMode={renderMode} />
        <TrafficPulses visible={renderMode === "twin"} />

        {features.map((feature) => (
          <MemoFeatureMarker
            key={feature.id}
            feature={feature}
            isSelected={feature.id === selectedId}
            onSelect={onSelect}
            onHover={setHoveredId}
          />
        ))}

        <MarkerProjector
          features={features}
          activeId={activeId}
          markerDomRefs={markerDomRefs}
        />

        <CameraRig
          mapId={mapId}
          autoRotate={autoRotate}
          resetSignal={resetSignal}
          selectedFeature={selectedFeature}
          selectedLandmarkCoords={selectedLandmarkCoords}
          sectorFocus={sectorFocus}
          panGoal={panGoal}
        />
      </Canvas>

      {/* Projected label for the hovered or selected beacon */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {activeFeature ? (
          <button
            ref={(el) => {
              markerDomRefs.current[activeFeature.id] = el;
            }}
            type="button"
            onClick={() => onSelect(activeFeature.id)}
            style={{ opacity: 0 }}
            className={`absolute top-0 left-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap shadow-lg backdrop-blur-md ${
              TONES[mapFeatureTone(activeFeature.state)].ring
            }`}
          >
            <span>{activeFeature.label}</span>
          </button>
        ) : null}
      </div>

      {/* Bottom HUD: Radar mini-map, navigation hint, and beacon legend */}
      <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-20 flex flex-wrap items-end justify-between gap-2">
        <div className="pointer-events-auto flex flex-col items-start gap-2">
          <RadarMiniMap
            features={features}
            selectedId={selectedId}
            selectedLandmarkId={selectedLandmarkId}
            onPanTo={handlePanTo}
          />
          <div className="pointer-events-none flex items-center gap-2 rounded-lg border border-slate-700/70 bg-[#060b14]/85 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>Drag: rotate · Right-drag: pan · Scroll: zoom · Click landmarks & beacons</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/70 bg-[#060b14]/90 px-2.5 py-1 backdrop-blur-sm">
          {(
            [
              ["unresolved", "Unresolved issue"],
              ["delayed", "Delayed work"],
              ["active", "Active project"],
              ["completed", "Completed"],
            ] as const
          ).map(([state, label]) => (
            <span key={state} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-slate-300">
              <span className={`h-2 w-2 rounded-full ${TONES[mapFeatureTone(state)].dot}`} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
