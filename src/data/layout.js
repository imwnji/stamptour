// ─────────────────────────────────────────────────────────────
// 위경도 → 월드(칸) 변환 + 매장 자동 배치 + 길 그래프 생성
//  1) 위경도를 미터로 바꾼 뒤 칸으로 균일 축소 (실제 지도와 길 모양이 같도록 왜곡 없음)
//  2) 매장마다 가장 가까운 "걷는 길"(streets.js STREETS) 지점을 찾고 길 옆에 건물을 세움
//     - 동서로 난 길: 되도록 길 북쪽 (정면이 카메라 쪽 = 남쪽을 보도록)
//     - 남북으로 난 길: 실제로 있는 쪽, 정면은 길 쪽으로 최대 ~60°까지만 돌림
//  3) 다른 길·다른 건물과 겹치면 길을 따라 조금씩 옮겨 빈자리를 찾음 (그래도 없으면 반대편)
//  4) 길 꼭짓점(같은 위경도 = 같은 노드) + 매장 입구 + 출발점으로 그래프 생성 → map.js 의 findPath
// ─────────────────────────────────────────────────────────────
import { STREETS, BG_STREETS, GEO_ORIGIN, START_LL } from './streets.js'

const M_LAT = 110950
const M_LNG = 111320 * Math.cos((GEO_ORIGIN[0] * Math.PI) / 180)

export const SCALE = 0.2 // 1m → 0.2칸 (1칸 = 5m)

export const HALF_MAIN = 1.7 // 큰길(필운대로) 반폭
export const HALF_ALLEY = 1.15 // 골목 반폭
export const BUILD_SCALE = 0.8 // 가게 모델 크기
const SETBACK = 4.0 * BUILD_SCALE // 길 가장자리 → 건물 중심
const FRONT_DIST = 2.9 * BUILD_SCALE // 건물 중심 → 아바타가 서는 자리
const GAP = 6.2 * BUILD_SCALE // 건물 중심 간 최소 거리
const CLEAR = 2.2 * BUILD_SCALE // 건물 중심 → 다른 길 가장자리 최소 거리
const END_PAD = 1.2
const MAX_TURN = 1.05 // 건물 정면이 남쪽(카메라)에서 돌아갈 수 있는 최대 각도
const MARGIN = 7 // 지도 가장자리 여백

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const llKey = (ll) => 'v' + ll[0].toFixed(6) + ',' + ll[1].toFixed(6)

export function project([lat, lng]) {
  return [(lng - GEO_ORIGIN[1]) * M_LNG * SCALE, -(lat - GEO_ORIGIN[0]) * M_LAT * SCALE]
}

// ── 꺾은선 도우미 ──
function polyInfo(pts) {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, cum, len: cum[cum.length - 1] }
}
function closest(poly, p) {
  let best = null
  for (let i = 0; i < poly.pts.length - 1; i++) {
    const a = poly.pts[i], b = poly.pts[i + 1]
    const dx = b[0] - a[0], dz = b[1] - a[1]
    const L2 = dx * dx + dz * dz || 1e-9
    const u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2, 0, 1)
    const q = [a[0] + dx * u, a[1] + dz * u]
    const d = Math.hypot(p[0] - q[0], p[1] - q[1])
    if (!best || d < best.d) best = { d, t: poly.cum[i] + u * Math.sqrt(L2), pos: q }
  }
  return best
}
export function pointAt(poly, t) {
  t = clamp(t, 0, poly.len)
  let i = 0
  while (i < poly.pts.length - 2 && poly.cum[i + 1] < t) i++
  const a = poly.pts[i], b = poly.pts[i + 1]
  const L = poly.cum[i + 1] - poly.cum[i] || 1e-9
  const u = (t - poly.cum[i]) / L
  return { pos: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], dir: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }
}

export function layoutStores(stores) {
  // 1) 길 투영 (꼭짓점은 위경도가 같으면 같은 노드)
  const streets = STREETS.map((s, i) => {
    const poly = polyInfo(s.pts.map(project))
    const items = s.pts.map((ll, k) => ({ t: poly.cum[k], id: llKey(ll), pos: poly.pts[k] }))
    return { id: 's' + i, name: s.name, main: !!s.main, poly, half: s.main ? HALF_MAIN : HALF_ALLEY, items }
  })
  // 같은 노드는 같은 좌표 배열을 공유 (나중에 가운데 정렬할 때 한 번만 옮기도록)
  const shared = {}
  streets.forEach((s) => s.items.forEach((it) => (it.pos = shared[it.id] ||= it.pos)))
  streets.forEach((s) => s.items.forEach((it, k) => (s.poly.pts[k] = it.pos)))

  const segDist = (p, skip) => {
    let best = Infinity
    for (const s of streets) {
      if (s === skip) continue
      const c = closest(s.poly, p)
      best = Math.min(best, c.d - s.half)
    }
    return best
  }

  // 2) 매장 → 가장 가까운 길 (+ 손보정 shift/flip)
  stores.forEach((s) => {
    const P = project([s.lat, s.lng])
    // 가까운 길 순서대로 후보 (교차로 근처라 가장 가까운 길에 자리가 없으면 다음 길)
    const cands = streets.map((st) => ({ st, c: closest(st.poly, P) })).sort((a, b) => a.c.d - b.c.d)
    s._cands = cands
      .filter((x) => x.c.d < cands[0].c.d + 4)
      .map(({ st, c }) => {
        const { dir } = pointAt(st.poly, c.t)
        const cross = dir[0] * (P[1] - c.pos[1]) - dir[1] * (P[0] - c.pos[0])
        let side = cross >= 0 ? 1 : -1
        if (Math.abs(dir[0]) > 0.6 && side * dir[0] > 0) side = -side // 동서로 난 길 → 북쪽에
        if (s.flip) side = -side
        return { st, side, t: c.t + (s.shift || 0) }
      })
    Object.assign(s, { _st: s._cands[0].st, _side: s._cands[0].side, _t: s._cands[0].t })
  })

  // 3) 빈자리 찾기: 원래 자리에서 가까운 순서로 길을 따라 탐색
  const placed = []
  const place = (st, t, side) => {
    const { pos, dir } = pointAt(st.poly, t)
    const n = [-dir[1] * side, dir[0] * side] // 길 → 건물
    const off = st.half + SETBACK
    const b = [pos[0] + n[0] * off, pos[1] + n[1] * off]
    const rot = clamp(Math.atan2(-n[0], -n[1]), -MAX_TURN, MAX_TURN)
    return { pos, b, rot }
  }
  // 자기 길도 포함해서 검사 (휘어진 길이 건물을 다시 지나가는 경우까지 막음)
  const ok = (st, t, cand, clear) =>
    t >= END_PAD && t <= st.poly.len - END_PAD &&
    segDist(cand.b, null) >= clear &&
    placed.every((o) => Math.hypot(o[0] - cand.b[0], o[1] - cand.b[1]) >= GAP)
  // 자리가 좁은 곳(다른 길이 가까운 매장)부터
  const room = (s) => segDist(place(s._st, s._t, s._side).b, null)
  const order = [...stores].sort((a, b) => room(a) - room(b))
  order.forEach((s) => {
    let st = s._st
    let found = null
    // 1차: 넉넉한 간격, 2차: 좁은 골목이라 간격을 줄여서
    for (const clear of [CLEAR, CLEAR * 0.55]) {
      for (const cd of s._cands) {
        for (let k = 0; k <= 60 && !found; k++) {
          const dt = k === 0 ? 0 : Math.ceil(k / 2) * 0.5 * (k % 2 ? 1 : -1)
          for (const side of [cd.side, -cd.side]) {
            if (side !== cd.side && k < 12) continue // 반대편은 근처에 자리가 없을 때만
            const c = place(cd.st, cd.t + dt, side)
            if (ok(cd.st, cd.t + dt, c, clear)) { found = { ...c, t: cd.t + dt }; st = cd.st; break }
          }
        }
        if (found) break
      }
      if (found) break
    }
    if (!found) {
      console.warn('[layout] 빈자리를 못 찾음:', s.id)
      const t = clamp(s._t, END_PAD, st.poly.len - END_PAD)
      found = { ...place(st, t, s._side), t }
    }
    placed.push(found.b)
    s.building = found.b
    s.rot = found.rot
    s.front = [s.building[0] + Math.sin(s.rot) * FRONT_DIST, s.building[1] + Math.cos(s.rot) * FRONT_DIST]
    s.side = s.rot > 0.05 ? 'R' : s.rot < -0.05 ? 'L' : s.id.length % 2 ? 'L' : 'R' // 소품 좌우 배치용
    s.attach = found.pos
    st.items.push({ t: found.t, id: 'a_' + s.id, pos: found.pos })
  })

  // 출발점: 가장 가까운 길 위 지점(a_start) ↔ 출발 위치(S)
  const S = project(START_LL)
  let sBest = null
  streets.forEach((st) => {
    const c = closest(st.poly, S)
    if (!sBest || c.d < sBest.c.d) sBest = { st, c }
  })
  sBest.st.items.push({ t: sBest.c.t, id: 'a_start', pos: sBest.c.pos })

  // 4) 그래프
  const nodes = {}
  const edges = []
  streets.forEach((s) => {
    s.items.sort((a, b) => a.t - b.t)
    s.items.forEach((it) => (nodes[it.id] = it.pos))
    for (let i = 0; i < s.items.length - 1; i++) {
      if (s.items[i].id !== s.items[i + 1].id) edges.push([s.items[i].id, s.items[i + 1].id])
    }
  })
  stores.forEach((s) => {
    nodes['f_' + s.id] = s.front
    edges.push(['a_' + s.id, 'f_' + s.id])
  })
  nodes.S = S
  edges.push(['a_start', 'S'])

  // 5) 지도 범위 → 가운데 정렬
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  const grow = ([x, z], r = 0) => {
    x0 = Math.min(x0, x - r); x1 = Math.max(x1, x + r)
    z0 = Math.min(z0, z - r); z1 = Math.max(z1, z + r)
  }
  streets.forEach((s) => s.poly.pts.forEach((p) => grow(p, 2)))
  stores.forEach((s) => grow(s.building, 4))
  grow(S, 3)
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2
  const seen = new Set()
  const shift = (p) => { if (!seen.has(p)) { seen.add(p); p[0] -= cx; p[1] -= cz } }
  streets.forEach((s) => s.poly.pts.forEach(shift))
  Object.values(nodes).forEach(shift)
  stores.forEach((s) => { shift(s.building); shift(s.front); shift(s.attach) })
  streets.forEach((s) => s.items.forEach((it) => shift(it.pos)))
  const bg = BG_STREETS.map((pts) => pts.map(project).map(([x, z]) => [x - cx, z - cz]))

  stores.forEach((s) => { delete s._st; delete s._side; delete s._t; delete s._cands })

  return {
    nodes,
    edges,
    streets: streets.map((s) => ({ id: s.id, name: s.name, main: s.main, half: s.half, pts: s.poly.pts, len: s.poly.len, cum: s.poly.cum })),
    bg,
    width: Math.ceil(x1 - x0 + MARGIN * 2),
    height: Math.ceil(z1 - z0 + MARGIN * 2),
  }
}
