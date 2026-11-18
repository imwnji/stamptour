// 바닥 지도 (코드로 그린 지도) — 눈 덮인 바닥 위에 실제 서촌 골목(streets.js)을 단순화해서 그림
// AI 생성 + 보정한 지도 이미지가 준비되면 public/map.png 로 넣고 MapScene.jsx 의 Ground 에서 교체하세요.
import { MAP_W, MAP_H, PLAZA, STREETS, BG_STREETS, BG_HALF, NODES, START_NODE } from '../data/map.js'
import { STORES } from '../data/stores.js'
import { BUILD_SCALE } from '../data/layout.js'

const PX = 20 // 1 unit = 20px (지도가 커서 모바일 텍스처 메모리 고려, 4096px 이하)
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

function polyline(c, pts) {
  c.beginPath()
  pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))))
}

// 길을 따라 t(거리) 위치의 좌표와 방향
function along(s, t) {
  let i = 0
  while (i < s.pts.length - 2 && s.cum[i + 1] < t) i++
  const a = s.pts[i], b = s.pts[i + 1]
  const L = s.cum[i + 1] - s.cum[i] || 1e-9
  const u = Math.max(0, Math.min(1, (t - s.cum[i]) / L))
  return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L }
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
  const area = MAP_W * MAP_H

  // ── 눈 바닥 ──
  const g = c.createLinearGradient(0, 0, 0, CH)
  g.addColorStop(0, '#f4eaea')
  g.addColorStop(0.5, GROUND)
  g.addColorStop(1, '#f8f1ee')
  c.fillStyle = g
  c.fillRect(0, 0, CW, CH)
  // 눈 언덕 결
  for (let i = 0; i < area / 28; i++) {
    const x = r() * CW, y = r() * CH, rx = (2 + r() * 4) * PX, ry = rx * (0.35 + r() * 0.3)
    const gg = c.createRadialGradient(x, y, 0, x, y, rx)
    gg.addColorStop(0, 'rgba(255,255,255,0.55)')
    gg.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = gg
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill()
  }
  for (let i = 0; i < area * 4; i++) {
    c.fillStyle = r() < 0.55 ? 'rgba(200,160,160,0.07)' : 'rgba(255,255,255,0.8)'
    c.fillRect(r() * CW, r() * CH, 1 + r() * 1.5, 1 + r() * 1.5)
  }

  // ── 가게 바닥 그림자 + 앞마당 + 길로 이어지는 작은 길 ──
  const k = BUILD_SCALE
  STORES.forEach((s) => {
    c.save()
    c.translate(X(s.building[0]), Z(s.building[1]))
    c.rotate(-s.rot)
    c.fillStyle = 'rgba(190,150,150,0.10)'
    roundRect(c, -3.0 * k * PX, -2.1 * k * PX, 6.0 * k * PX, 4.6 * k * PX, 0.75 * k * PX); c.fill()
    c.fillStyle = PATH
    roundRect(c, -2.9 * k * PX, 1.7 * k * PX, 5.8 * k * PX, 2.1 * k * PX, 0.65 * k * PX); c.fill()
    c.strokeStyle = EDGE; c.lineWidth = 0.1 * PX
    roundRect(c, -2.75 * k * PX, 1.85 * k * PX, 5.5 * k * PX, 1.8 * k * PX, 0.55 * k * PX); c.stroke()
    c.restore()
    c.strokeStyle = PATH; c.lineCap = 'round'; c.lineWidth = 1.3 * PX
    c.beginPath(); c.moveTo(X(s.front[0]), Z(s.front[1])); c.lineTo(X(s.attach[0]), Z(s.attach[1])); c.stroke()
  })

  c.lineJoin = 'round'
  c.lineCap = 'round'
  // ── 배경 골목 (실제 지도의 나머지 골목, 걸을 수는 없고 흐리게) ──
  c.strokeStyle = 'rgba(222,202,195,0.38)'
  c.lineWidth = (BG_HALF * 2 + 0.16) * PX
  BG_STREETS.forEach((pts) => { polyline(c, pts); c.stroke() })
  c.strokeStyle = 'rgba(246,237,234,0.85)'
  c.lineWidth = BG_HALF * 2 * PX
  BG_STREETS.forEach((pts) => { polyline(c, pts); c.stroke() })

  const alleys = STREETS.filter((s) => !s.main)
  const mains = STREETS.filter((s) => s.main)

  // ── 골목: 테두리 → 바닥 순으로 한꺼번에 (교차로가 자연스럽게 이어지게) ──
  c.strokeStyle = EDGE
  alleys.forEach((s) => { c.lineWidth = (s.half * 2 + 0.22) * PX; polyline(c, s.pts); c.stroke() })
  c.strokeStyle = PATH
  alleys.forEach((s) => { c.lineWidth = s.half * 2 * PX; polyline(c, s.pts); c.stroke() })

  // ── 원형 광장 (큰길 북쪽 끝) ──
  const px = X(PLAZA.x), pz = Z(PLAZA.z), pr = PLAZA.r * PX
  c.fillStyle = EDGE
  c.beginPath(); c.arc(px, pz, pr + 0.12 * PX, 0, 7); c.fill()
  c.fillStyle = PATH
  c.beginPath(); c.arc(px, pz, pr, 0, 7); c.fill()

  // ── 큰길: 테두리 돌 두 줄 (굵기를 줄여가며 겹쳐 그리기) ──
  mains.forEach((s) => {
    const w = s.half * 2
    ;[[EDGE, w], [PATH, w - 0.32], [EDGE, w - 0.52], [PATH, w - 0.84]].forEach(([col, lw]) => {
      c.strokeStyle = col; c.lineWidth = lw * PX; polyline(c, s.pts); c.stroke()
    })
  })
  // 광장 무늬
  c.strokeStyle = EDGE; c.lineWidth = 0.12 * PX
  c.beginPath(); c.arc(px, pz, pr - 0.3 * PX, 0, 7); c.stroke()
  c.beginPath(); c.arc(px, pz, 2.6 * PX, 0, 7); c.stroke()
  c.strokeStyle = 'rgba(200,170,160,0.35)'; c.lineWidth = 0.08 * PX
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    c.beginPath(); c.moveTo(px + Math.cos(a) * 2.7 * PX, pz + Math.sin(a) * 2.7 * PX); c.lineTo(px + Math.cos(a) * (pr - 0.6 * PX), pz + Math.sin(a) * (pr - 0.6 * PX)); c.stroke()
  }

  // ── 길 위 동글동글 디딤돌 무늬 + 큰길 발자국 ──
  STREETS.forEach((s) => {
    const n = Math.round(s.len * s.half * 0.9)
    for (let i = 0; i < n; i++) {
      const p = along(s, r() * s.len)
      const off = (r() - 0.5) * (s.half * 2 - 0.9)
      c.fillStyle = SPOT
      c.globalAlpha = 0.18 + r() * 0.25
      c.beginPath(); c.ellipse(X(p.x - p.dz * off), Z(p.z + p.dx * off), (0.22 + r() * 0.3) * PX, (0.16 + r() * 0.2) * PX, 0, 0, 7); c.fill()
    }
  })
  c.globalAlpha = 1
  c.fillStyle = 'rgba(205,175,168,0.45)'
  mains.forEach((s) => {
    for (let t = 1.5, i = 0; t < s.len - 1; t += 0.95, i++) {
      const p = along(s, t)
      const off = (i % 2 ? 0.28 : -0.28) + Math.sin(t * 0.3) * 0.4
      c.save()
      c.translate(X(p.x - p.dz * off), Z(p.z + p.dx * off))
      c.rotate(Math.atan2(p.dz, p.dx) + Math.PI / 2)
      c.beginPath(); c.ellipse(0, 0, 0.13 * PX, 0.22 * PX, 0, 0, 7); c.fill()
      c.restore()
    }
  })

  // ── 라벨 ──
  const label = (text, x, z, size, color = '#9a7a70', ang = 0) => {
    c.save(); c.translate(X(x), Z(z)); c.rotate(ang)
    c.font = `700 ${size * PX}px Gaegu, 'Gowun Dodum', sans-serif`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 0.22 * PX; c.strokeStyle = 'rgba(255,255,255,0.9)'; c.strokeText(text, 0, 0)
    c.fillStyle = color; c.fillText(text, 0, 0)
    c.restore()
  }
  // 길 이름: 충분히 긴 구간 가운데, 길 방향으로 (글자가 뒤집히지 않게), 같은 이름은 멀리 떨어졌을 때만 다시
  const named = []
  ;[...STREETS].sort((a, b) => b.len - a.len).forEach((s) => {
    if (!s.name || s.len < (s.main ? 9 : 6)) return
    const at = s.main && s.len > 40 ? [0.3, 0.75] : [0.5]
    at.forEach((f) => {
      const q = along(s, s.len * f)
      if (named.some((n) => n.name === s.name && Math.hypot(n.x - q.x, n.z - q.z) < 22)) return
      named.push({ name: s.name, x: q.x, z: q.z })
      const p = along(s, s.len * f)
      let ang = Math.atan2(p.dz, p.dx)
      if (ang > Math.PI / 2) ang -= Math.PI
      if (ang < -Math.PI / 2) ang += Math.PI
      label(s.name, p.x, p.z, s.main ? 0.8 : 0.62, '#b49088', ang)
    })
  })
  const st = NODES[START_NODE]
  label('서촌 골목 입구', st[0], st[1] + 1.6, 1.0, '#b0646a')
  label('지도 데이터 © OpenStreetMap contributors', -MAP_W / 2 + 7, MAP_H / 2 - 0.8, 0.45, 'rgba(150,120,110,0.7)')
  label('수성동 계곡 가는 길', PLAZA.x, PLAZA.z - PLAZA.r - 1.1, 0.8, '#b49088')

  return cv
}
