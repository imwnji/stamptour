// 길 그래프 — 아바타는 이 노드/간선을 따라 걷는다.
// 좌표계: x(서 -, 동 +), z(북 -, 남 +).  지도 크기 36 x 54
// 구조: 아래쪽 골목 입구(S) → 가운데 큰길(m0~m3) → 위쪽 원형 광장(P)
//       각 줄(m*)에서 왼쪽/오른쪽 가게 앞(f_*)으로 갈라짐
import { STORES } from './stores.js'

export const MAP_W = 36
export const MAP_H = 54
export const START_NODE = 'S'
export const PATH_HALF = 2.7 // 큰길 반폭
export const PLAZA = { x: 0, z: -20.5, r: 5.6 }

export const NODES = {
  S: [0, 21.5],
  P: [0, -15.5],
}

// 줄마다 큰길 위 분기점
const rows = [...new Set(STORES.map((s) => s.row))].sort()
rows.forEach((r) => {
  const st = STORES.find((s) => s.row === r)
  NODES['m' + r] = [0, st.front[1]]
})
STORES.forEach((s) => {
  NODES['f_' + s.id] = s.front
})

export const EDGES = []
// 큰길: S → m0 → m1 → m2 → m3 → P   (row 0 이 가장 아래)
const spine = ['S', ...rows.map((r) => 'm' + r), 'P']
for (let i = 0; i < spine.length - 1; i++) EDGES.push([spine[i], spine[i + 1]])
STORES.forEach((s) => EDGES.push(['m' + s.row, 'f_' + s.id]))

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
