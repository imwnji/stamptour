// 거리 소품: 눈 덮인 나무, 가로등, 벤치, 꽃덤불, 울타리, 화분 트리, 벽돌 언덕, 광장 나무, 이정표
import { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox, Instances, Instance } from '@react-three/drei'
import { brickTexture } from './textures.js'
import { PLAZA, STREETS, MAP_W, MAP_H, distToStreets } from '../data/map.js'
import { STORES } from '../data/stores.js'
import { PAL } from './palette.js'

const Mat = ({ color, ...p }) => (
  <meshStandardMaterial color={color} roughness={0.9} {...(color === SNOW ? { emissive: SNOW, emissiveIntensity: 0.32 } : {})} {...p} />
)
const SNOW = PAL.snow
const LEAF = PAL.pine
const LEAF_D = PAL.pineDark
const TRUNK = PAL.woodDark
const WOOD = PAL.wood
const IRON = '#4A5157' // 가로등 쇠

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
      <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.2, 0.26, 0.3, 8]} /><Mat color={IRON} /></mesh>
      <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 2.4, 8]} /><Mat color={IRON} /></mesh>
      <mesh position={[0, 2.75, 0]}><boxGeometry args={[0.38, 0.5, 0.38]} /><meshStandardMaterial color={PAL.glow} emissive={PAL.glow} emissiveIntensity={1.5} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.19, 2.75, z * 0.19]}><boxGeometry args={[0.04, 0.52, 0.04]} /><Mat color={IRON} /></mesh>
      ))}
      <mesh position={[0, 3.12, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[0.36, 0.3, 4]} /><Mat color={IRON} /></mesh>
      <mesh position={[0, 3.2, 0]} scale={[1, 0.45, 1]}><sphereGeometry args={[0.22, 8, 6]} /><Mat color={SNOW} /></mesh>
      <mesh position={[0, 3.36, 0]}><sphereGeometry args={[0.05, 6, 5]} /><Mat color={IRON} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[1.5, 24]} />
        <meshBasicMaterial color={PAL.glow} transparent opacity={0.28} depthWrite={false} />
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
        <mesh key={x} position={[x, 0.24, 0]}><boxGeometry args={[0.1, 0.48, 0.5]} /><Mat color={TRUNK} /></mesh>
      ))}
      <RoundedBox args={[1.88, 0.1, 0.5]} radius={0.05} position={[0, 0.55, 0]}><Mat color={SNOW} /></RoundedBox>
      <RoundedBox args={[1.88, 0.08, 0.12]} radius={0.04} position={[0, 0.92, -0.32]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

const FLOWER = [PAL.snow, PAL.roof, PAL.snow, PAL.glow, PAL.snow] // 눈송이 + 빨간 열매 + 노란 꽃
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
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.32, 0.24, 0.5, 10]} /><Mat color={PAL.roof} /></mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.34, 0.34, 0.06, 10]} /><Mat color={PAL.roofDark} /></mesh>
      <mesh position={[0, 1.05, 0]} castShadow><coneGeometry args={[0.42, 1.1, 8]} /><Mat color={LEAF_D} flatShading /></mesh>
      <mesh position={[0, 1.35, 0]}><coneGeometry args={[0.28, 0.5, 8]} /><Mat color={SNOW} flatShading /></mesh>
      {[[0.22, 0.85, 0.2, PAL.roof], [-0.2, 1.0, 0.18, '#f3c74f'], [0.1, 1.15, -0.2, PAL.shade], [-0.15, 0.75, -0.25, '#f3c74f']].map(([x, yy, z, c], i) => (
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
        <Mat color={SNOW} />
      </RoundedBox>
    </group>
  )
}

export function PlazaTree() {
  const R = 2.2
  const posts = 14
  return (
    <group position={[PLAZA.x, 0, PLAZA.z]}>
      <mesh position={[0, 0.12, 0]} receiveShadow><cylinderGeometry args={[R - 0.1, R, 0.24, 28]} /><Mat color={PAL.path} /></mesh>
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
          <mesh><boxGeometry args={[1.0, 0.3, 0.07]} /><Mat color={WOOD} /></mesh>
          <mesh position={[dir * 0.55, 0, 0]} rotation={[0, 0, (dir * -Math.PI) / 2]}><coneGeometry args={[0.15, 0.18, 3]} /><Mat color={WOOD} /></mesh>
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

// ── 지도 전체 소품 배치 (길·가게 위치에서 자동으로) ──
function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// 여러 부품으로 된 소품을 부품별 InstancedMesh 로 (나무 60그루 = 메시 6개)
function InstancedParts({ parts, items }) {
  return parts.map((p, k) => (
    <Instances key={k} limit={items.length} castShadow={!!p.cast} frustumCulled={false}>
      {p.geo}
      <Mat color={p.color} flatShading={p.flat} />
      {items.map(([x, z, s, y = 0], i) => (
        <Instance
          key={i}
          position={[x + p.pos[0] * s, y + p.pos[1] * s, z + p.pos[2] * s]}
          scale={[(p.scale?.[0] ?? 1) * s, (p.scale?.[1] ?? 1) * s, (p.scale?.[2] ?? 1) * s]}
        />
      ))}
    </Instances>
  ))
}

const TREE_PARTS = [
  { geo: <cylinderGeometry args={[0.22, 0.32, 1.4, 7]} />, color: TRUNK, pos: [0, 0.7, 0], cast: true },
  { geo: <icosahedronGeometry args={[1.3, 1]} />, color: LEAF, flat: true, pos: [0, 2.0, 0], scale: [1, 0.82, 1], cast: true },
  { geo: <icosahedronGeometry args={[0.7, 1]} />, color: LEAF_D, flat: true, pos: [0.55, 1.75, 0.45], scale: [1, 0.8, 1] },
  { geo: <icosahedronGeometry args={[1.28, 2]} />, color: SNOW, flat: true, pos: [0, 2.32, 0], scale: [1, 0.72, 1], cast: true },
  { geo: <icosahedronGeometry args={[0.7, 1]} />, color: SNOW, flat: true, pos: [-0.6, 2.25, 0.35], scale: [1, 0.7, 1] },
  { geo: <icosahedronGeometry args={[0.7, 1]} />, color: SNOW, flat: true, pos: [0.5, 2.2, -0.45], scale: [1, 0.7, 1] },
]
const BUSH_PARTS = [
  { geo: <icosahedronGeometry args={[0.5, 1]} />, color: LEAF, flat: true, pos: [0, 0.28, 0], scale: [1, 0.75, 1], cast: true },
  { geo: <icosahedronGeometry args={[0.38, 1]} />, color: SNOW, flat: true, pos: [0, 0.5, 0], scale: [1, 0.45, 1] },
  ...Array.from({ length: 6 }).map((_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.3
    return { geo: <icosahedronGeometry args={[0.09, 0]} />, color: FLOWER[i % 5], pos: [Math.cos(a) * 0.38, 0.38 + (i % 3) * 0.08, Math.sin(a) * 0.38] }
  }),
]

function usePlacement() {
  return useMemo(() => {
    const r = rng(2025)
    const homes = STORES.map((s) => s.building)
    const fronts = STORES.map((s) => s.front)
    const near = (list, x, z, d) => list.some((p) => Math.hypot(p[0] - x, p[1] - z) < d)
    const inPlaza = (x, z, pad) => Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + pad
    const hw = MAP_W / 2 - 1.2, hh = MAP_H / 2 - 1.2

    // 가로등: 큰길을 따라 양옆 번갈아
    const lamps = []
    STREETS.filter((s) => s.main).forEach((s) => {
      let side = 1
      for (let t = 3; t < s.len - 2; t += 7.5) {
        let i = 0
        while (i < s.pts.length - 2 && s.cum[i + 1] < t) i++
        const a = s.pts[i], b = s.pts[i + 1]
        const L = s.cum[i + 1] - s.cum[i]
        const u = (t - s.cum[i]) / L
        const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L
        const off = s.half + 0.6
        const x = a[0] + (b[0] - a[0]) * u - dz * off * side
        const z = a[1] + (b[1] - a[1]) * u + dx * off * side
        side = -side
        if (near(homes, x, z, 3.4) || near(fronts, x, z, 1.6) || distToStreets(x, z) < 0.3 || inPlaza(x, z, 0.5)) continue
        lamps.push([x, z])
      }
    })

    // 나무·덤불: 빈 땅에 골고루 (길·가게·광장은 피해서)
    const trees = []
    const bushes = []
    const taken = [...lamps]
    for (let tries = 0; tries < 4000 && (trees.length < 90 || bushes.length < 45); tries++) {
      const x = (r() * 2 - 1) * hw, z = (r() * 2 - 1) * hh
      const ds = distToStreets(x, z, true)
      const tree = trees.length < 90 && (bushes.length >= 45 || r() < 0.66)
      const pad = tree ? 1.5 : 0.7
      if (ds < pad || near(homes, x, z, tree ? 4.0 : 3.3) || near(fronts, x, z, 2) || inPlaza(x, z, tree ? 1.6 : 0.8)) continue
      if (near(taken, x, z, tree ? 2.3 : 1.3)) continue
      taken.push([x, z])
      if (tree) trees.push([x, z, ds > 6 ? 0.95 + r() * 0.3 : 0.7 + r() * 0.25])
      else bushes.push([x, z, 0.8 + r() * 0.35])
    }

    // 벤치: 큰길 옆 빈자리 몇 군데
    const benches = []
    const main = STREETS.find((s) => s.main)
    for (let t = 6; t < main.len - 6 && benches.length < 4; t += 13) {
      let i = 0
      while (i < main.pts.length - 2 && main.cum[i + 1] < t) i++
      const a = main.pts[i], b = main.pts[i + 1]
      const L = main.cum[i + 1] - main.cum[i]
      const u = (t - main.cum[i]) / L
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L
      for (const side of [1, -1]) {
        const off = main.half + 1.0
        const x = a[0] + (b[0] - a[0]) * u - dz * off * side, z = a[1] + (b[1] - a[1]) * u + dx * off * side
        if (near(homes, x, z, 3.6) || near(fronts, x, z, 2) || near(lamps, x, z, 1.4) || distToStreets(x, z) < 0.5) continue
        benches.push([x, z, Math.atan2(dz * side, -dx * side)]) // 등받이 반대(+z)가 길 쪽
        break
      }
    }
    return { lamps, trees, bushes, benches }
  }, [])
}

export function StreetDecor() {
  const { lamps, trees, bushes, benches } = usePlacement()
  const P = PLAZA
  return (
    <group>
      <PlazaTree />
      <Signpost position={[P.x + P.r + 0.9, P.z + 1.4]} />
      <Bench position={[P.x - P.r - 0.9, P.z]} rot={Math.PI / 2} />
      <Planter position={[P.x, P.z - P.r - 0.8]} />
      <InstancedParts parts={TREE_PARTS} items={trees} />
      <InstancedParts parts={BUSH_PARTS} items={bushes} />
      {lamps.map((p, i) => <Lamp key={i} position={p} />)}
      {benches.map(([x, z, rot], i) => <Bench key={i} position={[x, z]} rot={rot} />)}
    </group>
  )
}
