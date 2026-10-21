/**
 * WebGL hero sculpture (React Three Fiber). Loaded lazily, only on the homepage, only when
 * WebGL is available. All geometries/materials are declarative, so R3F disposes them on unmount.
 */
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { makeBars, type Bar } from "./sculpture";

type Props = { progress: MutableRefObject<number>; reduced: boolean; lowPower: boolean; onReady?: () => void };

const ARC_RADIUS = 3.1;
const BASE_Y = -2.15;

function BarMesh({ bar, index, progress, reduced }: { bar: Bar; index: number; progress: MutableRefObject<number>; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const p = progress.current; // 0 at top of page → 1 when the hero has scrolled away
    const spread = 1 + p * 0.55;
    const a = bar.angle * spread;
    g.position.x = Math.sin(a) * ARC_RADIUS;
    g.position.y = BASE_Y + (1 - Math.cos(a)) * ARC_RADIUS * 0.55 + (reduced ? 0 : Math.sin(t * 0.55 + index * 0.7) * 0.07) + p * 0.4;
    g.position.z = bar.depth - Math.abs(Math.sin(a)) * 0.6;
    g.rotation.z = -a * 0.42;
    g.rotation.y = reduced ? 0 : Math.sin(t * 0.3 + index) * 0.08;
  });
  return (
    <group ref={ref}>
      <RoundedBox args={[0.62, bar.height, 0.62]} radius={0.16} smoothness={4} position={[0, bar.height / 2, 0]}>
        <meshPhysicalMaterial color={bar.color} roughness={0.38} clearcoat={0.55} clearcoatRoughness={0.35} sheen={0.4} sheenColor="#ffffff" />
      </RoundedBox>
    </group>
  );
}

/** The cradle: an arc traced just beneath the bar bases, evoking the open, holding hands. */
function Cradle({ maxAngle }: { maxAngle: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = -maxAngle * 1.12 + (i / 48) * maxAngle * 2.24;
      pts.push(new THREE.Vector3(Math.sin(a) * (ARC_RADIUS + 0.2), BASE_Y - 0.28 + (1 - Math.cos(a)) * ARC_RADIUS * 0.55, -0.15 - Math.abs(Math.sin(a)) * 0.6));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.13, 20, false);
  }, [maxAngle]);
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color="#1f1a16" roughness={0.45} clearcoat={0.4} />
    </mesh>
  );
}

function Rig({ children, reduced }: { children: React.ReactNode; reduced: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  useFrame((_, dt) => {
    const g = group.current;
    if (!g || reduced) return;
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent easing
    g.rotation.y += (pointer.x * 0.32 - g.rotation.y) * k;
    g.rotation.x += (-pointer.y * 0.1 - g.rotation.x) * k;
  });
  return <group ref={group}>{children}</group>;
}

function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      requestAnimationFrame(() => onReady?.());
    }
  });
  return null;
}

export default function HeroSculpture({ progress, reduced, lowPower, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const bars = useMemo(() => makeBars(lowPower ? 7 : 11), [lowPower]);

  // Stop rendering entirely when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const vis = () => setVisible(document.visibilityState === "visible" && el.getBoundingClientRect().bottom > 0);
    document.addEventListener("visibilitychange", vis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return (
    <div ref={host} className="absolute inset-0" aria-hidden>
      <Canvas
        frameloop={reduced ? "demand" : visible ? "always" : "never"}
        dpr={[1, lowPower ? 1.25 : 1.75]}
        camera={{ position: [0, 0.5, 15.5], fov: 31 }}
        gl={{ antialias: !lowPower, alpha: true, powerPreference: "high-performance" }}
        style={{ touchAction: "pan-y" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 7, 6]} intensity={1.7} color="#fff6e8" />
        <directionalLight position={[-6, 2, -4]} intensity={0.6} color="#d9c9ff" />
        <Rig reduced={reduced}>
          <group position={[0, -0.35, 0]}>
            {bars.map((b, i) => (
              <BarMesh key={i} bar={b} index={i} progress={progress} reduced={reduced} />
            ))}
            <Cradle maxAngle={bars[bars.length - 1].angle} />
          </group>
        </Rig>
        <ContactShadows position={[0, -2.45, 0]} opacity={0.32} scale={13} blur={2.6} far={5} resolution={lowPower ? 256 : 512} frames={reduced || lowPower ? 1 : Infinity} color="#3b2a1a" />
        <Environment resolution={lowPower ? 64 : 128} frames={1}>
          <Lightformer form="rect" intensity={2.4} position={[0, 5, -6]} scale={[10, 4, 1]} color="#fff3e2" />
          <Lightformer form="rect" intensity={1.2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#e9e1f3" />
          <Lightformer form="ring" intensity={1.5} position={[5, 2, 3]} scale={2.5} color="#ffd9a1" />
        </Environment>
        <FirstFrame onReady={onReady} />
      </Canvas>
    </div>
  );
}
