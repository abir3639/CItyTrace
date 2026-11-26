"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Navigation } from "lucide-react";
import type { MapFeature, MapPosition } from "@/types/citytrace";
import { TONES, mapFeatureTone } from "@/utils/formatters";
import { getSector } from "@/data";
import { nearestSectorForPosition } from "@/lib/geo";
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
/* Streetlight corridor & light-mode 42x42 Dhaka road/canal network    */
/* ------------------------------------------------------------------ */

function StreetlightCorridor({ renderMode }: { renderMode: CityRenderMode }) {
  const lampZPositions = [-7.0, -5.2, -3.5, -1.8, -0.1, 2.8, 4.8, 6.8];
  const dimmed = renderMode === "xray";
  return (
    <group>
      {lampZPositions.map((z, idx) => (
        <group key={`lamp-${idx}`} position={[6.18, 0, z]}>
          <mesh position={[0, 0.62, 0]}>
            <cylinderGeometry args={[0.028, 0.038, 1.24, 6]} />
            <meshStandardMaterial
              color="#94A3B8"
              metalness={0.35}
              roughness={0.45}
              transparent={dimmed}
              opacity={dimmed ? 0.3 : 1}
            />
          </mesh>
          <mesh position={[-0.14, 1.24, 0]}>
            <boxGeometry args={[0.26, 0.045, 0.065]} />
            <meshStandardMaterial color="#34C759" roughness={0.3} />
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
    color: "#FF3B30",
    hoverColor: "#FF3B30",
  },
  {
    id: "west-canal-outfall",
    label: "Western Storm Canal & Culvert (Delayed) — click to inspect",
    preferredFeatureIds: ["project:P-D02", "issue:ISS-005"],
    position: [-6.8, 0.018, -3.4],
    size: [2.2, 4.4],
    color: "#FF9500",
    hoverColor: "#FF9500",
  },
  {
    id: "east-boulevard-led",
    label: "East Civic Boulevard Smart LED (Verified) — click to inspect",
    preferredFeatureIds: ["project:P-L03"],
    position: [5.8, 0.018, 0.0],
    size: [1.65, 11.2],
    color: "#34C759",
    hoverColor: "#34C759",
  },
  {
    id: "civic-core-intersection",
    label: "Civic Core Main Intersection (Stalled) — click to inspect",
    preferredFeatureIds: ["project:P-R10", "issue:ISS-009"],
    position: [0.8, 0.018, -0.4],
    size: [2.4, 2.2],
    color: "#FF3B30",
    hoverColor: "#FF3B30",
  },
];

function DhakaDistrictRoads({
  mapId,
  renderMode,
  onSelectCorridor,
  onHoverCorridor,
  reportPinMode = false,
  onPickReportLocation,
}: {
  mapId: CityMapId;
  renderMode: CityRenderMode;
  onSelectCorridor: (preferredFeatureIds: string[]) => void;
  onHoverCorridor: (label: string | null) => void;
  reportPinMode?: boolean;
  onPickReportLocation?: (picked: {
    sectorId: string;
    coordinates: MapPosition;
    locationLabel: string;
  }) => void;
}) {
  const [hoveredCorridor, setHoveredCorridor] = useState<string | null>(null);
  const dashPositionsX = [
    -13.6, -11.6, -9.5, -7.8, -4.4, -2.9, 0.1, 1.8, 3.6, 6.9, 8.8, 11.4, 13.4,
  ];
  const dashPositionsZ = [-11.5, -9.5, -7.8, -6.4, -4.6, -2.8, -1.0, 2.9, 4.7, 6.5, 8.5, 10.6];

  useEffect(() => {
    document.body.style.cursor = reportPinMode
      ? "crosshair"
      : hoveredCorridor
        ? "pointer"
        : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredCorridor, reportPinMode]);

  const roadOpacity = renderMode === "xray" ? 0.5 : 1;
  const roadColor = mapId === "arterial-engineering" ? "#C8D0DC" : "#CFD6E0";
  const secRoadColor = "#D6DCE6";

  return (
    <group>
      {/* Daylight architectural ground plane */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, 0]}
        receiveShadow
        onClick={(event) => {
          if (!reportPinMode || !onPickReportLocation) return;
          event.stopPropagation();
          const x = Number(event.point.x.toFixed(2));
          const z = Number(event.point.z.toFixed(2));
          const sectorId = nearestSectorForPosition([x, z]);
          const sector = getSector(sectorId);
          onPickReportLocation({
            sectorId,
            coordinates: [x, z],
            locationLabel: `${sector?.name ?? sectorId} sector pin (${x}, ${z})`,
          });
        }}
      >
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial color="#E7ECF2" roughness={0.95} metalness={0.0} />
      </mesh>

      <gridHelper args={[40, 40, "#D3DCE6", "#DCE3EC"]} position={[0, -0.025, 0]} />

      {/* Main East-West Avenue (z = 1.2) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.2]} receiveShadow>
        <planeGeometry args={[32, 1.75]} />
        <meshStandardMaterial color={roadColor} roughness={0.85} transparent opacity={roadOpacity} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 2.08]}>
        <planeGeometry args={[32, 0.04]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0.32]}>
        <planeGeometry args={[32, 0.04]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
      </mesh>
      {dashPositionsX.map((dx, i) => (
        <mesh key={`dash-x-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[dx, 0.01, 1.2]}>
          <planeGeometry args={[0.72, 0.055]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
        </mesh>
      ))}

      {/* Secondary East-West Avenues: North Gate (z = 5.2) & South Market (z = -5.0) */}
      {[5.2, -5.0].map((rz, idx) => (
        <mesh key={`ew-sec-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, rz]} receiveShadow>
          <planeGeometry args={[30, 1.2]} />
          <meshStandardMaterial color={secRoadColor} roughness={0.88} transparent opacity={roadOpacity} />
        </mesh>
      ))}

      {/* Outer Ring Roads (z = 9.5 & z = -9.5) */}
      {[9.5, -9.5].map((rz, idx) => (
        <mesh key={`ew-ring-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, rz]} receiveShadow>
          <planeGeometry args={[30, 1.05]} />
          <meshStandardMaterial color="#DCE1EA" roughness={0.9} transparent opacity={roadOpacity} />
        </mesh>
      ))}

      {/* North-South Main Arterial (x = -1.5) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.006, 0]} receiveShadow>
        <planeGeometry args={[1.65, 28]} />
        <meshStandardMaterial color={roadColor} roughness={0.85} transparent opacity={roadOpacity} />
      </mesh>
      {dashPositionsZ.map((dz, i) => (
        <mesh key={`dash-z-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.011, dz]}>
          <planeGeometry args={[0.055, 0.72]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} />
        </mesh>
      ))}

      {/* East Civic Boulevard (x = 5.4) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.4, 0.006, 0]} receiveShadow>
        <planeGeometry args={[1.35, 28]} />
        <meshStandardMaterial color={secRoadColor} roughness={0.85} transparent opacity={roadOpacity} />
      </mesh>

      {/* Outer North-South Connectors */}
      {[-10.6, 10.6].map((rx, idx) => (
        <mesh key={`ns-outer-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[rx, 0.004, 0]} receiveShadow>
          <planeGeometry args={[1.15, 26]} />
          <meshStandardMaterial color="#DCE1EA" roughness={0.9} transparent opacity={roadOpacity} />
        </mesh>
      ))}

      {/* Main Intersection pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1.5, 0.008, 1.2]} receiveShadow>
        <planeGeometry args={[2.0, 2.0]} />
        <meshStandardMaterial color="#C6CEDB" roughness={0.8} transparent opacity={roadOpacity} />
      </mesh>

      {/* Natural Blue Western Storm Canal (x = -6.2) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.2, 0.002, 0]} receiveShadow>
        <planeGeometry args={[1.6, 28]} />
        <meshStandardMaterial
          color={mapId === "hydrology-basin" ? "#5BAEE8" : "#7CB9E8"}
          roughness={0.22}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[-7.04, 0.08, 0]} receiveShadow>
        <boxGeometry args={[0.14, 0.16, 28]} />
        <meshStandardMaterial color="#CFD6E0" roughness={0.8} />
      </mesh>
      <mesh position={[-5.36, 0.08, 0]} receiveShadow>
        <boxGeometry args={[0.14, 0.16, 28]} />
        <meshStandardMaterial color="#CFD6E0" roughness={0.8} />
      </mesh>

      {/* Subtle interactive corridor overlays */}
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
              opacity={isHovered ? 0.28 : 0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Apple Maps-inspired architectural markers                           */
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
  const headRef = useRef<THREE.Mesh | null>(null);
  const hex = TONES[mapFeatureTone(feature.state)].hex;
  const [x, , z] = [feature.coordinates[0], 0, feature.coordinates[1]];

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  useFrame(({ clock }) => {
    if (!headRef.current) return;
    if (isSelected) {
      const t = clock.getElapsedTime();
      headRef.current.position.y = 1.62 + Math.sin(t * 2.2) * 0.06;
    } else {
      headRef.current.position.y = 1.56;
    }
  });

  const pinScale = isSelected ? 1.24 : hovered ? 1.14 : 1;

  return (
    <group position={[x, 0, z]}>
      {/* Soft ground shadow / selection halo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.026, 0]}>
        <circleGeometry args={[isSelected ? 0.56 : 0.36, 24]} />
        <meshBasicMaterial
          color={isSelected ? "#007AFF" : hex}
          transparent
          opacity={isSelected ? 0.24 : 0.16}
        />
      </mesh>

      {isSelected ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.56, 0.65, 28]} />
          <meshBasicMaterial color="#007AFF" transparent opacity={0.85} />
        </mesh>
      ) : null}

      {/* Slender metallic pin stem */}
      <mesh position={[0, 0.78, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.025, 1.44, 10]} />
        <meshStandardMaterial color="#64748B" metalness={0.5} roughness={0.35} />
      </mesh>

      {/* Clean spherical Apple Maps-style pin head */}
      <mesh ref={headRef} position={[0, 1.56, 0]} scale={pinScale} castShadow>
        <sphereGeometry args={[0.25, 18, 16]} />
        <meshStandardMaterial
          color={hex}
          roughness={0.22}
          metalness={0.08}
        />
      </mesh>

      {/* White inner cap ring for crispness */}
      <mesh position={[0, 1.56, 0]} scale={pinScale * 1.03}>
        <torusGeometry args={[0.21, 0.022, 8, 24]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
      </mesh>

      {/* Invisible generous click/hover hit sphere */}
      <mesh
        position={[0, 1.25, 0]}
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
        <sphereGeometry args={[0.85, 10, 10]} />
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

      projected.set(feature.coordinates[0], 2.35, feature.coordinates[1]);
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
  zoomSignal,
  selectedFeature,
  selectedLandmarkCoords,
  sectorFocus,
  panGoal,
}: {
  mapId: CityMapId;
  autoRotate: boolean;
  resetSignal: number;
  zoomSignal: { delta: number; seq: number } | null;
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
    if (!zoomSignal || !controlsRef.current) return;
    const controls = controlsRef.current;
    const offset = camera.position.clone().sub(controls.target);
    const currentDist = offset.length();
    const nextDist = THREE.MathUtils.clamp(currentDist + zoomSignal.delta, 5.5, 34);
    offset.setLength(nextDist);
    targetGoalRef.current.copy(controls.target);
    cameraGoalRef.current.copy(controls.target).add(offset);
    modeRef.current = "focus";
  }, [zoomSignal, camera]);

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
      autoRotateSpeed={0.32}
      onStart={() => {
        modeRef.current = "idle";
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Light-mode 2D Interactive Radar Mini-Map                            */
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
  const mapExtent = 18;
  const toSvg = (v: number) => ((v + mapExtent) / (mapExtent * 2)) * 120;

  return (
    <div className="ct-glass-pill rounded-2xl p-2">
      <div className="mb-1 flex items-center justify-between gap-2 px-0.5 text-[10px] font-medium text-[#6E6E73]">
        <span className="inline-flex items-center gap-1 text-[#1D1D1F]">
          <Navigation className="h-2.5 w-2.5 text-[#007AFF]" /> Overview
        </span>
        <span>Click to pan</span>
      </div>
      <svg
        viewBox="0 0 120 120"
        className="h-[98px] w-[98px] cursor-crosshair rounded-xl border border-black/[0.06] bg-[#EEF2F6]"
        role="img"
        aria-label="District overview mini-map. Click anywhere to pan the 3D camera."
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
        <rect x={toSvg(-6.2) - 2.5} y={10} width={5} height={100} fill="#7CB9E8" opacity={0.9} />
        {/* Avenues */}
        <rect x={6} y={toSvg(1.2) - 2} width={108} height={4} fill="#CBD4E0" />
        <rect x={6} y={toSvg(5.2) - 1.2} width={108} height={2.4} fill="#D5DCE6" />
        <rect x={6} y={toSvg(-5.0) - 1.2} width={108} height={2.4} fill="#D5DCE6" />
        <rect x={toSvg(-1.5) - 2} y={8} width={4} height={104} fill="#CBD4E0" />
        <rect x={toSvg(5.4) - 1.5} y={8} width={3} height={104} fill="#D5DCE6" />

        {/* Buildings */}
        {DHAKA_BUILDINGS.map((b) => (
          <rect
            key={`mini-${b.id}`}
            x={toSvg(b.x - b.w / 2)}
            y={toSvg(b.z - b.d / 2)}
            width={Math.max(1.8, (b.w / (mapExtent * 2)) * 120)}
            height={Math.max(1.8, (b.d / (mapExtent * 2)) * 120)}
            fill={
              b.landmarkId === selectedLandmarkId
                ? "#007AFF"
                : b.landmarkId
                  ? "#5B8DEF"
                  : "#9AA5B4"
            }
            opacity={b.landmarkId ? 0.95 : 0.68}
          />
        ))}

        {/* Beacons */}
        {features.map((f) => {
          const hex = TONES[mapFeatureTone(f.state)].hex;
          const active = f.id === selectedId;
          return (
            <circle
              key={`mini-f-${f.id}`}
              cx={toSvg(f.coordinates[0])}
              cy={toSvg(f.coordinates[1])}
              r={active ? 3.2 : 2.0}
              fill={hex}
              stroke="#FFFFFF"
              strokeWidth={0.8}
            />
          );
        })}
      </svg>
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
  zoomSignal: { delta: number; seq: number } | null;
  sectorFocus?: MapPosition | null;
  showRadar?: boolean;
  reportPinMode?: boolean;
  onPickReportLocation?: (picked: {
    sectorId: string;
    coordinates: MapPosition;
    locationLabel: string;
  }) => void;
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
  zoomSignal,
  sectorFocus = null,
  showRadar = false,
  reportPinMode = false,
  onPickReportLocation,
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
    <div className={`relative h-full w-full ${reportPinMode ? "cursor-crosshair" : ""}`}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [16.5, 13.5, 18.0], fov: 42, near: 0.2, far: 110 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={() => {
          onSelect(null);
          onSelectLandmark(null);
        }}
      >
        <color attach="background" args={["#EEF1F6"]} />
        <fog attach="fog" args={["#EEF1F6", 34, 68]} />

        {/* Daylight architectural lighting + soft directional shadows */}
        <hemisphereLight args={["#FFFFFF", "#D8E0EA", 0.92]} />
        <directionalLight
          position={[16, 24, 12]}
          intensity={1.1}
          color="#FFFDF8"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={2}
          shadow-camera-far={65}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-12, 10, -14]} intensity={0.35} color="#DBEAFE" />

        <DhakaDistrictRoads
          mapId={mapId}
          renderMode={renderMode}
          onSelectCorridor={handleSelectCorridor}
          onHoverCorridor={setHoveredCorridorLabel}
          reportPinMode={reportPinMode}
          onPickReportLocation={onPickReportLocation}
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
          zoomSignal={zoomSignal}
          selectedFeature={selectedFeature}
          selectedLandmarkCoords={selectedLandmarkCoords}
          sectorFocus={sectorFocus}
          panGoal={panGoal}
        />
      </Canvas>

      {/* Hover corridor caption */}
      {hoveredCorridorLabel ? (
        <div className="ct-glass-pill pointer-events-none absolute top-16 left-3 z-20 rounded-full px-3 py-1 text-[11.5px] font-medium text-[#1D1D1F]">
          {hoveredCorridorLabel}
        </div>
      ) : null}

      {/* Projected Apple Maps floating pin label */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {activeFeature ? (
          <button
            ref={(el) => {
              markerDomRefs.current[activeFeature.id] = el;
            }}
            type="button"
            onClick={() => onSelect(activeFeature.id)}
            style={{ opacity: 0 }}
            className={`absolute top-0 left-0 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap backdrop-blur-md tabular-nums ${
              TONES[mapFeatureTone(activeFeature.state)].ring
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${TONES[mapFeatureTone(activeFeature.state)].dot}`} />
            <span>{activeFeature.label}</span>
          </button>
        ) : null}
      </div>

      {/* Collapsible radar mini-map */}
      {showRadar ? (
        <div className="pointer-events-auto absolute bottom-14 left-3 z-20 hidden sm:block">
          <RadarMiniMap
            features={features}
            selectedId={selectedId}
            selectedLandmarkId={selectedLandmarkId}
            onPanTo={handlePanTo}
          />
        </div>
      ) : null}
    </div>
  );
}
