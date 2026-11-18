// 눈 덮인 가게 건물 (베타: 코드로 만든 임시 모델, 정면 = +z)
// 공통: 모서리가 둥근 크림색 벽 + 구름처럼 폭신한 눈 지붕 + 지붕 위 둥근 간판(문양+이름)
//       + 끝이 말린 차양 + 둥근 창문·아치 문 (전체적으로 동글동글 폭신폭신하게)
// 업종별 앞마당 소품: 카페(테이블·의자·입간판) / 소품샵(선물 선반·트리 화분) / 먹거리(체크 테이블·메뉴판)
// Blender 에서 만든 .glb 가 준비되면 useGLTF 로 Shop 내부를 교체하세요.
import { useMemo, useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { RoundedBox, Sparkles } from '@react-three/drei'
import gsap from 'gsap'
import { plaqueTexture, awningTexture, chalkTexture, checkTexture, postcardTexture } from './textures.js'
import { stampUrl, motifUrl, loadImage } from '../lib/stampSvg.js'
import { useApp } from '../store.js'
import { PottedTree, Bush } from './Decor.jsx'
import { BUILD_SCALE } from '../data/layout.js'
import { PAL } from './palette.js'

const Mat = ({ color, ...p }) => (
  <meshStandardMaterial color={color} roughness={0.85} {...(color === SNOW ? { emissive: SNOW, emissiveIntensity: 0.32 } : {})} {...p} />
)
const SNOW = PAL.snow
const WOOD = PAL.wood
const WARM = { color: PAL.glow, emissive: PAL.glow, emissiveIntensity: 0.95 }

export const SHOP = { W: 4.6, D: 3.4, H: 2.7, B: 0.22 }
const { W, D, H, B } = SHOP

// 둥근 사각형 (가운데 기준)
function roundRect(w, h, r) {
  const s = new THREE.Shape()
  const x = -w / 2, y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y)
  return s
}
// 위가 반원인 아치 (바닥 가운데 기준)
function arch(w, h) {
  const s = new THREE.Shape()
  const r = w / 2
  s.moveTo(-r, 0)
  s.lineTo(r, 0)
  s.lineTo(r, h - r)
  s.absarc(0, h - r, r, 0, Math.PI, false)
  s.lineTo(-r, 0)
  return s
}
// 앞뒤 모서리까지 말랑하게 깎은 판
const softExtrude = (shape, depth = 0.05, bevel = 0.04) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 14 })

function Window({ position, w, h }) {
  const geo = useMemo(() => {
    const r = Math.min(w, h) * 0.42
    return {
      frame: softExtrude(roundRect(w + 0.14, h + 0.14, r + 0.07), 0.04, 0.05),
      glass: new THREE.ShapeGeometry(roundRect(w, h, r), 14),
    }
  }, [w, h])
  return (
    <group position={position}>
      <mesh geometry={geo.frame} position={[0, 0, -0.03]}><Mat color={WOOD} /></mesh>
      <mesh geometry={geo.glass} position={[0, 0, 0.07]}><meshStandardMaterial {...WARM} /></mesh>
      {/* 십자 창살 (끝이 둥근 막대) */}
      <mesh position={[0, 0, 0.08]}><capsuleGeometry args={[0.025, h - 0.12, 3, 8]} /><Mat color={WOOD} /></mesh>
      <mesh position={[0, 0, 0.08]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.025, w - 0.12, 3, 8]} /><Mat color={WOOD} /></mesh>
      {/* 창턱 + 소복한 눈 */}
      <RoundedBox args={[w + 0.34, 0.1, 0.26]} radius={0.045} position={[0, -h / 2 - 0.1, 0.12]}><Mat color={WOOD} /></RoundedBox>
      <RoundedBox args={[w + 0.3, 0.14, 0.26]} radius={0.065} position={[0, -h / 2 - 0.01, 0.12]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

function Plaque({ store }) {
  const [tex, setTex] = useState(() => plaqueTexture(store, null))
  useEffect(() => {
    let alive = true
    loadImage(motifUrl(store, PAL.woodDark)).then((img) => alive && setTex(plaqueTexture(store, img)))
    return () => { alive = false }
  }, [store])
  return (
    <group position={[0, B + H + 0.95, D / 2 + 0.32]} rotation={[-0.1, 0, 0]}>
      <RoundedBox args={[2.2, 1.55, 0.14]} radius={0.068} smoothness={4} position={[0, 0, -0.08]} castShadow>
        <Mat color={WOOD} />
      </RoundedBox>
      <mesh>
        <planeGeometry args={[2.3, 1.62]} />
        <meshStandardMaterial map={tex} transparent roughness={0.8} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
      </mesh>
      {/* 간판 위 눈 */}
      <RoundedBox args={[1.7, 0.24, 0.3]} radius={0.115} smoothness={4} position={[0, 0.82, -0.04]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

function Awning({ store }) {
  const tex = useMemo(() => awningTexture(store.awning, store.awningStyle), [store])
  const depth = 1.2
  const a = 0.55
  const topY = B + H - 0.12
  const center = [0, topY - (Math.sin(a) * depth) / 2, D / 2 + (Math.cos(a) * depth) / 2]
  const frontY = topY - Math.sin(a) * depth
  const frontZ = D / 2 + Math.cos(a) * depth
  const N = 11
  const sr = (W + 0.1) / N / 2
  return (
    <group>
      <mesh position={center} rotation={[-Math.PI / 2 + a, 0, 0]} castShadow>
        <planeGeometry args={[W + 0.1, depth]} />
        <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
      {/* 차양 앞 끝: 폭신하게 말린 롤 */}
      <mesh position={[0, frontY + 0.02, frontZ]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.11, W - 0.1, 4, 12]} />
        <meshStandardMaterial color={store.awning} roughness={0.9} />
      </mesh>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} position={[-(W + 0.1) / 2 + sr + i * sr * 2, frontY - 0.08, frontZ + 0.06]}>
          <circleGeometry args={[sr, 12, Math.PI, Math.PI]} />
          <meshStandardMaterial
            color={store.awningStyle === 'solid' ? store.awning : i % 2 ? '#fbf3ea' : store.awning}
            side={THREE.DoubleSide}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  )
}

function Chair({ position, rot = 0 }) {
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <RoundedBox args={[0.46, 0.09, 0.46]} radius={0.04} position={[0, 0.42, 0]} castShadow><Mat color={WOOD} /></RoundedBox>
      <RoundedBox args={[0.46, 0.5, 0.09]} radius={0.04} position={[0, 0.72, -0.19]}><Mat color={WOOD} /></RoundedBox>
      {[[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]}><boxGeometry args={[0.05, 0.42, 0.05]} /><Mat color={WOOD} /></mesh>
      ))}
      <RoundedBox args={[0.42, 0.06, 0.42]} radius={0.03} position={[0, 0.47, 0]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

function TableSet({ position, check }) {
  const ct = useMemo(() => (check ? checkTexture() : null), [check])
  return (
    <group position={position}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 16]} />
        {check ? <meshStandardMaterial map={ct} roughness={0.9} /> : <Mat color={SNOW} />}
      </mesh>
      {check && (
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.6, 0.66, 0.34, 16, 1, true]} />
          <meshStandardMaterial map={ct} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      )}
      <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.05, 0.05, 0.72, 6]} /><Mat color={PAL.woodDark} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.28, 0.3, 0.04, 10]} /><Mat color={PAL.woodDark} /></mesh>
      <mesh position={[0, 0.78, 0]}><cylinderGeometry args={[0.5, 0.52, 0.05, 16]} /><Mat color={SNOW} /></mesh>
      <Chair position={[-0.85, 0, 0]} rot={Math.PI / 2} />
      <Chair position={[0.85, 0, 0]} rot={-Math.PI / 2} />
    </group>
  )
}

function ABoard({ position, kind, rot = 0 }) {
  const tex = useMemo(() => chalkTexture(kind), [kind])
  return (
    <group position={position} rotation={[0, rot, 0]}>
      <group rotation={[-0.18, 0, 0]} position={[0, 0, 0.12]}>
        <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.62, 0.8, 0.05]} /><Mat color={WOOD} /></mesh>
        <mesh position={[0, 0.55, 0.03]}><planeGeometry args={[0.5, 0.66]} /><meshStandardMaterial map={tex} /></mesh>
      </group>
      <mesh position={[0, 0.5, -0.12]} rotation={[0.18, 0, 0]}><boxGeometry args={[0.62, 0.95, 0.05]} /><Mat color={WOOD} /></mesh>
      <RoundedBox args={[0.66, 0.08, 0.3]} radius={0.04} position={[0, 0.98, 0]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

function GiftShelf({ position, rot = 0, color }) {
  const boxes = [
    [-0.25, 0.5, PAL.roof], [0.2, 0.5, color], [-0.2, 0.95, PAL.shade], [0.22, 0.95, PAL.glow], [0, 1.38, PAL.roof],
  ]
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {[0.3, 0.75, 1.2].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[1, 0.06, 0.45]} /><Mat color={WOOD} /></mesh>
      ))}
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.78, 0]}><boxGeometry args={[0.06, 1.56, 0.45]} /><Mat color={PAL.woodDark} /></mesh>
      ))}
      {boxes.map(([x, y, c], i) => (
        <group key={i} position={[x, y, 0]}>
          <RoundedBox args={[0.32, 0.3, 0.3]} radius={0.07}><Mat color={c} /></RoundedBox>
          <RoundedBox args={[0.08, 0.32, 0.32]} radius={0.03}><Mat color="#fff7ec" /></RoundedBox>
        </group>
      ))}
      <RoundedBox args={[1.08, 0.1, 0.5]} radius={0.04} position={[0, 1.6, 0]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

function Props({ store }) {
  const s = store.side === 'L' ? 1 : -1 // 로컬 +x 쪽이 큰길이면 1
  const z0 = D / 2
  if (store.type === 'cafe')
    return (
      <>
        <TableSet position={[-s * 1.75, 0, z0 + 1.7]} />
        <ABoard position={[s * 2.35, 0, z0 + 0.9]} kind="cafe" rot={s * 0.4} />
        <Bush position={[-s * 2.85, 0, z0 + 0.15]} />
      </>
    )
  if (store.type === 'gift')
    return (
      <>
        <GiftShelf position={[s * 2.55, 0, z0 + 0.55]} rot={s * 0.5} color={store.awning} />
        <PottedTree position={[-s * 2.7, 0, z0 + 0.5]} />
        <ABoard position={[-s * 1.55, 0, z0 + 1.4]} kind="gift" rot={-s * 0.3} />
      </>
    )
  return (
    <>
      <TableSet position={[-s * 1.75, 0, z0 + 1.7]} check />
      <ABoard position={[s * 2.4, 0, z0 + 0.85]} kind="food" rot={s * 0.4} />
      <PottedTree position={[s * 2.75, 0, z0 - 0.2]} />
    </>
  )
}

// 지붕 위 눈 뭉치 (구름처럼 몽글몽글)
const PUFFS = [
  [-1.55, 0.95, -0.55, 0.78], [-0.45, 1.08, -0.75, 0.86], [0.75, 1.02, -0.6, 0.82], [1.7, 0.92, -0.35, 0.7],
  [-1.0, 0.92, 0.55, 0.66], [0.25, 1.0, 0.45, 0.72], [1.25, 0.9, 0.6, 0.6],
]
const DRIPS = [-2.05, -1.45, -0.85, -0.2, 0.45, 1.05, 1.65, 2.15]

function Shop({ store }) {
  const door = useMemo(() => ({
    leaf: softExtrude(arch(0.95, 1.85), 0.05, 0.045),
    glass: new THREE.ShapeGeometry(arch(0.56, 0.62), 14),
  }), [])
  return (
    <group>
      {/* 둥근 받침 */}
      <RoundedBox args={[W + 0.45, B, D + 0.45]} radius={0.1} smoothness={3} position={[0, B / 2, 0]} receiveShadow castShadow>
        <Mat color="#E4E0D6" />
      </RoundedBox>
      {/* 모서리를 크게 깎은 벽 */}
      <RoundedBox args={[W, H, D]} radius={0.55} smoothness={5} position={[0, B + H / 2, 0]} castShadow receiveShadow>
        <Mat color={store.wall} />
      </RoundedBox>
      {/* 아랫단 띠 */}
      <RoundedBox args={[W + 0.08, 0.56, D + 0.08]} radius={0.27} smoothness={4} position={[0, B + 0.28, 0]}>
        <Mat color={PAL.path} />
      </RoundedBox>
      {/* 처마 + 구름 같은 눈 지붕 */}
      <RoundedBox args={[W + 0.55, 0.22, D + 0.55]} radius={0.1} smoothness={3} position={[0, B + H + 0.06, 0]} castShadow>
        <Mat color={PAL.roof} />
      </RoundedBox>
      <RoundedBox args={[W + 0.8, 0.9, D + 0.8]} radius={0.44} smoothness={6} position={[0, B + H + 0.5, 0]} castShadow>
        <Mat color={SNOW} roughness={1} />
      </RoundedBox>
      {PUFFS.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, B + H + y, z]} scale={[1, 0.62, 1]} castShadow>
          <sphereGeometry args={[r, 16, 12]} />
          <Mat color={SNOW} roughness={1} />
        </mesh>
      ))}
      {/* 처마 끝에 몽글몽글 흘러내린 눈 */}
      {DRIPS.map((x, i) => (
        <mesh key={i} position={[x, B + H + 0.12 - (i % 3) * 0.04, D / 2 + 0.4]} scale={[1, 1.15, 0.9]}>
          <sphereGeometry args={[0.15 + (i % 3) * 0.035, 12, 10]} />
          <Mat color={SNOW} />
        </mesh>
      ))}
      <Plaque store={store} />
      {/* 정면: 둥근 창문 · 아치 문 */}
      <Window position={[-1.22, B + 1.3, D / 2 - 0.02]} w={1.15} h={1.1} />
      <group position={[0.2, B, D / 2 - 0.02]}>
        <mesh geometry={door.leaf}><Mat color={PAL.woodDark} /></mesh>
        <mesh geometry={door.glass} position={[0, 1.02, 0.1]}><meshStandardMaterial {...WARM} /></mesh>
        <mesh position={[0.31, 0.85, 0.12]}><sphereGeometry args={[0.055, 10, 8]} /><Mat color={PAL.glow} metalness={0.4} /></mesh>
        {/* 리스 */}
        <mesh position={[0, 1.3, 0.14]}><torusGeometry args={[0.19, 0.07, 10, 20]} /><Mat color={PAL.pine} /></mesh>
        <mesh position={[0, 1.11, 0.19]}><sphereGeometry args={[0.06, 10, 8]} /><Mat color={PAL.roof} /></mesh>
      </group>
      <Window position={[1.25, B + 1.3, D / 2 - 0.02]} w={0.7} h={1.1} />
      <Awning store={store} />
      <Props store={store} />
    </group>
  )
}

const POSTCARD_POS = [1.6, B + 0.95, D / 2 + 0.14] // 오른쪽 창문 아래 귀퉁이에 붙임

function Postcard({ store, animateAt }) {
  const [tex, setTex] = useState(null)
  const ref = useRef()
  const [sparkle, setSparkle] = useState(false)
  useEffect(() => {
    let alive = true
    loadImage(stampUrl(store)).then((img) => alive && setTex(postcardTexture(img, store.color)))
    return () => { alive = false }
  }, [store])
  useEffect(() => {
    if (!ref.current || !tex) return
    if (animateAt && Date.now() - animateAt < 3000) {
      ref.current.scale.setScalar(0.01)
      gsap.to(ref.current.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(2.2)', delay: 0.15 })
      gsap.fromTo(ref.current.rotation, { z: -0.9 }, { z: 0.08, duration: 0.4, ease: 'back.out(2)', delay: 0.15 })
      setSparkle(true)
      const t = setTimeout(() => setSparkle(false), 1600)
      return () => clearTimeout(t)
    }
  }, [animateAt, tex])
  if (!tex) return null
  return (
    <group position={POSTCARD_POS}>
      <group ref={ref} rotation={[0, 0, 0.08]}>
        <mesh>
          <planeGeometry args={[0.46, 0.58]} />
          <meshStandardMaterial map={tex} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} roughness={0.9} />
        </mesh>
      </group>
      {sparkle && <Sparkles count={26} scale={[1.4, 1.4, 0.6]} size={6} speed={1.2} color={PAL.glow} />}
    </group>
  )
}

export default function Building({ store, onTap, bounceAt }) {
  const group = useRef()
  const stamped = useApp((s) => !!s.stamps[store.id])
  const postcard = useApp((s) => (s.postcard && s.postcard.storeId === store.id ? s.postcard.t : 0))

  useEffect(() => {
    if (!bounceAt || !group.current) return
    gsap.killTweensOf(group.current.scale)
    gsap.fromTo(group.current.scale, { x: 1, y: 1, z: 1 }, { x: 1.08, y: 1.12, z: 1.08, duration: 0.1, yoyo: true, repeat: 1, ease: 'power2.out' })
  }, [bounceAt])

  return (
    <group position={[store.building[0], 0, store.building[1]]} rotation={[0, store.rot, 0]} scale={BUILD_SCALE}>
      <group ref={group}>
        <Shop store={store} />
        {stamped && <Postcard store={store} animateAt={postcard} />}
      </group>
      {/* 터치 영역 (넉넉하게) */}
      <mesh
        position={[0, 2, 0.4]}
        onClick={(e) => {
          e.stopPropagation()
          if (e.delta > 12) return // 드래그는 무시
          onTap(store.id)
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <boxGeometry args={[5.2, 4.2, 4.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
