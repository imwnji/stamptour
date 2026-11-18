// OpenStreetMap 도로 데이터 → src/data/streets.js 생성기
//
//   1) 도로 받기 (Overpass API, 지도 범위만 보냄)
//      curl -s -A "seochon-map-dev" --data-urlencode 'data=[out:json][timeout:50];way["highway"](37.5758,126.9655,37.5838,126.9712);out geom;' https://overpass-api.de/api/interpreter -o osm-ways.json
//   2) node scripts/build-streets.mjs osm-ways.json
//
// 하는 일
//  - 출발점(START_LL)에서 각 매장 앞 길까지 실제 도로를 따라가는 최단 경로를 모아 "걸을 수 있는 길"로
//  - 나머지 골목은 BG_STREETS (바닥 그림에만 흐리게, 실제 지도와 비슷해 보이도록)
//  - 교차로마다 끊어서 꺾은선으로, 1.2m 이내 굴곡은 단순화
// 매장(stores.js)이나 출발점을 바꾸면 다시 실행하세요.
// 지도 데이터 © OpenStreetMap contributors (ODbL)
import fs from 'node:fs'

const START_LL = [37.5764375, 126.9691094] // 플러스 코드 8Q98HXG9+HJH
const PLAZA_LL = [37.58325, 126.96716] // 필운대로 북쪽 끝 (수성동 계곡 쪽) → 광장
const GEO_ORIGIN = [37.57985, 126.9685]
const SKIP = new Set(['primary', 'primary_link', 'trunk', 'construction', 'proposed'])
const BG_PAD = 60 // m. 걸을 수 있는 길 범위 밖으로 배경 골목을 얼마나 더 그릴지

const src = process.argv[2]
if (!src) throw new Error('usage: node scripts/build-streets.mjs osm-ways.json')
const osm = JSON.parse(fs.readFileSync(src, 'utf8'))

const M_LAT = 110950
const M_LNG = 111320 * Math.cos((GEO_ORIGIN[0] * Math.PI) / 180)
const toM = ([lat, lng]) => [(lng - GEO_ORIGIN[1]) * M_LNG, -(lat - GEO_ORIGIN[0]) * M_LAT]
const key = (lat, lng) => lat.toFixed(6) + ',' + lng.toFixed(6)
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

// ── 그래프 ──
const P = {} // key → [lat, lng]
const adj = {} // key → Map(key → { name, hw })
for (const w of osm.elements) {
  if (w.type !== 'way' || !w.geometry || SKIP.has(w.tags.highway)) continue
  const name = w.tags.name || ''
  for (let i = 0; i < w.geometry.length; i++) {
    const g = w.geometry[i]
    const k = key(g.lat, g.lon)
    P[k] = [+g.lat.toFixed(6), +g.lon.toFixed(6)]
    adj[k] ||= new Map()
    if (i) {
      const pk = key(w.geometry[i - 1].lat, w.geometry[i - 1].lon)
      if (pk === k) continue
      adj[k].set(pk, { name, hw: w.tags.highway })
      adj[pk].set(k, { name, hw: w.tags.highway })
    }
  }
}
const M = Object.fromEntries(Object.entries(P).map(([k, ll]) => [k, toM(ll)]))
const ekey = (a, b) => (a < b ? a + '|' + b : b + '|' + a)

function nearestEdge(ll) {
  const p = toM(ll)
  let best = null
  for (const a in adj)
    for (const b of adj[a].keys()) {
      if (a > b) continue
      const A = M[a], B = M[b]
      const dx = B[0] - A[0], dz = B[1] - A[1]
      const L2 = dx * dx + dz * dz || 1e-9
      const u = Math.max(0, Math.min(1, ((p[0] - A[0]) * dx + (p[1] - A[1]) * dz) / L2))
      const d = Math.hypot(p[0] - A[0] - dx * u, p[1] - A[1] - dz * u)
      if (!best || d < best.d) best = { d, a, b, u }
    }
  return best
}

function dijkstra(from) {
  const d = { [from]: 0 }, prev = {}, done = new Set()
  const q = [from]
  while (q.length) {
    let bi = 0
    for (let i = 1; i < q.length; i++) if (d[q[i]] < d[q[bi]]) bi = i
    const u = q.splice(bi, 1)[0]
    if (done.has(u)) continue
    done.add(u)
    for (const v of adj[u].keys()) {
      const alt = d[u] + dist(M[u], M[v])
      if (d[v] === undefined || alt < d[v]) { d[v] = alt; prev[v] = u; q.push(v) }
    }
  }
  return { d, prev }
}

// ── 출발점 → 매장 / 광장 경로 모으기 ──
const storesSrc = fs.readFileSync(new URL('../src/data/stores.js', import.meta.url), 'utf8')
const targets = [...storesSrc.matchAll(/\n\s+id: '([^']+)'[\s\S]*?lat: ([\d.]+), lng: ([\d.]+)/g)].map((m) => ({ id: m[1], ll: [+m[2], +m[3]] }))
targets.push({ id: '(광장)', ll: PLAZA_LL })

const se = nearestEdge(START_LL)
const startK = se.u < 0.5 ? se.a : se.b
const { d, prev } = dijkstra(startK)
const walk = new Set()
for (const t of targets) {
  const e = nearestEdge(t.ll)
  walk.add(ekey(e.a, e.b))
  const end = (d[e.a] ?? Infinity) + e.u * dist(M[e.a], M[e.b]) < (d[e.b] ?? Infinity) + (1 - e.u) * dist(M[e.a], M[e.b]) ? e.a : e.b
  if (d[end] === undefined) { console.warn('경로 없음:', t.id); continue }
  for (let c = end; prev[c]; c = prev[c]) walk.add(ekey(c, prev[c]))
  console.log(`${t.id.padEnd(11)} 길까지 ${e.d.toFixed(1)}m, 출발점에서 ${(d[end] / 1000).toFixed(2)}km`)
}

// ── 간선 집합 → 교차로마다 끊은 꺾은선 ──
function chains(edgeSet) {
  const g = {}
  for (const ek of edgeSet) {
    const [a, b] = ek.split('|')
    ;(g[a] ||= []).push(b)
    ;(g[b] ||= []).push(a)
  }
  const used = new Set()
  const out = []
  const isBreak = (k) => g[k].length !== 2
  const walkFrom = (a, b) => {
    const pts = [a, b]
    used.add(ekey(a, b))
    let p = a, c = b
    while (!isBreak(c)) {
      const n = g[c].find((x) => x !== p)
      if (used.has(ekey(c, n))) break
      used.add(ekey(c, n))
      pts.push(n)
      p = c
      c = n
    }
    return pts
  }
  for (const k in g) if (isBreak(k)) for (const n of g[k]) if (!used.has(ekey(k, n))) out.push(walkFrom(k, n))
  for (const k in g) for (const n of g[k]) if (!used.has(ekey(k, n))) out.push(walkFrom(k, n)) // 고리
  return out
}

// 더글러스-포커 단순화 (끝 점 유지)
function simplify(keys, tol) {
  if (keys.length < 3) return keys
  const A = M[keys[0]], B = M[keys[keys.length - 1]]
  let md = -1, mi = 0
  for (let i = 1; i < keys.length - 1; i++) {
    const p = M[keys[i]]
    const dx = B[0] - A[0], dz = B[1] - A[1]
    const L = Math.hypot(dx, dz) || 1e-9
    const dd = A === B ? dist(p, A) : Math.abs(dz * (p[0] - A[0]) - dx * (p[1] - A[1])) / L
    if (dd > md) { md = dd; mi = i }
  }
  if (md <= tol) return [keys[0], keys[keys.length - 1]]
  return [...simplify(keys.slice(0, mi + 1), tol).slice(0, -1), ...simplify(keys.slice(mi), tol)]
}

const nameOf = (ks) => {
  const c = {}
  for (let i = 1; i < ks.length; i++) {
    const e = adj[ks[i - 1]].get(ks[i])
    if (e?.name) c[e.name] = (c[e.name] || 0) + dist(M[ks[i - 1]], M[ks[i]])
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
}

const walkChains = chains(walk).map((ks) => {
  const name = nameOf(ks)
  // 남→북으로 (큰길 방향을 일정하게)
  if (M[ks[0]][1] < M[ks[ks.length - 1]][1]) ks.reverse()
  return { name, main: name === '필운대로', pts: simplify(ks, 1.2).map((k) => P[k]) }
})

// 배경: 걸을 수 있는 길 범위(+BG_PAD) 안의 나머지 골목
let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
for (const ek of walk) for (const k of ek.split('|')) {
  const [x, z] = M[k]
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z)
}
const inBox = (k) => M[k][0] > x0 - BG_PAD && M[k][0] < x1 + BG_PAD && M[k][1] > z0 - BG_PAD && M[k][1] < z1 + BG_PAD
const bg = new Set()
for (const a in adj) for (const b of adj[a].keys()) if (a < b && !walk.has(ekey(a, b)) && (inBox(a) || inBox(b))) bg.add(ekey(a, b))
const bgChains = chains(bg).map((ks) => simplify(ks, 1.0).map((k) => P[k]))

const fmt = (pts) => '[' + pts.map(([a, b]) => `[${a}, ${b}]`).join(', ') + ']'
const out = `// ─────────────────────────────────────────────────────────────
// 서촌 골목 — scripts/build-streets.mjs 가 OpenStreetMap 도로 데이터로 자동 생성 (직접 고치지 말고 다시 생성)
// 지도 데이터 © OpenStreetMap contributors (ODbL)
//  - STREETS: 출발점 → 매장까지 실제 도로를 따라가는 길 (아바타가 걷는 길), 교차로마다 끊은 위경도 꺾은선
//  - BG_STREETS: 나머지 골목 (바닥 그림에만 흐리게)
// ─────────────────────────────────────────────────────────────

// 위경도 → 미터 변환 기준점 (누하동 부근)
export const GEO_ORIGIN = ${JSON.stringify(GEO_ORIGIN)}

// 아바타 출발 위치 (플러스 코드 8Q98HXG9+HJH) — 가장 가까운 길 위 지점과 이어짐
export const START_LL = ${JSON.stringify(START_LL)}

export const STREETS = [
${walkChains.map((s) => `  { name: ${JSON.stringify(s.name)}, main: ${s.main}, pts: ${fmt(s.pts)} },`).join('\n')}
]

export const BG_STREETS = [
${bgChains.map((p) => `  ${fmt(p)},`).join('\n')}
]
`
fs.writeFileSync(new URL('../src/data/streets.js', import.meta.url), out)
console.log(`길 ${walkChains.length}개 (꼭짓점 ${walkChains.reduce((a, s) => a + s.pts.length, 0)}), 배경 골목 ${bgChains.length}개 → src/data/streets.js`)
