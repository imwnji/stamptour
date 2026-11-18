// 동글동글 로우폴리 여자아이 아바타 (베타: 코드로 만든 임시 모델, 정면 = +z)
// 핑크 니트 모자 + 크림 목도리 + 핑크 더플코트 + 퍼 부츠
// Blender 캐릭터(.glb)가 준비되면 이 컴포넌트 내부를 useGLTF + useAnimations 로 교체하세요.
import { forwardRef, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const SKIN = '#ffd9bf'
const HAIR = '#6b4433'
const PINK = '#f7bcc3'
const PINK_D = '#e9a9ae'
const FUR = '#fffaf4'
const CREAM = '#f1e7d6'
const BOOT = '#f2b9bd'

// 부드러운 셰이딩(얼굴·머리) / 로우폴리 셰이딩(옷)
const Soft = ({ color, ...p }) => <meshStandardMaterial color={color} roughness={0.75} {...p} />
const Flat = ({ color, ...p }) => <meshStandardMaterial color={color} roughness={0.9} flatShading {...p} />

const HEAD_R = 0.55

// 머리 표면 위의 점 (방향 → 반지름 r)
function onHead(x, y, z, r = HEAD_R) {
  const l = Math.hypot(x, y, z)
  return [(x / l) * r, (y / l) * r, (z / l) * r]
}

function Face() {
  return (
    <group>
      {[-1, 1].map((k) => (
        <group key={k}>
          {/* 눈 */}
          <mesh position={onHead(k * 0.36, 0.02, 0.93, HEAD_R - 0.005)} scale={[0.82, 1.2, 0.45]}>
            <sphereGeometry args={[0.1, 16, 12]} />
            <Soft color="#2b201c" roughness={0.25} />
          </mesh>
          {/* 눈 하이라이트 */}
          <mesh position={onHead(k * 0.33 + 0.035, 0.1, 0.94, HEAD_R + 0.035)}>
            <sphereGeometry args={[0.028, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={onHead(k * 0.39 - 0.02, -0.05, 0.92, HEAD_R + 0.03)}>
            <sphereGeometry args={[0.013, 6, 4]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          {/* 속눈썹 */}
          <mesh position={onHead(k * 0.52, 0.12, 0.85, HEAD_R + 0.01)} rotation={[0, k * 0.5, k * -0.7]}>
            <boxGeometry args={[0.075, 0.022, 0.02]} />
            <Soft color="#2b201c" />
          </mesh>
          {/* 볼터치 */}
          <mesh position={onHead(k * 0.55, -0.24, 0.8, HEAD_R + 0.004)} rotation={[0, k * 0.6, 0]}>
            <circleGeometry args={[0.09, 16]} />
            <meshBasicMaterial color="#ff9fa3" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* 코 (작은 점) */}
      <mesh position={onHead(0, -0.12, 1, HEAD_R + 0.005)}>
        <sphereGeometry args={[0.022, 8, 6]} />
        <Soft color="#f2a68f" />
      </mesh>
      {/* 입 */}
      <mesh position={onHead(0, -0.27, 0.96, HEAD_R + 0.002)} rotation={[0.28, 0, Math.PI]}>
        <torusGeometry args={[0.045, 0.013, 4, 10, Math.PI]} />
        <Soft color="#a24d45" />
      </mesh>
    </group>
  )
}

function Hair() {
  const fringe = [-0.42, -0.21, 0, 0.21, 0.42]
  return (
    <group>
      {/* 뒷머리 (단발) */}
      <mesh position={[0, 0.0, -0.07]} scale={[1.05, 0.97, 1]} castShadow>
        <sphereGeometry args={[0.58, 18, 14]} />
        <Soft color={HAIR} />
      </mesh>
      {/* 앞머리 */}
      <mesh>
        <sphereGeometry args={[HEAD_R + 0.025, 20, 10, Math.PI / 2 - 1.25, 2.5, 0, 1.12]} />
        <Soft color={HAIR} side={THREE.DoubleSide} />
      </mesh>
      {/* 앞머리 끝 삐죽 */}
      {fringe.map((a, i) => {
        const p = onHead(Math.sin(a), 0.42, Math.cos(a), HEAD_R + 0.02)
        return (
          <mesh key={i} position={p} rotation={[Math.PI + 0.35, a, 0]} scale={[1, 1, 0.5]}>
            <coneGeometry args={[0.085, 0.15, 5]} />
            <Soft color={HAIR} />
          </mesh>
        )
      })}
      {/* 뒤로 묶은 똥머리 + 핑크 곱창끈 */}
      <mesh position={[-0.3, -0.3, -0.64]} castShadow>
        <icosahedronGeometry args={[0.21, 2]} />
        <Soft color={HAIR} />
      </mesh>
      <mesh position={[-0.25, -0.26, -0.52]} rotation={[0.3, -0.45, 0]}>
        <torusGeometry args={[0.14, 0.055, 8, 14]} />
        <Flat color={PINK_D} />
      </mesh>
      {/* 옆머리 */}
      {[-1, 1].map((k) => (
        <mesh key={k} position={[k * 0.5, -0.22, 0.12]} rotation={[0.1, 0, k * 0.12]} scale={[0.55, 1, 0.7]}>
          <sphereGeometry args={[0.2, 10, 8]} />
          <Soft color={HAIR} />
        </mesh>
      ))}
    </group>
  )
}

function Hat({ pom }) {
  const T = 1.08 // 모자가 덮는 각도
  return (
    <group position={[0, 0.04, -0.03]} rotation={[-0.14, 0, 0.05]}>
      {/* 니트 모자 */}
      <mesh castShadow>
        <sphereGeometry args={[0.62, 18, 10, 0, Math.PI * 2, 0, T]} />
        <Flat color={PINK} />
      </mesh>
      {/* 니트 골 */}
      {[-0.5, -0.17, 0.17, 0.5].map((a) => (
        <mesh key={a} rotation={[0, a, 0]}>
          <sphereGeometry args={[0.625, 4, 8, Math.PI / 2 - 0.02, 0.04, 0.15, T - 0.2]} />
          <Flat color={PINK_D} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* 퍼 테두리 */}
      <mesh position={[0, 0.62 * Math.cos(T), 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.62 * Math.sin(T) - 0.03, 0.095, 8, 22]} />
        <Flat color={FUR} />
      </mesh>
      {/* 축 늘어진 끝 + 방울 */}
      <mesh position={[0.3, 0.58, -0.12]} rotation={[-0.25, 0, -1.78]} castShadow>
        <coneGeometry args={[0.23, 0.72, 10]} />
        <Flat color={PINK} />
      </mesh>
      <mesh ref={pom} position={[0.68, 0.5, -0.2]} castShadow>
        <icosahedronGeometry args={[0.14, 1]} />
        <Flat color={FUR} />
      </mesh>
    </group>
  )
}

function Arm({ armRef, side }) {
  return (
    <group ref={armRef} position={[side * 0.27, 0.84, 0]} rotation={[0, 0, side * 0.35]}>
      <mesh position={[0, -0.16, 0]} castShadow>
        <capsuleGeometry args={[0.075, 0.2, 3, 8]} />
        <Flat color={PINK} />
      </mesh>
      <mesh position={[0, -0.29, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.07, 0.03, 6, 10]} />
        <Flat color={FUR} />
      </mesh>
      <mesh position={[0, -0.37, 0]}>
        <icosahedronGeometry args={[0.085, 1]} />
        <Flat color={CREAM} />
      </mesh>
    </group>
  )
}

function Leg({ legRef, x }) {
  return (
    <group ref={legRef} position={[x, 0.38, 0]}>
      <mesh position={[0, -0.08, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.07, 0.16, 8]} />
        <Flat color={CREAM} />
      </mesh>
      <mesh position={[0, -0.26, 0.02]} castShadow>
        <cylinderGeometry args={[0.1, 0.11, 0.22, 8]} />
        <Flat color={BOOT} />
      </mesh>
      <mesh position={[0, -0.35, 0.05]} scale={[1, 0.5, 1.3]}>
        <sphereGeometry args={[0.11, 8, 6]} />
        <Flat color={BOOT} />
      </mesh>
      <mesh position={[0, -0.15, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.1, 0.04, 6, 12]} />
        <Flat color={FUR} />
      </mesh>
    </group>
  )
}

const Avatar = forwardRef(function Avatar({ anim }, ref) {
  const body = useRef()
  const armL = useRef()
  const armR = useRef()
  const legL = useRef()
  const legR = useRef()
  const head = useRef()
  const pom = useRef()

  useFrame((_, dt) => {
    const a = anim.current
    a.t += dt
    const t = a.t
    if (!body.current) return
    if (a.mode === 'walk') {
      const s = Math.sin(t * 11)
      legL.current.rotation.x = s * 0.6
      legR.current.rotation.x = -s * 0.6
      armL.current.rotation.x = -s * 0.55
      armR.current.rotation.x = s * 0.55
      armR.current.rotation.z = 0.35
      body.current.position.y = Math.abs(Math.cos(t * 11)) * 0.07
      head.current.rotation.z = s * 0.05
    } else if (a.mode === 'wave') {
      legL.current.rotation.x *= 0.8
      legR.current.rotation.x *= 0.8
      armL.current.rotation.x *= 0.8
      armR.current.rotation.x = 0
      armR.current.rotation.z = 2.5 + Math.sin(t * 14) * 0.35
      body.current.position.y = Math.abs(Math.sin(t * 7)) * 0.05
      head.current.rotation.z = Math.sin(t * 7) * 0.09
    } else {
      const b = Math.sin(t * 2.2)
      legL.current.rotation.x *= 0.85
      legR.current.rotation.x *= 0.85
      armL.current.rotation.x *= 0.85
      armR.current.rotation.x *= 0.85
      armR.current.rotation.z += (0.35 - armR.current.rotation.z) * 0.15
      body.current.position.y = b * 0.012
      head.current.rotation.z = b * 0.035
    }
    // 방울이 살랑살랑
    pom.current.position.y = 0.5 + Math.sin(t * 4) * 0.03
    pom.current.position.x = 0.68 + Math.sin(t * 3) * 0.02
  })

  return (
    <group ref={ref}>
      {/* 그림자 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.48, 18]} />
        <meshBasicMaterial color="#5a6a80" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <group ref={body}>
        <Leg legRef={legL} x={-0.13} />
        <Leg legRef={legR} x={0.13} />

        {/* 핑크 더플코트 */}
        <mesh position={[0, 0.63, 0]} castShadow>
          <cylinderGeometry args={[0.24, 0.4, 0.52, 12]} />
          <Flat color={PINK} />
        </mesh>
        <mesh position={[0, 0.38, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.39, 0.045, 6, 20]} />
          <Flat color={FUR} />
        </mesh>
        {/* 토글 단추 */}
        {[0.74, 0.6, 0.47].map((y) => (
          <mesh key={y} position={[0.06, y, 0.25 + (0.74 - y) * 0.3]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.05, 2, 6]} />
            <Flat color={FUR} />
          </mesh>
        ))}
        {/* 주머니 */}
        {[-1, 1].map((k) => (
          <mesh key={k} position={[k * 0.2, 0.5, 0.31]} rotation={[-0.3, k * 0.45, 0]}>
            <boxGeometry args={[0.14, 0.09, 0.02]} />
            <Flat color={PINK_D} />
          </mesh>
        ))}
        {/* 폭신한 미니 가방 */}
        <mesh position={[-0.42, 0.5, 0.02]} scale={[1, 0.9, 0.8]} castShadow>
          <icosahedronGeometry args={[0.17, 1]} />
          <Flat color={FUR} />
        </mesh>
        <mesh position={[-0.42, 0.66, 0.02]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.09, 0.015, 4, 10, Math.PI]} />
          <Flat color={PINK_D} />
        </mesh>

        <Arm armRef={armL} side={-1} />
        <Arm armRef={armR} side={1} />

        {/* 도톰한 목도리 */}
        <mesh position={[0, 0.9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.85]} castShadow>
          <torusGeometry args={[0.22, 0.11, 8, 16]} />
          <Flat color={CREAM} />
        </mesh>
        <group position={[-0.12, 0.8, 0.27]} rotation={[0.2, 0, 0.12]}>
          <mesh>
            <boxGeometry args={[0.13, 0.26, 0.07]} />
            <Flat color={CREAM} />
          </mesh>
          {[-0.045, -0.015, 0.015, 0.045].map((x) => (
            <mesh key={x} position={[x, -0.16, 0]}>
              <boxGeometry args={[0.014, 0.06, 0.014]} />
              <Flat color={CREAM} />
            </mesh>
          ))}
        </group>

        {/* 머리 */}
        <group ref={head} position={[0, 1.42, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[HEAD_R, 24, 18]} />
            <Soft color={SKIN} />
          </mesh>
          <Face />
          <Hair />
          <Hat pom={pom} />
        </group>
      </group>
    </group>
  )
})

export default Avatar
