// 눈 덮인 가게 건물 (베타: 코드로 만든 임시 모델, 정면 = +z)
// 공통: 크림색 벽 + 눈 지붕 + 지붕 위 둥근 간판(문양+이름) + 차양 + 따뜻한 창문
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

const Mat = ({ color, ...p }) => (
  <meshStandardMaterial color={color} roughness={0.85} {...(color === '#ffffff' ? { emissive: '#fff3f2', emissiveIntensity: 0.3 } : {})} {...p} />
)
const SNOW = '#ffffff'
const WOOD = '#8a6250'
const WARM = { color: '#ffe2ae', emissive: '#ffbf66', emissiveIntensity: 1.0 }

export const SHOP = { W: 4.6, D: 3.4, H: 2.7, B: 0.22 }
const { W, D, H, B } = SHOP

function Window({ position, w, h }) {
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.01]}>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.08]} />
        <Mat color={WOOD} />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial {...WARM} />
      </mesh>
      <mesh position={[0, 0, 0.045]}><boxGeometry args={[0.05, h, 0.02]} /><Mat color={WOOD} /></mesh>
      <mesh position={[0, 0, 0.045]}><boxGeometry args={[w, 0.05, 0.02]} /><Mat color={WOOD} /></mesh>
      {/* 창턱 + 눈 */}
      <mesh position={[0, -h / 2 - 0.1, 0.1]}><boxGeometry args={[w + 0.3, 0.08, 0.22]} /><Mat color={WOOD} /></mesh>
      <RoundedBox args={[w + 0.26, 0.09, 0.22]} radius={0.04} position={[0, -h / 2 - 0.03, 0.1]}><Mat color={SNOW} /></RoundedBox>
    </group>
  )
}

function Plaque({ store }) {
  const [tex, setTex] = useState(() => plaqueTexture(store, null))
  useEffect(() => {
    let alive = true
    loadImage(motifUrl(store, '#7a5444')).then((img) => alive && setTex(plaqueTexture(store, img)))
    return () => { alive = false }
  }, [store])
  return (
    <group position={[0, B + H + 0.95, D / 2 + 0.32]} rotation={[-0.1, 0, 0]}>
      <RoundedBox args={[2.2, 1.55, 0.14]} radius={0.06} position={[0, 0, -0.08]} castShadow>
        <Mat color={WOOD} />
      </RoundedBox>
      <mesh>
        <planeGeometry args={[2.3, 1.62]} />
        <meshStandardMaterial map={tex} transparent roughness={0.8} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.18} />
      </mesh>
      {/* 간판 위 눈 */}
      <RoundedBox args={[1.6, 0.16, 0.24]} radius={0.07} position={[0, 0.8, -0.04]}><Mat color={SNOW} /></RoundedBox>
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
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} position={[-(W + 0.1) / 2 + sr + i * sr * 2, frontY + 0.005, frontZ + 0.005]}>
          <circleGeometry args={[sr, 10, Math.PI, Math.PI]} />
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
      <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[0.42, 0.06, 0.42]} /><Mat color="#a0745c" /></mesh>
      <mesh position={[0, 0.72, -0.19]}><boxGeometry args={[0.42, 0.5, 0.05]} /><Mat color="#a0745c" /></mesh>
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
        {check ? <meshStandardMaterial map={ct} roughness={0.9} /> : <Mat color="#f1e6dc" />}
      </mesh>
      {check && (
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.6, 0.66, 0.34, 16, 1, true]} />
          <meshStandardMaterial map={ct} side={THREE.DoubleSide} roughness={0.9} />
        </mesh>
      )}
      <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.05, 0.05, 0.72, 6]} /><Mat color="#6b4a3c" /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.28, 0.3, 0.04, 10]} /><Mat color="#6b4a3c" /></mesh>
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
    [-0.25, 0.5, '#e9a6ad'], [0.2, 0.5, color], [-0.2, 0.95, '#a9c7b3'], [0.22, 0.95, '#f2d08a'], [0, 1.38, '#e9a6ad'],
  ]
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {[0.3, 0.75, 1.2].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow><boxGeometry args={[1, 0.06, 0.45]} /><Mat color="#c9a48e" /></mesh>
      ))}
      {[-0.48, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.78, 0]}><boxGeometry args={[0.06, 1.56, 0.45]} /><Mat color="#b48b74" /></mesh>
      ))}
      {boxes.map(([x, y, c], i) => (
        <group key={i} position={[x, y, 0]}>
          <mesh><boxGeometry args={[0.32, 0.3, 0.3]} /><Mat color={c} /></mesh>
          <mesh><boxGeometry args={[0.07, 0.31, 0.31]} /><Mat color="#fff7ec" /></mesh>
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

function Shop({ store }) {
  return (
    <group>
      <mesh position={[0, B / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[W + 0.25, B, D + 0.25]} />
        <Mat color="#e3d3cc" />
      </mesh>
      <mesh position={[0, B + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
        <Mat color={store.wall} />
      </mesh>
      <mesh position={[0, B + 0.28, 0]}>
        <boxGeometry args={[W + 0.04, 0.56, D + 0.04]} />
        <Mat color="#e4cbbd" />
      </mesh>
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * (W / 2), B + H / 2, D / 2]}>
          <boxGeometry args={[0.16, H, 0.16]} />
          <Mat color="#c9a48e" />
        </mesh>
      ))}
      {/* 처마 + 눈 지붕 */}
      <mesh position={[0, B + H + 0.08, 0]} castShadow>
        <boxGeometry args={[W + 0.5, 0.16, D + 0.5]} />
        <Mat color={WOOD} />
      </mesh>
      <RoundedBox args={[W + 0.75, 0.75, D + 0.75]} radius={0.32} smoothness={3} position={[0, B + H + 0.5, 0]} castShadow>
        <Mat color={SNOW} roughness={1} />
      </RoundedBox>
      {[-1.9, -1.1, -0.2, 0.7, 1.5, 2.1].map((x, i) => (
        <mesh key={i} position={[x, B + H + 0.13, D / 2 + 0.36]} scale={[1, 1.4, 1]}>
          <sphereGeometry args={[0.1 + (i % 3) * 0.02, 8, 6]} />
          <Mat color={SNOW} />
        </mesh>
      ))}
      <Plaque store={store} />
      {/* 정면: 창문 · 문 */}
      <Window position={[-1.3, B + 1.3, D / 2 + 0.02]} w={1.3} h={1.15} />
      <group position={[0.15, B, D / 2 + 0.03]}>
        <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.95, 1.8, 0.08]} /><Mat color="#9a6b55" /></mesh>
        <mesh position={[0, 1.2, 0.05]}><planeGeometry args={[0.6, 0.65]} /><meshStandardMaterial {...WARM} /></mesh>
        <mesh position={[0.32, 0.85, 0.07]}><sphereGeometry args={[0.05, 8, 6]} /><Mat color="#e9c46a" metalness={0.4} /></mesh>
        {/* 리스 */}
        <mesh position={[0, 1.2, 0.08]}><torusGeometry args={[0.2, 0.06, 6, 14]} /><Mat color="#6f8f6a" /></mesh>
        <mesh position={[0, 1.02, 0.12]}><sphereGeometry args={[0.05, 6, 5]} /><Mat color="#d0545c" /></mesh>
      </group>
      <Window position={[1.2, B + 1.3, D / 2 + 0.02]} w={0.75} h={1.15} />
      <Awning store={store} />
      <Props store={store} />
    </group>
  )
}

const POSTCARD_POS = [1.98, B + 1.25, D / 2 + 0.03]

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
      {sparkle && <Sparkles count={26} scale={[1.4, 1.4, 0.6]} size={6} speed={1.2} color="#fff3b0" />}
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
    <group position={[store.building[0], 0, store.building[1]]} rotation={[0, store.rot, 0]}>
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
