import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MapControls } from '@react-three/drei'
import gsap from 'gsap'
import { STORES, STORE_BY_ID } from '../data/stores.js'
import { NODES, MAP_W, MAP_H, START_NODE, findPath } from '../data/map.js'
import { drawMapCanvas, GROUND } from './mapTexture.js'
import { snowDotTexture } from './textures.js'
import { StreetDecor } from './Decor.jsx'
import Building from './Building.jsx'
import Avatar from './Avatar.jsx'
import { useApp } from '../store.js'

const CAM_OFFSET = new THREE.Vector3(0, 18, 16)
// 정사영(직교) 카메라: zoom = 화면 px / 월드 1칸.  기본은 가로로 약 17칸이 보이게
const VIEW_W = 19
const baseZoom = () => Math.max(window.innerWidth, 320) / VIEW_W
const WALK_SPEED = 6.5 // units / s
const ELEV = Math.atan2(18, 16) // 카메라 내려다보는 각도

function Ground({ onReady }) {
  const [tex, setTex] = useState(null)
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    drawMapCanvas().then((cv) => {
      const t = new THREE.CanvasTexture(cv)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())
      setTex(t)
      onReady?.()
    })
  }, [])
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial color={GROUND} roughness={1} emissive={GROUND} emissiveIntensity={0.3} />
      </mesh>
      {tex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[MAP_W, MAP_H]} />
          <meshStandardMaterial map={tex} roughness={1} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.32} />
        </mesh>
      )}
    </group>
  )
}

function Snow({ follow }) {
  const COUNT = 420
  const ref = useRef()
  const tex = useMemo(() => snowDotTexture(), [])
  const { positions, speeds } = useMemo(() => {
    const p = new Float32Array(COUNT * 3)
    const s = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      p[i * 3] = (Math.random() - 0.5) * 34
      p[i * 3 + 1] = Math.random() * 22
      p[i * 3 + 2] = (Math.random() - 0.5) * 56
      s[i] = 0.8 + Math.random() * 1.2
    }
    return { positions: p, speeds: s }
  }, [])
  useFrame(({ clock }, dt) => {
    const g = ref.current
    if (!g) return
    const pos = g.geometry.attributes.position
    const t = clock.elapsedTime
    for (let i = 0; i < COUNT; i++) {
      let y = pos.array[i * 3 + 1] - speeds[i] * dt
      if (y < 0) y += 22
      pos.array[i * 3 + 1] = y
      pos.array[i * 3] += Math.sin(t * 0.8 + i) * 0.25 * dt
    }
    pos.needsUpdate = true
    if (follow.current) g.position.set(follow.current.x, 0, follow.current.z)
  })
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial map={tex} size={3.4 * Math.min(window.devicePixelRatio || 1, 1.75)} sizeAttenuation={false} transparent depthWrite={false} opacity={0.85} color="#ffffff" />
    </points>
  )
}

function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI
  if (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

function World({ onReady }) {
  const { camera } = useThree()
  const controls = useRef()
  const avatar = useRef()
  const anim = useRef({ mode: 'idle', t: 0 })
  const follow = useRef(null) // 카메라가 따라갈 지점
  const followOn = useRef(false)
  const walk = useRef(null) // { pts, seg, d, target }
  const facing = useRef(Math.PI)
  const [bounce, setBounce] = useState({})
  const [ready, setReady] = useState(false)

  const phase = useApp((s) => s.phase)
  const walkTarget = useApp((s) => s.walkTarget)
  const teleport = useApp((s) => s.teleport)
  const tapStore = useApp((s) => s.tapStore)

  // 초기 위치
  useEffect(() => {
    const [x, z] = NODES[useApp.getState().avatarNode]
    avatar.current.position.set(x, 0, z)
    avatar.current.rotation.y = 0 // 카메라를 바라봄
    if (location.search.includes('debug')) {
      window.__debug = {
        avatar: avatar.current,
        camera,
        get controls() {
          return controls.current
        },
        project: (x, y, z) => {
          const v = new THREE.Vector3(x, y, z).project(camera)
          return [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight]
        },
      }
    }
    facing.current = 0
    follow.current = new THREE.Vector3(x, 0, z)
    camera.position.set(x, 6, z + 30)
    camera.zoom = baseZoom() * 5
    camera.updateProjectionMatrix()
    camera.lookAt(x, 1.15, z)
  }, [])

  // 첫 진입 연출: 손 흔들기 → 돌아서기 → 3인칭 시점으로
  useEffect(() => {
    if (!ready || !controls.current) return
    const c = controls.current
    const p = avatar.current.position
    c.enabled = false
    c.minZoom = 0.1
    c.maxZoom = 1000
    c.target.set(p.x, 1.15, p.z)
    camera.position.set(p.x, 6, p.z + 30)
    camera.zoom = baseZoom() * 5
    camera.updateProjectionMatrix()
    c.update()
    anim.current.mode = 'wave'
    const halfD0 = innerHeight / 2 / baseZoom() / Math.sin(ELEV)
    const final = new THREE.Vector3(p.x, 0, Math.min(p.z - 5, MAP_H / 2 - halfD0 * 0.95))
    const tl = gsap.timeline({ delay: 0.5 })
    tl.to({}, { duration: 1.3 })
    tl.add(() => (anim.current.mode = 'idle'))
    tl.to(facing, { current: Math.PI, duration: 0.35, ease: 'power2.inOut', onUpdate: () => (avatar.current.rotation.y = facing.current) })
    const s = { tx: c.target.x, ty: c.target.y, tz: c.target.z, px: camera.position.x, py: camera.position.y, pz: camera.position.z, zm: camera.zoom }
    tl.to(s, {
      tx: final.x, ty: 0, tz: final.z,
      px: final.x + CAM_OFFSET.x, py: CAM_OFFSET.y, pz: final.z + CAM_OFFSET.z,
      zm: baseZoom(),
      duration: 1.1, ease: 'power2.inOut',
      onUpdate: () => {
        c.target.set(s.tx, s.ty, s.tz)
        camera.position.set(s.px, s.py, s.pz)
        camera.zoom = s.zm
        camera.updateProjectionMatrix()
        c.update()
      },
    }, '-=0.15')
    tl.add(() => {
      c.minZoom = baseZoom() * 0.6
      c.maxZoom = baseZoom() * 2.6
      c.enabled = true
      follow.current = final.clone()
      useApp.getState().setPhase('map')
    })
    return () => tl.kill()
  }, [ready])

  // 매장 탭 → 아바타 걷기
  useEffect(() => {
    if (!walkTarget) return
    const from = useApp.getState().avatarNode
    const pts = findPath(from, 'f_' + walkTarget).map(([x, z]) => new THREE.Vector3(x, 0, z))
    pts[0] = avatar.current.position.clone()
    walk.current = { pts, seg: 0, d: 0, target: walkTarget }
    anim.current.mode = 'walk'
    followOn.current = true
  }, [walkTarget])

  // 저널 빈 칸 → 매장 앞으로 이동 (or 초기화 시 출발점)
  useEffect(() => {
    if (!teleport) return
    const s = teleport.storeId ? STORE_BY_ID[teleport.storeId] : null
    const [x, z] = s ? s.front : NODES[START_NODE]
    walk.current = null
    anim.current.mode = 'idle'
    avatar.current.position.set(x, 0, z)
    facing.current = s ? Math.atan2(s.building[0] - x, s.building[1] - z) : Math.PI
    avatar.current.rotation.y = facing.current
    followOn.current = true
    if (s) setTimeout(() => setBounce((b) => ({ ...b, [s.id]: Date.now() })), 450)
  }, [teleport])

  const onTap = (id) => {
    const st = useApp.getState()
    if (st.phase !== 'map' || st.walkTarget || st.activeStore || st.journal) return
    setBounce((b) => ({ ...b, [id]: Date.now() }))
    setTimeout(() => tapStore(id), 200) // 통 튀는 0.2초 후 출발
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1)
    const a = avatar.current
    // 걷기
    const w = walk.current
    if (w) {
      let move = WALK_SPEED * dt
      while (move > 0 && w.seg < w.pts.length - 1) {
        const A = w.pts[w.seg], B = w.pts[w.seg + 1]
        const len = A.distanceTo(B)
        const rem = len - w.d
        if (move < rem) { w.d += move; move = 0 } else { move -= rem; w.seg++; w.d = 0 }
      }
      if (w.seg >= w.pts.length - 1) {
        a.position.copy(w.pts[w.pts.length - 1])
        const s = STORE_BY_ID[w.target]
        walk.current = null
        anim.current.mode = 'idle'
        const want = Math.atan2(s.building[0] - s.front[0], s.building[1] - s.front[1])
        let diff = (want - facing.current) % (Math.PI * 2)
        if (diff > Math.PI) diff -= Math.PI * 2
        if (diff < -Math.PI) diff += Math.PI * 2
        gsap.to(facing, { current: facing.current + diff, duration: 0.25, onUpdate: () => (a.rotation.y = facing.current) })
        setTimeout(() => useApp.getState().arrived(s.id), 260)
      } else {
        const A = w.pts[w.seg], B = w.pts[w.seg + 1]
        const dir = B.clone().sub(A).normalize()
        a.position.copy(A).addScaledVector(dir, w.d)
        facing.current = angleLerp(facing.current, Math.atan2(dir.x, dir.z), 1 - Math.exp(-dt * 12))
        a.rotation.y = facing.current
      }
    }

    // 카메라 따라가기
    const c = controls.current
    if (!c || useApp.getState().phase !== 'map') return
    if (followOn.current) {
      const goal = new THREE.Vector3(a.position.x * 0.4, 0, a.position.z - 5)
      const k = 1 - Math.exp(-dt * 4)
      const delta = goal.sub(c.target).multiplyScalar(k)
      c.target.add(delta)
      camera.position.add(delta)
      if (!walk.current && delta.lengthSq() < 1e-6) followOn.current = false
    }
    // 지도 밖으로 못 나가게 (줌에 따라 허용 범위 계산)
    const halfW = innerWidth / 2 / camera.zoom
    const halfD = innerHeight / 2 / camera.zoom / Math.sin(ELEV)
    const xm = Math.max(0, 12 - halfW)
    let z0 = -MAP_H / 2 + halfD * 0.75
    let z1 = MAP_H / 2 - halfD * 0.95
    if (z0 > z1) z0 = z1 = (z0 + z1) / 2
    const cx = THREE.MathUtils.clamp(c.target.x, -xm, xm)
    const cz = THREE.MathUtils.clamp(c.target.z, z0, z1)
    if (cx !== c.target.x || cz !== c.target.z) {
      camera.position.x += cx - c.target.x
      camera.position.z += cz - c.target.z
      c.target.x = cx
      c.target.z = cz
    }
    follow.current = c.target
  })

  return (
    <>
      <Ground onReady={() => { setReady(true); onReady?.() }} />
      {STORES.map((s) => (
        <Building key={s.id} store={s} onTap={onTap} bounceAt={bounce[s.id]} />
      ))}
      <Avatar ref={avatar} anim={anim} />
      <StreetDecor />
      <Snow follow={follow} />
      <MapControls
        ref={controls}
        makeDefault
        enableRotate={false}
        enableDamping
        dampingFactor={0.12}
        screenSpacePanning={false}
        onStart={() => (followOn.current = false)}
      />
    </>
  )
}

export default function MapScene({ onReady }) {
  return (
    <Canvas
      shadows
      flat
      orthographic
      dpr={[1, 1.75]}
      camera={{ near: 0.1, far: 400, position: [0, 20, 40], zoom: 20 }}
      gl={{ antialias: true, preserveDrawingBuffer: false }}
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#f1e3e2')
      }}
    >
      <hemisphereLight args={['#fff2f0', '#f0dcd6', 1.0]} />
      <directionalLight
        position={[14, 26, 12]}
        intensity={1.15}
        color="#fff1e8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={32}
        shadow-camera-bottom={-32}
        shadow-bias={-0.0006}
      />
      <Suspense fallback={null}>
        <World onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
