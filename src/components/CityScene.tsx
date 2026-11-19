"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Compass, Layers, MousePointerClick } from "lucide-react";
import type { InfraCase } from "@/types/citytrace";
import { getStatusStyle } from "@/utils/formatters";

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

// 26 low-poly Dhaka Sector 04 structures positioned around arterial roads & storm canal
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

  useEffect(() => {
    return () => {
      edgesGeo.dispose();
    };
  }, [edgesGeo]);

  const fillColor =
    b.tone === "civic"
      ? "#132944"
      : b.tone === "primary"
        ? "#0e2038"
        : "#0a1729";

  const roofColor = b.edgeGlow ? "#173c5e" : "#11243c";

  return (
    <group position={[b.x, b.h / 2, b.z]}>
      <mesh>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color={fillColor}
          roughness={0.78}
          metalness={0.22}
        />
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
            <meshStandardMaterial
              color="#34d399"
              emissive="#10b981"
              emissiveIntensity={1.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DhakaRoadsAndCanal() {
  const dashPositionsX = [-9.5, -7.8, -4.4, -2.9, 0.1, 1.8, 3.6, 6.9, 8.8];
  const dashPositionsZ = [-6.4, -4.6, -2.8, -1.0, 2.9, 4.7, 6.5];

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
        <mesh
          key={`dash-x-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[dx, 0.012, 1.2]}
        >
          <planeGeometry args={[0.72, 0.06]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* North-South Main Arterial (x = -1.5) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.006, 0]}>
        <planeGeometry args={[1.65, 17.5]} />
        <meshStandardMaterial color="#0b1525" roughness={0.85} />
      </mesh>
      {dashPositionsZ.map((dz, i) => (
        <mesh
          key={`dash-z-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-1.5, 0.013, dz]}
        >
          <planeGeometry args={[0.06, 0.72]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
        </mesh>
      ))}

      {/* East Civic Boulevard (x = 5.4) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.4, 0.006, 0]}>
        <planeGeometry args={[1.35, 17.5]} />
        <meshStandardMaterial color="#0b1525" roughness={0.85} />
      </mesh>

      {/* Main Arterial Intersection Pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.009, 1.2]}>
        <planeGeometry args={[1.9, 1.9]} />
        <meshStandardMaterial color="#101f36" roughness={0.8} />
      </mesh>

      {/* Western Storm Canal (x = -6.2) */}
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
    </group>
  );
}

function InfrastructureMarker({
  item,
  isSelected,
  onSelect,
}: {
  item: InfraCase;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pulseRef = useRef<THREE.Mesh | null>(null);
  const beaconRef = useRef<THREE.Mesh | null>(null);
  const statusStyle = getStatusStyle(item.status);
  const [x, , z] = item.coordinates;

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
        <circleGeometry args={[0.55, 24]} />
        <meshBasicMaterial
          color={statusStyle.hex}
          transparent
          opacity={isSelected ? 0.42 : 0.24}
        />
      </mesh>

      <mesh
        ref={pulseRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.04, 0]}
      >
        <ringGeometry args={[0.62, 0.78, 28]} />
        <meshBasicMaterial
          color={isSelected ? "#22d3ee" : statusStyle.hex}
          transparent
          opacity={isSelected ? 0.9 : 0.65}
        />
      </mesh>

      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 1.55, 8]} />
        <meshBasicMaterial color={statusStyle.hex} transparent opacity={0.85} />
      </mesh>

      <mesh ref={beaconRef} position={[0, 1.65, 0]}>
        <octahedronGeometry args={[isSelected || hovered ? 0.4 : 0.34, 0]} />
        <meshStandardMaterial
          color={statusStyle.hex}
          emissive={statusStyle.hex}
          emissiveIntensity={isSelected || hovered ? 1.5 : 1.05}
          roughness={0.25}
          metalness={0.2}
        />
      </mesh>

      <mesh
        position={[0, 1.35, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(item.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.05, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Projects 3D marker anchors into 2D screen coordinates for crisp React 19 DOM overlays
 * without mounting nested React roots inside R3F.
 */
function MarkerProjector({
  cases,
  markerDomRefs,
}: {
  cases: InfraCase[];
  markerDomRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}) {
  const { camera, size } = useThree();
  const projected = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    for (const item of cases) {
      const el = markerDomRefs.current[item.id];
      if (!el) continue;

      projected.set(item.coordinates[0], 2.55, item.coordinates[2]);
      projected.project(camera);

      if (projected.z > 1 || projected.z < -1) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        continue;
      }

      const px = (projected.x * 0.5 + 0.5) * size.width;
      const py = (-projected.y * 0.5 + 0.5) * size.height;

      const inBounds =
        px >= 24 &&
        px <= size.width - 24 &&
        py >= 24 &&
        py <= size.height - 24;

      el.style.opacity = inBounds ? "1" : "0";
      el.style.pointerEvents = inBounds ? "auto" : "none";
      el.style.transform = `translate3d(${px}px, ${py}px, 0) translate(-50%, -50%)`;
    }
  });

  return null;
}

function CameraRig({
  autoRotate,
  resetSignal,
  selectedCase,
}: {
  autoRotate: boolean;
  resetSignal: number;
  selectedCase: InfraCase | null;
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
    if (selectedCase) {
      const [mx, , mz] = selectedCase.coordinates;
      targetGoalRef.current.set(mx * 0.55, 0.45, mz * 0.55);
      cameraGoalRef.current.set(
        mx * 0.55 + 9.2,
        8.6,
        mz * 0.55 + 10.6
      );
      modeRef.current = "focus";
    }
  }, [selectedCase]);

  useFrame((_, delta) => {
    if (!controlsRef.current || modeRef.current === "idle") return;
    const step = 1 - Math.exp(-4.5 * delta);
    camera.position.lerp(cameraGoalRef.current, step);
    controlsRef.current.target.lerp(targetGoalRef.current, step);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(cameraGoalRef.current) < 0.08 &&
      controlsRef.current.target.distanceTo(targetGoalRef.current) < 0.06
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
      autoRotate={autoRotate && modeRef.current === "idle"}
      autoRotateSpeed={0.42}
      onStart={() => {
        modeRef.current = "idle";
      }}
    />
  );
}

interface CitySceneProps {
  cases: InfraCase[];
  selectedCaseId: string | null;
  onSelectCase: (id: string) => void;
  autoRotate: boolean;
  resetSignal: number;
}

export default function CityScene({
  cases,
  selectedCaseId,
  onSelectCase,
  autoRotate,
  resetSignal,
}: CitySceneProps) {
  const markerDomRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectedCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId) ?? null,
    [cases, selectedCaseId]
  );

  return (
    <div className="ct-panel ct-panel-glow relative h-[430px] w-full overflow-hidden rounded-xl sm:h-[520px] lg:h-[calc(100vh-148px)] lg:min-h-[540px]">
      {/* Top-left sector HUD */}
      <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#060b14]/85 px-3 py-1.5 backdrop-blur-sm">
        <Layers className="h-3.5 w-3.5 text-cyan-400" />
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.15em] text-cyan-300">
            SECTOR 04 · DHAKA URBAN MODEL
          </p>
          <p className="font-mono text-[10px] text-slate-400">
            Click a Glowing Beacon to Inspect Records
          </p>
        </div>
      </div>

      {/* Top-right click prompt pill */}
      <div className="pointer-events-none absolute top-3 right-3 z-20 hidden items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-[#060b14]/85 px-2.5 py-1 font-mono text-[10px] text-cyan-200 backdrop-blur-sm sm:flex">
        <MousePointerClick className="h-3.5 w-3.5 text-cyan-400" />
        <span>
          {selectedCase
            ? `Active: ${selectedCase.code}`
            : "3 Monitored Nodes Interactive"}
        </span>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [12.6, 10.6, 14.2], fov: 42, near: 0.2, far: 90 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#050a14"]} />
        <fog attach="fog" args={["#050a14", 20, 40]} />

        <ambientLight intensity={0.72} color="#94a3b8" />
        <directionalLight position={[10, 16, 8]} intensity={1.15} color="#bae6fd" />
        <directionalLight position={[-9, 8, -10]} intensity={0.45} color="#22d3ee" />

        <DhakaRoadsAndCanal />
        {DHAKA_BUILDINGS.map((b) => (
          <LowPolyBuilding key={b.id} b={b} />
        ))}
        <StreetlightCorridor />

        {cases.map((item) => (
          <InfrastructureMarker
            key={item.id}
            item={item}
            isSelected={item.id === selectedCaseId}
            onSelect={onSelectCase}
          />
        ))}

        <MarkerProjector cases={cases} markerDomRefs={markerDomRefs} />

        <CameraRig
          autoRotate={autoRotate}
          resetSignal={resetSignal}
          selectedCase={selectedCase}
        />
      </Canvas>

      {/* Projected 2D DOM Marker Labels (zero nested roots inside R3F) */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {cases.map((item) => {
          const st = getStatusStyle(item.status);
          const isSelected = item.id === selectedCaseId;
          const badgeTone =
            item.status === "Unresolved"
              ? "border-red-400/70 bg-red-950/90 text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.45)]"
              : item.status === "Delayed"
                ? "border-amber-400/70 bg-amber-950/90 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.45)]"
                : "border-emerald-400/70 bg-emerald-950/90 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.45)]";

          return (
            <button
              key={`overlay-${item.id}`}
              ref={(el) => {
                markerDomRefs.current[item.id] = el;
              }}
              type="button"
              data-case-id={item.id}
              aria-label={`Inspect ${item.markerLabel} (${item.status})`}
              onClick={() => onSelectCase(item.id)}
              style={{ opacity: 0 }}
              className={`absolute top-0 left-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider whitespace-nowrap backdrop-blur-md transition-[opacity,box-shadow] cursor-pointer ${badgeTone} ${
                isSelected
                  ? "ring-2 ring-cyan-300 ring-offset-1 ring-offset-[#060b14]"
                  : "hover:brightness-110"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${st.dotClass}`} />
              <span>{item.markerLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom HUD bar */}
      <div className="pointer-events-none absolute right-3 bottom-3 left-3 z-20 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/70 bg-[#060b14]/85 px-2.5 py-1 font-mono text-[10px] text-slate-300 backdrop-blur-sm">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>Drag: Rotate · Right-Drag: Pan · Scroll: Zoom</span>
        </div>

        {/* Clickable marker status legend */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700/70 bg-[#060b14]/90 px-2.5 py-1 backdrop-blur-sm">
          {cases.map((item) => {
            const st = getStatusStyle(item.status);
            const active = item.id === selectedCaseId;
            return (
              <button
                key={`legend-${item.id}`}
                type="button"
                onClick={() => onSelectCase(item.id)}
                className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors cursor-pointer ${
                  active
                    ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/50"
                    : "text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${st.dotClass}`} />
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
