// 길 그래프 — 아바타는 이 노드/간선을 따라 걷는다. (layout.js 에서 위경도로부터 자동 생성)
// 좌표계: x(서 -, 동 +), z(북 -, 남 +).  1칸 = 5m (실제 지도와 같은 비율)
// 구조: 출발 위치(S, 8Q98HXG9+HJH · 필운대로 남쪽 초입) → 필운대로 → 북쪽 끝 광장(P, 수성동 계곡 쪽)
//       각 골목은 교차로 노드로 이어지고, 매장마다 길 위 지점(a_매장) → 가게 앞(f_매장)
import { LAYOUT } from './stores.js'
import { HALF_MAIN } from './layout.js'

export const MAP_W = LAYOUT.width
export const MAP_H = LAYOUT.height
export const STREETS = LAYOUT.streets
export const NODES = LAYOUT.nodes
export const EDGES = LAYOUT.edges
export const PATH_HALF = HALF_MAIN

export const BG_STREETS = LAYOUT.bg // 배경 골목 (그림에만)
export const BG_HALF = 0.4
export const START_NODE = 'S' // 출발 위치 (streets.js 의 START_LL)

// 큰길(필운대로)의 가장 북쪽 끝에 원형 광장 (수성동 계곡 쪽, 길 끝이 광장 안쪽으로 조금 들어가게)
let north = null
STREETS.filter((s) => s.main).forEach((s) => {
  ;[[0, 1], [s.pts.length - 1, s.pts.length - 2]].forEach(([i, j]) => {
    if (!north || s.pts[i][1] < north.end[1]) north = { end: s.pts[i], prev: s.pts[j] }
  })
})
const { end, prev } = north
const d = Math.hypot(end[0] - prev[0], end[1] - prev[1])
const R = 4.2
export const PLAZA = { x: end[0] + ((end[0] - prev[0]) / d) * R * 0.55, z: end[1] + ((end[1] - prev[1]) / d) * R * 0.55, r: R }

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

const ADJ = {}
EDGES.forEach(([a, b]) => {
  ;(ADJ[a] ||= []).push(b)
  ;(ADJ[b] ||= []).push(a)
})

// 다익스트라 최단 경로 → 좌표 배열
export function findPath(from, to) {
  if (from === to) return [NODES[from]]
  const d = { [from]: 0 }
  const prev = {}
  const q = new Set(Object.keys(NODES))
  while (q.size) {
    let u = null
    for (const n of q) if (d[n] !== undefined && (u === null || d[n] < d[u])) u = n
    if (u === null) break
    q.delete(u)
    if (u === to) break
    for (const v of ADJ[u] || []) {
      const alt = d[u] + dist(NODES[u], NODES[v])
      if (d[v] === undefined || alt < d[v]) {
        d[v] = alt
        prev[v] = u
      }
    }
  }
  const path = []
  let c = to
  while (c) {
    path.unshift(NODES[c])
    c = prev[c]
  }
  return path
}

// 점 → 가장 가까운 길까지 거리 (소품 배치에서 길 위를 피할 때)
export function distToStreets(x, z, withBg = false) {
  let best = Infinity
  const list = withBg ? [...STREETS, ...BG_STREETS.map((pts) => ({ pts, half: BG_HALF }))] : STREETS
  for (const s of list) {
    for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1]
      const dx = b[0] - a[0], dz = b[1] - a[1]
      const L2 = dx * dx + dz * dz || 1e-9
      const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2))
      best = Math.min(best, Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u) - s.half)
    }
  }
  return best
}
