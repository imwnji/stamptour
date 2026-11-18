// 거리 소품: 눈 덮인 나무, 가로등, 벤치, 꽃덤불, 울타리, 화분 트리, 벽돌 언덕, 광장 나무, 이정표
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import { brickTexture } from './textures.js'
import { PLAZA } from '../data/map.js'

const Mat = ({ color, ...p }) => (
  <meshStandardMaterial color={color} roughness={0.9} {...(color === '#ffffff' ? { emissive: '#fff3f2', emissiveIntensity: 0.3 } : {})} {...p} />
)
const SNOW = '#ffffff'
const LEAF = '#7f9c7c'
const LEAF_D = '#6a8869'
const TRUNK = '#7a5244'
const WOOD = '#9a6e58'

export function SnowTree({ position, s = 1, y = 0 }) {
  return (
    <group position={[position[0], y, position[1]]} scale={s}>
      <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.22, 0.32, 1.4, 7]} /><Mat color={TRUNK} /></mesh>
      <mesh position={[0, 2.0, 0]} scale={[1, 0.82, 1]} castShadow><icosahedronGeometry args={[1.3, 1]} /><Mat color={LEAF} flatShading /></mesh>
      <mesh position={[0.55, 1.75, 0.45]} scale={[1, 0.8, 1]}><icosahedronGeometry args={[0.7, 1]} /><Mat color={LEAF_D} flatShading /></mesh>
      {/* 눈 덮인 윗부분 */}
      <mesh position={[0, 2.32, 0]} scale={[1, 0.72, 1]} castShadow><icosahedronGeometry args={[1.28, 2]} /><Mat color={SNOW} flatShading /></mesh>
      <mesh position={[-0.6, 2.25, 0.35]} scale={[1, 0.7, 1]}><icosahedronGeometry args={[0.7, 1]} /><Mat color={SNOW} flatShading /></mesh>
      <mesh position={[0.5, 2.2, -0.45]} scale={[1, 0.7, 1]}><icosahedronGeometry args={[0.7, 1]} /><Mat color={SNOW} flatShading /></mesh>
    </group>
  )
}

export function Lamp({ position }) {
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.2, 0.26, 0.3, 8]} /><Mat color="#3a3638" /></mesh>
      <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 2.4, 8]} /><Mat color="#3a3638" /></mesh>
      <mesh position={[0, 2.75, 0]}><boxGeometry args={[0.38, 0.5, 0.38]} /><meshStandardMaterial color="#ffe6b0" emissive="#ffc463" emissiveIntensity={1.6} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.19, 2.75, z * 0.19]}><boxGeometry args={[0.04, 0.52, 0.04]} /><Mat color="#3a3638" /></mesh>
      ))}
      <mesh position={[0, 3.12, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.36, 0.3, 4]} /><Mat color="#3a3638" /></mesh>
      <mesh position={[0, 3.2, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.22, 8, 6]} /><Mat color={SNOW} /></mesh>
      <mesh position={[0, 3.36, 0]}><sphereGeometry args={[0.05, 6, 5]} /><Mat color="#3a3638" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshBasicMaterial color="#ffd9a0" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function Bench({ position, rot = 0, y = 0 }) {
  return (
    <group position={[position[0], y, position[1]]} rotation={[0, rot, 0]}>
      {[-0.18, 0, 0.18].map((z) => (
        <mesh key={z} position={[0, 0.48, z]} castShadow><boxGeometry args={[1.9, 0.07, 0.15]} /><Mat color={WOOD} /></mesh>
      ))}
      {[-0.2, 0.05].map((y2) => (
        <mesh key={y2} position={[0, 0.78 + y2, -0.3]} rotation={[-0.15, 0, 0]}><boxGeometry args={[1.9, 0.12, 0.06]} /><Mat color={WOOD} /></mesh>
      ))}
      {[-0.8, 0.8].map((x) => (
        <mesh key={x} position={[x, 0.24, 0]}><boxGeometry args={[0.1, 0.48, 0.5]} /><Mat color="#7a5244" /></mesh>
      ))}
      <RoundedBox args={[1.88, 0.1, 0.5]} radius={0.05} position={[0, 0.55, 0]}><Mat color={SNOW} /></RoundedBox>
      <RoundedBox args={[1.88, 0.08, 0.12]} radius={0.04} position={[0, 0.92, -0.32]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

const FLOWER = ['#ffffff', '#f6c6cf', '#ffffff', '#f2a7b5', '#fff3f0']
export function Bush({ position, y = 0, s = 1 }) {
  const fl = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => {
      const a = (i / 7) * Math.PI * 2 + 0.3
      return [Math.cos(a) * 0.38, 0.38 + (i % 3) * 0.08, Math.sin(a) * 0.38, FLOWER[i % 5]]
    }),
    [],
  )
  return (
    <group position={[position[0], y, position[2] ?? position[1]]} scale={s}>
      <mesh position={[0, 0.28, 0]} scale={[1, 0.75, 1]} castShadow><icosahedronGeometry args={[0.5, 1]} /><Mat color={LEAF} flatShading /></mesh>
      <mesh position={[0, 0.5, 0]} scale={[1, 0.45, 1]}><icosahedronGeometry args={[0.38, 1]} /><Mat color={SNOW} flatShading /></mesh>
      {fl.map(([x, yy, z, c], i) => (
        <mesh key={i} position={[x, yy, z]}><icosahedronGeometry args={[0.09, 0]} /><Mat color={c} /></mesh>
      ))}
    </group>
  )
}

export function PottedTree({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.32, 0.24, 0.5, 10]} /><Mat color="#c98762" /></mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.34, 0.34, 0.06, 10]} /><Mat color="#b37452" /></mesh>
      <mesh position={[0, 1.05, 0]} castShadow><coneGeometry args={[0.42, 1.1, 8]} /><Mat color={LEAF_D} flatShading /></mesh>
      <mesh position={[0, 1.35, 0]}><coneGeometry args={[0.28, 0.5, 8]} /><Mat color={SNOW} flatShading /></mesh>
      {[[0.22, 0.85, 0.2, '#e85d6a'], [-0.2, 1.0, 0.18, '#f3c74f'], [0.1, 1.15, -0.2, '#7cc6e8'], [-0.15, 0.75, -0.25, '#f3c74f']].map(([x, yy, z, c], i) => (
        <mesh key={i} position={[x, yy, z]}><sphereGeometry args={[0.05, 6, 5]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.6} /></mesh>
      ))}
      <mesh position={[0, 1.66, 0]}><octahedronGeometry args={[0.09, 0]} /><meshStandardMaterial color="#f8d66b" emissive="#f8c33b" emissiveIntensity={0.8} /></mesh>
    </group>
  )
}

export function Fence({ from, to, y = 0 }) {
  const [x0, z0] = from
  const [x1, z1] = to
  const len = Math.hypot(x1 - x0, z1 - z0)
  const n = Math.max(1, Math.round(len / 1.3))
  const ang = Math.atan2(x1 - x0, z1 - z0)
  return (
    <group position={[x0, y, z0]} rotation={[0, ang, 0]}>
      {Array.from({ length: n + 1 }).map((_, i) => (
        <group key={i} position={[0, 0, (i / n) * len]}>
          <mesh position={[0, 0.4, 0]} castShadow><cylinderGeometry args={[0.09, 0.1, 0.8, 7]} /><Mat color={WOOD} /></mesh>
          <mesh position={[0, 0.83, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.12, 8, 6]} /><Mat color={SNOW} /></mesh>
        </group>
      ))}
      {[0.35, 0.62].map((yy) => (
        <mesh key={yy} position={[0, yy, len / 2]}><boxGeometry args={[0.06, 0.1, len]} /><Mat color={WOOD} /></mesh>
      ))}
    </group>
  )
}

export function Terrace({ x0, x1, z0, z1, h = 1.3 }) {
  const tex = useMemo(() => {
    const t = brickTexture()
    t.repeat.set((x1 - x0) / 2.4, h / 1.3)
    return t
  }, [x0, x1, h])
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  return (
    <group>
      <mesh position={[cx, h / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[x1 - x0, h, z1 - z0]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      <RoundedBox args={[x1 - x0 + 0.3, 0.3, z1 - z0 + 0.3]} radius={0.14} position={[cx, h + 0.05, cz]} receiveShadow>
        <Mat color="#fbf4f2" />
      </RoundedBox>
    </group>
  )
}

export function PlazaTree() {
  const R = 2.2
  const posts = 14
  return (
    <group position={[PLAZA.x, 0, PLAZA.z]}>
      <mesh position={[0, 0.12, 0]} receiveShadow><cylinderGeometry args={[R - 0.1, R, 0.24, 28]} /><Mat color="#f7eeec" /></mesh>
      <SnowTree position={[0, 0]} s={1.25} y={0.1} />
      {Array.from({ length: posts }).map((_, i) => {
        const a = (i / posts) * Math.PI * 2
        return (
          <group key={i} position={[Math.cos(a) * R, 0, Math.sin(a) * R]}>
            <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.08, 0.09, 0.7, 6]} /><Mat color={WOOD} /></mesh>
            <mesh position={[0, 0.73, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.11, 7, 5]} /><Mat color={SNOW} /></mesh>
          </group>
        )
      })}
      {[0.3, 0.55].map((yy) => (
        <mesh key={yy} position={[0, yy, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R, 0.04, 4, 40]} />
          <Mat color={WOOD} />
        </mesh>
      ))}
      {[0.4, 1.9, 3.4, 4.9].map((a, i) => (
        <Bush key={i} position={[Math.cos(a) * (R + 0.7), 0, Math.sin(a) * (R + 0.7)]} s={0.8} />
      ))}
    </group>
  )
}

export function Signpost({ position, y = 0 }) {
  return (
    <group position={[position[0], y, position[1]]} rotation={[0, 0.3, 0]}>
      <mesh position={[0, 1.1, 0]} castShadow><cylinderGeometry args={[0.09, 0.11, 2.2, 7]} /><Mat color={WOOD} /></mesh>
      {[[1.85, 0.25, 1], [1.4, -0.3, -1]].map(([yy, rz, dir], i) => (
        <group key={i} position={[dir * 0.45, yy, 0.06]} rotation={[0, 0, rz * 0.3]}>
          <mesh><boxGeometry args={[1.0, 0.3, 0.07]} /><Mat color="#c9a07c" /></mesh>
          <mesh position={[dir * 0.55, 0, 0]} rotation={[0, 0, (dir * -Math.PI) / 2]}><coneGeometry args={[0.15, 0.18, 3]} /><Mat color="#c9a07c" /></mesh>
          <RoundedBox args={[1.0, 0.07, 0.12]} radius={0.03} position={[0, 0.17, 0]}><Mat color={SNOW} /></RoundedBox>
        </group>
      ))}
      <mesh position={[0, 2.25, 0]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.14, 8, 6]} /><Mat color={SNOW} /></mesh>
    </group>
  )
}

export function Planter({ position, y = 0, w = 2.2 }) {
  return (
    <group position={[position[0], y, position[1]]}>
      <mesh position={[0, 0.25, 0]} castShadow><boxGeometry args={[w, 0.5, 0.7]} /><Mat color={WOOD} /></mesh>
      {Array.from({ length: Math.round(w / 0.55) }).map((_, i) => (
        <Bush key={i} position={[-w / 2 + 0.3 + i * 0.55, 0, 0]} y={0.35} s={0.6} />
      ))}
    </group>
  )
}

// ── 지도 전체 소품 배치 ──
const T_H = 1.3
const TREES = [
  [-8.5, 24.2, 1.15], [-13.5, 20.5, 1], [9.2, 24.8, 1.1], [13.6, 20.8, 1], [-4.8, 25.6, 0.7],
  [-4.7, 11.2, 0.75], [-12.4, 12.6, 1], [-12.8, 4.4, 0.9], [-4.8, -6.1, 0.75], [-12.6, -3.2, 1], [-12.4, -11.8, 0.9],
  [4.8, 2.6, 0.75], [12.5, 13.2, 1], [12.4, 3.8, 0.9], [4.9, -6.2, 0.75], [12.6, -4.6, 1], [12.5, -12.4, 0.9],
  [-8.2, -14.6, 0.85], [8.3, -14.8, 0.85],
]
const TERRACE_TREES = [[-14.2, -22.5, 1.1], [-9.4, -25.2, 0.9], [-16.2, -17.8, 0.8], [14.4, -23, 1.1], [9.8, -25.4, 0.9]]
const LAMPS = [[-3.35, 19.6], [3.35, 13.2], [-3.35, 4.6], [3.35, -3.8], [-3.35, -12.2], [3.35, 21]]
const BUSHES = [[-3.7, 16.2], [3.7, 8.6], [-3.7, -3.6], [3.7, -11.2], [-3.8, 22.6], [3.8, 18.2], [-10.6, 17.8], [10.6, 0.2], [-10.8, -7.8], [12.4, 25.2]]

export function StreetDecor() {
  return (
    <group>
      <Terrace x0={-18.2} x1={-6.6} z0={-27.4} z1={-16.4} h={T_H} />
      <Terrace x0={6.6} x1={18.2} z0={-27.4} z1={-16.4} h={T_H} />
      {TERRACE_TREES.map(([x, z, s], i) => <SnowTree key={i} position={[x, z]} s={s} y={T_H} />)}
      <Signpost position={[-8.4, -18.2]} y={T_H} />
      <Planter position={[9.6, -17.4]} y={T_H} />
      <Bench position={[14.2, -17.6]} y={T_H} rot={0} />
      <Fence from={[-12, -16.75]} to={[-15.8, -16.75]} y={T_H} />
      <PlazaTree />
      {TREES.map(([x, z, s], i) => <SnowTree key={i} position={[x, z]} s={s} />)}
      {LAMPS.map((p, i) => <Lamp key={i} position={p} />)}
      {BUSHES.map(([x, z], i) => <Bush key={i} position={[x, 0, z]} />)}
      <Bench position={[-10.6, 10.4]} rot={0.05} />
      <Bench position={[8.2, 21.2]} rot={-0.1} />
      <Bench position={[10.4, -6.7]} rot={0} />
      <Fence from={[-14, 26.4]} to={[-5.6, 26.4]} />
      <Fence from={[-5.6, 26.4]} to={[-5.6, 23.2]} />
      <Fence from={[5.8, 26.6]} to={[12, 26.6]} />
      <PottedTree position={[-3.75, 0, 7.4]} />
      <PottedTree position={[3.75, 0, -1.2]} />
    </group>
  )
}
