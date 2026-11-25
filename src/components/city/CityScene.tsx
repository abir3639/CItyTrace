"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Compass, Layers, MousePointerClick } from "lucide-react";
import type { MapFeature, MapPosition } from "@/types/citytrace";
import { TONES, mapFeatureTone } from "@/utils/formatters";

/* ------------------------------------------------------------------ */
/* Procedural district geometry                                        */
/* ------------------------------------------------------------------ */

interface BuildingSpec {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  tone: "primary" | "secondary" | "civic";
  edgeGlow: boolean;
}

/** Low-poly Dhaka Sector 04 structures arranged around the arterial grid. */
const DHAKA_BUILDINGS: BuildingSpec[] = [
  { id: "b1", x: -4.2, z: -0.9, w: 1.4, h: 1.9, d: 1.3, tone: "secondary", edgeGlow: false },
  { id: "b2", x: -4.1, z: -3.2, w: 1.5, h: 2.8, d: 1.4, tone: "primary", edgeGlow: true },
  { id: "b3", x: -4.3, z: -5.6, w: 1.3, h: 1.5, d: 1.4, tone: "secondary", edgeGlow: false },
  { id: "b4", x: -2.9, z: -1.1, w: 0.9, h: 1.3, d: 1.0, tone: "secondary", edgeGlow: false },
  { id: "b5", x: -3.0, z: -4.8, w: 0.95, h: 2.1, d: 1.1, tone: "primary", edgeGlow: false },

  { id: "b6", x: -8.6, z: -1.0, w: 1.5, h: 1.8, d: 1.6, tone: "secondary", edgeGlow: false },
  { id: "b7", x: -8.7, z: -3.6, w: 1.4, h: 2.3, d: 1.5, tone: "primary", edgeGlow: true },
  { id: "b8", x: -8.5, z: 3.6, w: 1.6, h: 1.4, d: 1.4, tone: "secondary", edgeGlow: false },
  { id: "b9", x: -8.6, z: 6.0, w: 1.3, h: 1.9, d: 1.3, tone: "secondary", edgeGlow: false },

  { id: "b10", x: 0.6, z: -1.2, w: 1.6, h: 3.4, d: 1.5, tone: "civic", edgeGlow: true },
  { id: "b11", x: 2.8, z: -1.1, w: 1.4, h: 2.4, d: 1.3, tone: "primary", edgeGlow: false },
  { id: "b12", x: 0.7, z: -3.7, w: 1.7, h: 4.1, d: 1.6, tone: "civic", edgeGlow: true },
  { id: "b13", x: 3.0, z: -3.6, w: 1.5, h: 2.9, d: 1.4, tone: "primary", edgeGlow: true },
  { id: "b14", x: 1.0, z: -6.1, w: 1.8, h: 2.2, d: 1.3, tone: "secondary", edgeGlow: false },
  { id: "b15", x: 3.3, z: -6.0, w: 1.3, h: 1.7, d: 1.2, tone: "secondary", edgeGlow: false },

  { id: "b16", x: 7.7, z: -1.2, w: 1.5, h: 2.1, d: 1.5, tone: "primary", edgeGlow: true },
  { id: "b17", x: 7.8, z: -3.7, w: 1.6, h: 1.6, d: 1.7, tone: "civic", edgeGlow: false },
  { id: "b18", x: 7.6, z: -6.1, w: 1.4, h: 2.6, d: 1.3, tone: "secondary", edgeGlow: false },

  { id: "b19", x: -4.1, z: 3.5, w: 1.5, h: 2.0, d: 1.3, tone: "primary", edgeGlow: false },
  { id: "b20", x: -4.2, z: 5.9, w: 1.6, h: 2.7, d: 1.4, tone: "primary", edgeGlow: true },
  { id: "b21", x: -2.9, z: 4.7, w: 0.9, h: 1.5, d: 1.2, tone: "secondary", edgeGlow: false },

  { id: "b22", x: 0.7, z: 3.5, w: 1.5, h: 2.6, d: 1.4, tone: "primary", edgeGlow: true },
  { id: "b23", x: 3.0, z: 3.6, w: 1.6, h: 1.8, d: 1.5, tone: "secondary", edgeGlow: false },
  { id: "b24", x: 0.9, z: 5.9, w: 1.7, h: 3.1, d: 1.4, tone: "civic", edgeGlow: true },
  { id: "b25", x: 3.2, z: 6.1, w: 1.4, h: 1.6, d: 1.3, tone: "secondary", edgeGlow: false },

  { id: "b26", x: 7.7, z: 3.7, w: 1.5, h: 2.2, d: 1.6, tone: "primary", edgeGlow: false },
];

const DEFAULT_CAMERA_POS = new THREE.Vector3(12.6, 10.6, 14.2);
const DEFAULT_TARGET = new THREE.Vector3(0, 0.35, 0);

function LowPolyBuilding({ b }: { b: BuildingSpec }) {
  const edgesGeo = useMemo(() => {
    const box = new THREE.BoxGeometry(b.w, b.h, b.d);
    const edges = new THREE.EdgesGeometry(box);
    box.dispose();
    return edges;
  }, [b.w, b.h, b.d]);

  useEffect(() => () => edgesGeo.dispose(), [edgesGeo]);

  const fillColor =
    b.tone === "civic" ? "#132944" : b.tone === "primary" ? "#0e2038" : "#0a1729";
  const roofColor = b.edgeGlow ? "#173c5e" : "#11243c";

  return (
    <group position={[b.x, b.h / 2, b.z]}>
      <mesh>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial color={fillColor} roughness={0.78} metalness={0.22} />
      </mesh>

      <mesh position={[0, b.h / 2 + 0.04, 0]}>
        <boxGeometry args={[b.w * 0.86, 0.08, b.d * 0.86]} />
        <meshStandardMaterial
          color={roofColor}
          emissive={b.edgeGlow ? "#083344" : "#000000"}
          emissiveIntensity={b.edgeGlow ? 0.65 : 0}
          roughness={0.6}
        />
      </mesh>

      <lineSegments geometry={edgesGeo}>
        <lineBasicMaterial
          color={b.edgeGlow ? "#22d3ee" : "#1e3a5f"}
          transparent
          opacity={b.edgeGlow ? 0.5 : 0.32}
        />
      </lineSegments>
    </group>
  );
}

function StreetlightCorridor() {
  const lampZPositions = [-5.2, -3.5, -1.8, -0.1, 2.8, 4.8];
  return (
    <group>
      {lampZPositions.map((z, idx) => (
        <group key={`lamp-${idx}`} position={[6.18, 0, z]}>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.03, 0.04, 1.24, 6]} />
            <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[-0.14, 1.24, 0]}>
            <boxGeometry args={[0.28, 0.05, 0.07]} />
            <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={1.6} />
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
    size: [1.65, 9.6],
    color: "#10b981",
    hoverColor: "#34d399",
  },
];

function DhakaRoadsAndCanal({
  onSelectCorridor,
  onHoverCorridor,
}: {
  onSelectCorridor: (preferredFeatureIds: string[]) => void;
  onHoverCorridor: (label: string | null) => void;
}) {
  const [hoveredCorridor, setHoveredCorridor] = useState<string | null>(null);
  const dashPositionsX = [-9.5, -7.8, -4.4, -2.9, 0.1, 1.8, 3.6, 6.9, 8.8];
  const dashPositionsZ = [-6.4, -4.6, -2.8, -1.0, 2.9, 4.7, 6.5];

  useEffect(() => {
    document.body.style.cursor = hoveredCorridor ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredCorridor]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#050b16" roughness={0.95} metalness={0.08} />
      </mesh>

      <gridHelper args={[26, 26, "#0e4a63", "#0b1e33"]} position={[0, -0.025, 0]} />

      {/* Main East-West Avenue */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.2]}>
        <planeGeometry args={[22, 1.75]} />
        <meshStandardMaterial color="#0b1525" roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.08]}>
        <planeGeometry args={[22, 0.04]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.32]}>
        <planeGeometry args={[22, 0.04]} />
        <meshBasicMaterial color="#0891b2" transparent opacity={0.45} />
      </mesh>
      {dashPositionsX.map((dx, i) => (
        <mesh key={`dash-x-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.012, 1.2]}>
          <planeGeometry args={[0.72, 0.06]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* North-South Main Arterial */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.006, 0]}>
        <planeGeometry args={[1.65, 17.5]} />
        <meshStandardMaterial color="#0b1525" roughness={0.85} />
      </mesh>
      {dashPositionsZ.map((dz, i) => (
        <mesh key={`dash-z-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.013, dz]}>
          <planeGeometry args={[0.06, 0.72]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* East Civic Boulevard */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.4, 0.006, 0]}>
        <planeGeometry args={[1.35, 17.5]} />
        <meshStandardMaterial color="#0b1525" roughness={0.85} />
      </mesh>

      {/* Intersection pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.009, 1.2]}>
        <planeGeometry args={[1.9, 1.9]} />
        <meshStandardMaterial color="#101f36" roughness={0.8} />
      </mesh>

      {/* Western storm canal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.2, 0.002, 0]}>
        <planeGeometry args={[1.55, 18]} />
        <meshStandardMaterial
          color="#06283d"
          emissive="#083344"
          emissiveIntensity={0.45}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[-7.02, 0.09, 0]}>
        <boxGeometry args={[0.14, 0.18, 18]} />
        <meshStandardMaterial color="#162b45" />
      </mesh>
      <mesh position={[-5.38, 0.09, 0]}>
        <boxGeometry args={[0.14, 0.18, 18]} />
        <meshStandardMaterial color="#162b45" />
      </mesh>
      <mesh position={[-6.2, 0.08, 1.2]}>
        <boxGeometry args={[1.95, 0.14, 1.85]} />
        <meshStandardMaterial color="#15263f" />
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
              opacity={isHovered ? 0.34 : 0.14}
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

/* eslint-disable react-hooks/immutability -- this projector is the imperative R3F frame loop that writes label positions straight onto projected DOM nodes */
/** Projects 3D anchors into screen space for crisp DOM labels. */
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
  autoRotate,
  resetSignal,
  selectedFeature,
  sectorFocus,
}: {
  autoRotate: boolean;
  resetSignal: number;
  selectedFeature: MapFeature | null;
  sectorFocus: MapPosition | null;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const modeRef = useRef<"idle" | "reset" | "focus">("idle");
  const targetGoalRef = useRef(new THREE.Vector3().copy(DEFAULT_TARGET));
  const cameraGoalRef = useRef(new THREE.Vector3().copy(DEFAULT_CAMERA_POS));

  useEffect(() => {
    if (resetSignal > 0) {
      targetGoalRef.current.copy(DEFAULT_TARGET);
      cameraGoalRef.current.copy(DEFAULT_CAMERA_POS);
      modeRef.current = "reset";
    }
  }, [resetSignal]);

  useEffect(() => {
    if (!sectorFocus) return;
    const [sx, sz] = sectorFocus;
    targetGoalRef.current.set(sx * 0.6, 0.45, sz * 0.6);
    cameraGoalRef.current.set(sx * 0.6 + 9.2, 8.8, sz * 0.6 + 10.4);
    modeRef.current = "focus";
  }, [sectorFocus]);

  useEffect(() => {
    if (!selectedFeature) return;
    const [mx, mz] = selectedFeature.coordinates;
    targetGoalRef.current.set(mx * 0.6, 0.45, mz * 0.6);
    cameraGoalRef.current.set(mx * 0.6 + 8.4, 8.0, mz * 0.6 + 9.6);
    modeRef.current = "focus";
  }, [selectedFeature]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (modeRef.current === "idle") {
      // Kept in sync here rather than read during render.
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
      minDistance={5.5}
      maxDistance={26}
      maxPolarAngle={Math.PI / 2.18}
      minPolarAngle={0.22}
      autoRotate={autoRotate}
      autoRotateSpeed={0.42}
      onStart={() => {
        modeRef.current = "idle";
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */

/**
 * The 26 buildings and 24 markers are memoised so that hovering a single
 * beacon — which updates the scene's hover state — does not re-render the
 * entire city. Buildings are effectively static; markers only re-render when
 * their own selection state changes.
 */
const MemoBuilding = memo(LowPolyBuilding);
const MemoFeatureMarker = memo(FeatureMarker);

interface CitySceneProps {
  features: MapFeature[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  autoRotate: boolean;
  resetSignal: number;
  sectorFocus?: MapPosition | null;
}

export default function CityScene({
  features,
  selectedId,
  onSelect,
  autoRotate,
  resetSignal,
  sectorFocus = null,
}: CitySceneProps) {
  const markerDomRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredCorridorLabel, setHoveredCorridorLabel] = useState<string | null>(null);

  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedId) ?? null,
    [features, selectedId]
  );

  const handleSelectCorridor = useCallback(
    (preferredFeatureIds: string[]) => {
      const target = features.find((feature) => preferredFeatureIds.includes(feature.id));
      if (target) onSelect(target.id);
    },
    [features, onSelect]
  );

  const activeId = selectedId ?? hoveredId;
  const activeFeature = useMemo(
    () => features.find((feature) => feature.id === activeId) ?? null,
    [features, activeId]
  );

  return (
    <div className="ct-panel ct-panel-glow relative h-[440px] w-full overflow-hidden rounded-xl sm:h-[560px] xl:h-[calc(100vh-260px)] xl:min-h-[560px]">
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#060b14]/85 px-3 py-1.5 backdrop-blur-sm">
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.15em] text-cyan-300">
            SECTOR 04 · DHAKA URBAN MODEL
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            {hoveredCorridorLabel ?? "Click a glowing beacon or road corridor to inspect the record"}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute top-3 right-3 z-20 hidden items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-[#060b14]/85 px-2.5 py-1 font-mono text-[10px] text-cyan-200 backdrop-blur-sm sm:flex">
        <MousePointerClick className="h-3.5 w-3.5 text-cyan-400" />
        <span>{features.length} monitored records</span>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [12.6, 10.6, 14.2], fov: 42, near: 0.2, far: 90 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => onSelect(null)}
      >
        <color attach="background" args={["#050a14"]} />
        <fog attach="fog" args={["#050a14", 20, 40]} />

        <ambientLight intensity={0.72} color="#94a3b8" />
        <directionalLight position={[10, 16, 8]} intensity={1.15} color="#bae6fd" />
        <directionalLight position={[-9, 8, -10]} intensity={0.45} color="#22d3ee" />

        <DhakaRoadsAndCanal
          onSelectCorridor={handleSelectCorridor}
          onHoverCorridor={setHoveredCorridorLabel}
        />
        {DHAKA_BUILDINGS.map((b) => (
          <MemoBuilding key={b.id} b={b} />
        ))}
        <StreetlightCorridor />

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
          autoRotate={autoRotate}
          resetSignal={resetSignal}
          selectedFeature={selectedFeature}
          sectorFocus={sectorFocus}
        />
      </Canvas>

      {/* Projected label for the hovered or selected beacon only */}
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

      <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/70 bg-[#060b14]/85 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>Drag: rotate · Right-drag: pan · Scroll: zoom</span>
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
