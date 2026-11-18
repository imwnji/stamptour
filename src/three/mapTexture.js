// 바닥 지도 (베타: 코드로 그린 임시 지도) — 눈 덮인 골목, 가운데 큰길, 원형 광장
// AI 생성 + 보정한 지도 이미지가 준비되면 public/map.png 로 넣고 MapScene.jsx 의 Ground 에서 교체하세요.
import { MAP_W, MAP_H, PATH_HALF, PLAZA, NODES } from '../data/map.js'
import { STORES } from '../data/stores.js'

const PX = 40 // 1 unit = 40px
const CW = MAP_W * PX
const CH = MAP_H * PX
const X = (x) => (x + MAP_W / 2) * PX
const Z = (z) => (z + MAP_H / 2) * PX

export const GROUND = '#f7efed'
const PATH = '#f3e6e2'
const EDGE = '#dcc6be'
const SPOT = '#e7d4ce'

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
}

export async function drawMapCanvas() {
  try {
    await Promise.all([document.fonts.load('700 40px Gaegu'), document.fonts.load('400 40px Gaegu')])
  } catch {}
  const cv = document.createElement('canvas')
  cv.width = CW
  cv.height = CH
  const c = cv.getContext('2d')
  const r = rng(1218)

  // ── 눈 바닥 ──
  const g = c.createLinearGradient(0, 0, 0, CH)
  g.addColorStop(0, '#f4eaea')
  g.addColorStop(0.5, GROUND)
  g.addColorStop(1, '#f8f1ee')
  c.fillStyle = g
  c.fillRect(0, 0, CW, CH)
  // 눈 언덕 결
  for (let i = 0; i < 70; i++) {
    const x = r() * CW, y = r() * CH, rx = (2 + r() * 4) * PX, ry = rx * (0.35 + r() * 0.3)
    const gg = c.createRadialGradient(x, y, 0, x, y, rx)
    gg.addColorStop(0, 'rgba(255,255,255,0.55)')
    gg.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = gg
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill()
  }
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = r() < 0.55 ? 'rgba(200,160,160,0.07)' : 'rgba(255,255,255,0.8)'
    c.fillRect(r() * CW, r() * CH, 1 + r() * 2, 1 + r() * 2)
  }

  // ── 가게 앞마당 + 큰길로 이어지는 작은 길 ──
  STORES.forEach((s) => {
    const [fx, fz] = s.front
    c.save()
    c.translate(X(s.building[0]), Z(s.building[1]))
    c.rotate(-s.rot)
    // 건물 바닥 그림자 + 앞마당
    c.fillStyle = 'rgba(190,150,150,0.10)'
    roundRect(c, -3.0 * PX, -2.1 * PX, 6.0 * PX, 4.6 * PX, 30); c.fill()
    c.fillStyle = PATH
    roundRect(c, -2.9 * PX, 1.7 * PX, 5.8 * PX, 2.1 * PX, 26); c.fill()
    c.strokeStyle = EDGE; c.lineWidth = 4
    roundRect(c, -2.75 * PX, 1.85 * PX, 5.5 * PX, 1.8 * PX, 22); c.stroke()
    c.restore()
    // 큰길로 이어지는 길
    c.strokeStyle = PATH; c.lineCap = 'round'; c.lineWidth = 1.6 * PX
    c.beginPath(); c.moveTo(X(fx), Z(fz)); c.lineTo(X(0), Z(fz)); c.stroke()
  })

  // ── 원형 광장 ──
  const px = X(PLAZA.x), pz = Z(PLAZA.z), pr = PLAZA.r * PX
  c.fillStyle = PATH
  c.beginPath(); c.arc(px, pz, pr, 0, 7); c.fill()
  // ── 큰길 ──
  const top = Z(PLAZA.z + PLAZA.r * 0.6)
  c.fillRect(X(-PATH_HALF), top, PATH_HALF * 2 * PX, CH - top)
  // 큰길 테두리 (돌 두 줄)
  c.strokeStyle = EDGE; c.lineWidth = 5
  for (const k of [-1, 1]) {
    for (const off of [0.2, 0.5]) {
      const x = X(k * (PATH_HALF - off))
      c.beginPath(); c.moveTo(x, CH); c.lineTo(x, Z(PLAZA.z + Math.sqrt(PLAZA.r ** 2 - (PATH_HALF - off) ** 2) - off * 0.2)); c.stroke()
    }
  }
  c.beginPath(); c.arc(px, pz, pr - 0.2 * PX, Math.PI * 0.5 + 0.62, Math.PI * 2.5 - 0.62); c.stroke()
  c.beginPath(); c.arc(px, pz, pr - 0.5 * PX, Math.PI * 0.5 + 0.68, Math.PI * 2.5 - 0.68); c.stroke()
  c.beginPath(); c.arc(px, pz, 2.6 * PX, 0, 7); c.stroke()
  // 광장 바닥 무늬
  c.strokeStyle = 'rgba(200,170,160,0.35)'; c.lineWidth = 3
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    c.beginPath(); c.moveTo(px + Math.cos(a) * 2.7 * PX, pz + Math.sin(a) * 2.7 * PX); c.lineTo(px + Math.cos(a) * (pr - 0.6 * PX), pz + Math.sin(a) * (pr - 0.6 * PX)); c.stroke()
  }

  // ── 길 위 동글동글 디딤돌 무늬 + 발자국 ──
  for (let i = 0; i < 160; i++) {
    const x = (r() - 0.5) * (PATH_HALF * 2 - 1.2), z = PLAZA.z + r() * (MAP_H / 2 - PLAZA.z)
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) > PLAZA.r - 0.8 && z < PLAZA.z + 3) continue
    c.fillStyle = SPOT
    c.globalAlpha = 0.18 + r() * 0.25
    c.beginPath(); c.ellipse(X(x), Z(z), (0.25 + r() * 0.35) * PX, (0.18 + r() * 0.22) * PX, 0, 0, 7); c.fill()
  }
  c.globalAlpha = 1
  c.fillStyle = 'rgba(205,175,168,0.45)'
  for (let z = NODES.S[1] + 2; z > PLAZA.z + 2; z -= 0.95) {
    const k = Math.round(z / 0.95) % 2 ? 1 : -1
    c.beginPath(); c.ellipse(X(k * 0.28 + Math.sin(z * 0.3) * 0.4), Z(z), 0.13 * PX, 0.22 * PX, 0, 0, 7); c.fill()
  }

  // 길가 눈 쌓인 결
  c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.35 * PX; c.lineCap = 'round'
  for (const k of [-1, 1]) {
    c.beginPath()
    for (let z = MAP_H / 2; z > PLAZA.z + 4; z -= 0.5) {
      const x = X(k * (PATH_HALF + 0.35 + Math.sin(z * 1.3) * 0.12))
      z === MAP_H / 2 ? c.moveTo(x, Z(z)) : c.lineTo(x, Z(z))
    }
    c.stroke()
  }

  // ── 라벨 ──
  const label = (text, x, z, size, color = '#9a7a70') => {
    c.save(); c.translate(X(x), Z(z))
    c.font = `700 ${size}px Gaegu, 'Gowun Dodum', sans-serif`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.strokeText(text, 0, 0)
    c.fillStyle = color; c.fillText(text, 0, 0)
    c.restore()
  }
  label('서촌 골목 입구', 0, 26, 44, '#b0646a')
  label('겨울 광장', 0, PLAZA.z + 4.2, 34, '#b49088')

  return cv
}
