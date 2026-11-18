// 바닥 지도 (코드로 그린 지도) — 눈 덮인 바닥 위에 실제 서촌 골목(streets.js)을 단순화해서 그림
// AI 생성 + 보정한 지도 이미지가 준비되면 public/map.png 로 넣고 MapScene.jsx 의 Ground 에서 교체하세요.
import { MAP_W, MAP_H, PLAZA, STREETS, BG_STREETS, BG_HALF, NODES, START_NODE } from '../data/map.js'
import { STORES } from '../data/stores.js'
import { BUILD_SCALE } from '../data/layout.js'
import { PAL } from './palette.js'

const PX = 20 // 1 unit = 20px (지도가 커서 모바일 텍스처 메모리 고려, 4096px 이하)
const CW = MAP_W * PX
const CH = MAP_H * PX
const X = (x) => (x + MAP_W / 2) * PX
const Z = (z) => (z + MAP_H / 2) * PX

export const GROUND = PAL.snow
const PATH = PAL.path // 스탬프 투어 길·광장·앞마당: 윤곽선 없이 한 가지 불투명 색 → 겹쳐도 한 덩어리로 보임

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
  g.addColorStop(0, '#EEF1EE')
  g.addColorStop(0.5, GROUND)
  g.addColorStop(1, '#F6F3EC')
  c.fillStyle = g
  c.fillRect(0, 0, CW, CH)
  // 눈 언덕 결
  for (let i = 0; i < area / 28; i++) {
    const x = r() * CW, y = r() * CH, rx = (2 + r() * 4) * PX, ry = rx * (0.35 + r() * 0.3)
    const gg = c.createRadialGradient(x, y, 0, x, y, rx)
    gg.addColorStop(0, 'rgba(255,255,253,0.6)')
    gg.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = gg
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill()
  }
  for (let i = 0; i < area * 4; i++) {
    c.fillStyle = r() < 0.55 ? 'rgba(167,187,197,0.12)' : 'rgba(255,255,253,0.8)' // 눈 그림자 점 + 반짝임
    c.fillRect(r() * CW, r() * CH, 1 + r() * 1.5, 1 + r() * 1.5)
  }

  // ── 가게 바닥 그림자 + 앞마당 + 길로 이어지는 작은 길 ──
  const k = BUILD_SCALE
  STORES.forEach((s) => {
    c.save()
    c.translate(X(s.building[0]), Z(s.building[1]))
    c.rotate(-s.rot)
    c.fillStyle = 'rgba(167,187,197,0.28)' // 건물 둘레 옅은 푸른 눈 그림자
    roundRect(c, -3.0 * k * PX, -2.1 * k * PX, 6.0 * k * PX, 4.6 * k * PX, 1.2 * k * PX); c.fill()
    c.restore()
  })

  c.lineJoin = 'round'
  c.lineCap = 'round'
  // ── 배경 골목 (실제 지도의 나머지 골목, 걸을 수는 없고 흐리게) ──
  c.strokeStyle = PAL.pathSoft
  c.lineWidth = BG_HALF * 2 * PX
  BG_STREETS.forEach((pts) => { polyline(c, pts); c.stroke() })

  // ── 스탬프 투어 길: 큰길·골목·광장·가게 앞마당을 같은 색으로 한 번에 (윤곽선 없음) ──
  c.strokeStyle = PATH
  c.fillStyle = PATH
  STREETS.forEach((s) => { c.lineWidth = s.half * 2 * PX; polyline(c, s.pts); c.stroke() })
  STORES.forEach((s) => {
    c.lineWidth = 1.4 * PX
    c.beginPath(); c.moveTo(X(s.front[0]), Z(s.front[1])); c.lineTo(X(s.attach[0]), Z(s.attach[1])); c.stroke()
    c.save()
    c.translate(X(s.building[0]), Z(s.building[1]))
    c.rotate(-s.rot)
    roundRect(c, -2.9 * k * PX, 1.6 * k * PX, 5.8 * k * PX, 2.3 * k * PX, 1.0 * k * PX); c.fill()
    c.restore()
  })
  const px = X(PLAZA.x), pz = Z(PLAZA.z), pr = PLAZA.r * PX
  c.beginPath(); c.arc(px, pz, pr, 0, 7); c.fill()

  // ── 큰길 위 발자국 (같은 계열 색, 은은하게) ──
  c.fillStyle = 'rgba(176,152,118,0.32)'
  STREETS.filter((s) => s.main).forEach((s) => {
    for (let t = 1.5, i = 0; t < s.len - 1; t += 0.95, i++) {
      const p = along(s, t)
      const off = (i % 2 ? 0.26 : -0.26) + Math.sin(t * 0.3) * 0.35
      c.save()
      c.translate(X(p.x - p.dz * off), Z(p.z + p.dx * off))
      c.rotate(Math.atan2(p.dz, p.dx) + Math.PI / 2)
      c.beginPath(); c.ellipse(0, 0, 0.13 * PX, 0.22 * PX, 0, 0, 7); c.fill()
      c.restore()
    }
  })

  // ── 라벨 ──
  const label = (text, x, z, size, color = PAL.woodDark, ang = 0) => {
    c.save(); c.translate(X(x), Z(z)); c.rotate(ang)
    c.font = `700 ${size * PX}px Gaegu, 'Gowun Dodum', sans-serif`
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineWidth = 0.22 * PX; c.strokeStyle = 'rgba(244,241,232,0.95)'; c.strokeText(text, 0, 0)
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
      label(s.name, p.x, p.z, s.main ? 0.8 : 0.62, PAL.woodDark, ang)
    })
  })
  const st = NODES[START_NODE]
  label('서촌 골목 입구', st[0], st[1] + 1.6, 1.0, PAL.roof)
  label('지도 데이터 © OpenStreetMap contributors', -MAP_W / 2 + 7, MAP_H / 2 - 0.8, 0.45, 'rgba(126,95,74,0.65)')
  label('수성동 계곡 가는 길', PLAZA.x, PLAZA.z - PLAZA.r - 1.1, 0.8, PAL.woodDark)

  return cv
}
