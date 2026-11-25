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

// 길 정리: 한 길처럼 보이게
//  - 막다른 짧은 가지(6칸 미만) 제거 → 큰길 옆에 혹처럼 튀어나온 부분 없앰
//  - 막다른 길이 다른 길과 거의 겹쳐 나란히 가면(전 구간이 붙어 있으면) 짧은 쪽 제거 → 두 줄이 한 덩어리로
//  막다른 길만 지우므로 남은 길끼리의 연결은 그대로, 지워진 길에 붙어 있던 가게는 가장 가까운 남은 길로 옮겨감
function tidyStreets(list) {
  let arr = list.map((s) => {
    const poly = polyInfo(s.pts.map(project))
    return { s: { ...s }, poly, half: s.main ? HALF_MAIN : HALF_ALLEY, k0: llKey(s.pts[0]), k1: llKey(s.pts[s.pts.length - 1]) }
  })
  for (let changed = true; changed && arr.length > 1; ) {
    changed = false
    const deg = {}
    arr.forEach((a) => { deg[a.k0] = (deg[a.k0] || 0) + 1; deg[a.k1] = (deg[a.k1] || 0) + 1 })
    const ends = arr.filter((a) => a.k0 !== a.k1 && (deg[a.k0] === 1 || deg[a.k1] === 1)).sort((a, b) => a.poly.len - b.poly.len)
    for (const a of ends) {
      let redundant = true, along = null
      for (let t = 0; t <= a.poly.len && redundant; t += 0.5) {
        const p = pointAt(a.poly, t).pos
        let best = null
        for (const o of arr) {
          if (o === a) continue
          const c = closest(o.poly, p)
          if (!best || c.d < best.d) best = { d: c.d, o }
        }
        if (!best || best.d > a.half + best.o.half + 2.3) redundant = false // 바로 옆(약 4.5칸 안)을 나란히 가는 막다른 길
        else along = best.o
      }
      if (a.poly.len < 6 || redundant) {
        arr = arr.filter((o) => o !== a)
        if (redundant && a.s.main && along) { along.s.main = true; along.half = HALF_MAIN } // 큰길 이름 이어받기
        changed = true
        break
      }
    }
  }
  return arr.map((a) => a.s)
}

// 골목 곧게 펴기: 큰길(main)은 그대로, 골목은 교차로~교차로(또는 막다른 끝)를 직선으로
//  - 꼭짓점을 줄이는 Douglas-Peucker: 직선에서 tol 칸 넘게 벗어나는 큰 꺾임만 남김 → 거의 다 한 줄 직선
//  - 같은 교차로로 되돌아오는 고리 골목은 가장 먼 점에서 나눠서 각각 직선으로
//  - 양 끝(교차로)은 그대로라 길끼리 연결은 바뀌지 않음
const STRAIGHT_TOL = 4 // 칸 (= 20m)
function simplify(P, tol) {
  if (P.length < 3) return P.map((_, i) => i)
  const a = P[0], b = P[P.length - 1]
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const L = Math.hypot(dx, dz)
  let md = -1, mi = 0
  for (let i = 1; i < P.length - 1; i++) {
    const p = P[i]
    const d = L < 1e-6 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs(dx * (a[1] - p[1]) - dz * (a[0] - p[0])) / L
    if (d > md) { md = d; mi = i }
  }
  if (md <= tol && L >= 1e-6) return [0, P.length - 1]
  const left = simplify(P.slice(0, mi + 1), tol)
  const right = simplify(P.slice(mi), tol).map((i) => i + mi)
  return [...left.slice(0, -1), ...right]
}
function straightenAlleys(list, tol = STRAIGHT_TOL) {
  return list.map((s) => {
    if (s.main) return s
    const keep = simplify(s.pts.map(project), tol)
    return { ...s, pts: keep.map((i) => s.pts[i]) }
  })
}

// faceSouth: 위에서 내려다본 2D 라 모든 가게 정면이 남쪽(화면 아래)을 보게
// tidy: 길 정리 (tidyStreets)
// straight: 골목을 직선으로 (straightenAlleys)
// realPos: 가게를 실제 위치(위경도)에 — 문(바닥선)이 실제 좌표에 오도록, 겹치는 만큼만 비켜 섬 (placeAtReal)
// shopScale: 가게를 크게 그릴 때 간격·길에서 떨어진 거리·문 앞 자리를 같은 배율로
export function layoutStores(stores, { faceSouth = false, tidy = false, straight = false, realPos = false, shopScale = 1 } = {}) {
  const maxTurn = faceSouth ? 0 : MAX_TURN
  const kS = shopScale
  const SETBACK_ = SETBACK * kS, GAP_ = GAP * kS, CLEAR_ = CLEAR * kS, FRONT_ = FRONT_DIST * kS
  let SRC = tidy ? tidyStreets(STREETS) : STREETS
  if (straight) SRC = straightenAlleys(SRC)
  // 1) 길 투영 (꼭짓점은 위경도가 같으면 같은 노드)
  const streets = SRC.map((s, i) => {
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

  if (realPos) placeAtReal()
  else {
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
        // 길의 동쪽/서쪽 중 원하는 쪽 고정 (pixelSide: 'E' | 'W')
        if (faceSouth && s.pixelSide && Math.abs(dir[1]) > 0.3) side = (s.pixelSide === 'E' ? 1 : -1) * Math.sign(-dir[1])
        return { st, side, t: c.t + (s.shift || 0) }
      })
    Object.assign(s, { _st: s._cands[0].st, _side: s._cands[0].side, _t: s._cands[0].t })
  })

  // 3) 빈자리 찾기: 원래 자리에서 가까운 순서로 길을 따라 탐색
  const placed = []
  const place = (st, t, side) => {
    const { pos, dir } = pointAt(st.poly, t)
    const n = [-dir[1] * side, dir[0] * side] // 길 → 건물
    const off = st.half + SETBACK_
    const b = [pos[0] + n[0] * off, pos[1] + n[1] * off]
    const rot = clamp(Math.atan2(-n[0], -n[1]), -maxTurn, maxTurn)
    return { pos, b, rot }
  }
  // 자기 길도 포함해서 검사 (휘어진 길이 건물을 다시 지나가는 경우까지 막음)
  const ok = (st, t, cand, clear) =>
    t >= END_PAD && t <= st.poly.len - END_PAD &&
    segDist(cand.b, null) >= clear &&
    placed.every((o) => Math.hypot(o[0] - cand.b[0], o[1] - cand.b[1]) >= GAP_)
  // 자리가 좁은 곳(다른 길이 가까운 매장)부터
  const room = (s) => segDist(place(s._st, s._t, s._side).b, null)
  const order = [...stores].sort((a, b) => room(a) - room(b))
  order.forEach((s) => {
    let st = s._st
    let found = null
    // 1차: 넉넉한 간격, 2차: 좁은 골목이라 간격을 줄여서
    for (const clear of [CLEAR_, CLEAR_ * 0.55]) {
      for (const cd of s._cands) {
        for (let k = 0; k <= 60 && !found; k++) {
          const dt = k === 0 ? 0 : Math.ceil(k / 2) * 0.5 * (k % 2 ? 1 : -1)
          for (const side of [cd.side, -cd.side]) {
            if (side !== cd.side && k < (faceSouth && s.pixelSide ? 40 : 12)) continue // 반대편은 근처에 자리가 없을 때만 (쪽을 고정한 가게는 더 멀리까지 같은 쪽에서 찾음)
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
    s.front = [s.building[0] + Math.sin(s.rot) * FRONT_, s.building[1] + Math.cos(s.rot) * FRONT_]
    s.side = s.rot > 0.05 ? 'R' : s.rot < -0.05 ? 'L' : s.id.length % 2 ? 'L' : 'R' // 소품 좌우 배치용
    s.attach = found.pos
    st.items.push({ t: found.t, id: 'a_' + s.id, pos: found.pos })
  })

  }

  // ── 실제 위치에 세우기 ──
  //  목표: 가게 문(바닥선 가운데)이 실제 위경도 지점에 오도록.
  //  조건: ① 가게 그림이 걷는 길을 덮지 않음 ② 다른 가게 그림과 겹치지 않음
  //        ③ 문 앞 → 가장 가까운 길까지 디딤돌이 가게(자기·남의) 그림을 지나가지 않음
  //  조건을 지키는 자리 중 실제 지점에 가장 가까운 곳 (+ 디딤돌이 짧을수록 조금 가산점).
  //  한 번 다 세운 뒤, 나머지를 고정하고 하나씩 다시 자리 잡기를 몇 번 반복해 전체 어긋남을 줄임.
  function placeAtReal() {
    const DOOR = 1.25 * kS // 건물 중심 → 문(바닥선)  (pixel/world.js BASE_DZ 와 같게)
    const HW = 3.3, UP = 4.6 // 그림 반폭 · 중심에서 위로 (칸, 지도 위 그림 크기 ≈ 6.5칸)
    const SEP_X = HW * 2 + 0.3, SEP_Z = UP + DOOR + 0.3 // 가게끼리 최소 간격 (가로 또는 세로)
    const R = 16, STEP = 0.5 // 실제 지점에서 최대 16칸(80m)까지 찾아봄
    const edgeDist = (p) => segDist(p, null) // 길 가장자리까지 (음수 = 길 위)
    const nearestStreet = (p) => {
      let best = null
      for (const st of streets) {
        const c = closest(st.poly, p)
        if (!best || c.d - st.half < best.d) best = { d: c.d - st.half, st, c }
      }
      return best
    }
    const inBox = (p, b, pad = 0) => Math.abs(p[0] - b[0]) < HW + pad && p[1] > b[1] - UP - pad && p[1] < b[1] + DOOR + pad
    const fits = (b, others) => {
      // ① 그림 자리(가로 3점 × 세로 3점)가 길에서 떨어져 있어야
      for (const dx of [-HW + 0.4, 0, HW - 0.4]) for (const dz of [-UP + 0.4, -1, DOOR]) if (edgeDist([b[0] + dx, b[1] + dz]) < 0.15) return null
      // ② 다른 가게와 가로 또는 세로로 충분히 떨어짐
      for (const o of others) if (Math.abs(o[0] - b[0]) < SEP_X && Math.abs(o[1] - b[1]) < SEP_Z) return null
      // ③ 문 앞 → 가장 가까운 길: 디딤돌이 그림을 지나가지 않게
      const front = [b[0], b[1] + FRONT_]
      const ns = nearestStreet(front)
      const a = ns.c.pos
      const L = Math.hypot(a[0] - front[0], a[1] - front[1])
      for (let d = 0.6; d < L; d += 0.5) {
        const q = [front[0] + ((a[0] - front[0]) * d) / L, front[1] + ((a[1] - front[1]) * d) / L]
        if (inBox(q, b, -0.2)) return null
        for (const o of others) if (inBox(q, o, 0.2)) return null
      }
      return { st: ns.st, t: ns.c.t, pos: a, len: L }
    }
    const target = (s) => { const P = project([s.lat, s.lng]); return [P[0], P[1] - DOOR] }
    const best = (s, others) => {
      const T = target(s)
      let win = null
      for (let i = -R; i <= R; i += STEP) for (let j = -R; j <= R; j += STEP) {
        const off = Math.hypot(i, j)
        if (off > R || (win && off >= win.score)) continue
        const b = [T[0] + i, T[1] + j]
        const f = fits(b, others)
        if (!f) continue
        const score = off + 0.15 * f.len
        if (!win || score < win.score) win = { b, ...f, score }
      }
      return win
    }
    const pos = {}
    // 가까이 몰린 가게부터 (주변 3곳까지 평균 거리가 짧은 순)
    const crowd = (s) => {
      const T = target(s)
      const ds = stores.filter((o) => o !== s).map((o) => Math.hypot(...target(o).map((v, k) => v - T[k]))).sort((a, b) => a - b)
      return ds[0] + ds[1] + ds[2]
    }
    const order = [...stores].sort((a, b) => crowd(a) - crowd(b))
    for (let pass = 0; pass < 4; pass++) {
      for (const s of order) {
        const others = stores.filter((o) => o !== s && pos[o.id]).map((o) => pos[o.id].b)
        const w = best(s, others)
        if (w) pos[s.id] = w
        else if (!pos[s.id]) console.warn('[layout] 실제 위치 근처에 자리를 못 찾음:', s.id)
      }
    }
    stores.forEach((s) => {
      const w = pos[s.id]
      s.building = w.b
      s.rot = 0
      s.front = [w.b[0], w.b[1] + FRONT_]
      s.side = s.id.length % 2 ? 'L' : 'R' // 소품 좌우 배치용
      s.attach = w.pos
      w.st.items.push({ t: w.t, id: 'a_' + s.id, pos: w.pos })
    })
  }

  // 출발점: 가장 가까운 길 위 지점(a_start) ↔ 출발 위치(S)
  const S = project(START_LL)
  let sBest = null
  streets.forEach((st) => {
    const c = closest(st.poly, S)
    if (!sBest || c.d < sBest.c.d) sBest = { st, c }
  })
  sBest.st.items.push({ t: sBest.c.t, id: 'a_start', pos: sBest.c.pos })
  if (tidy) S.splice(0, 2, ...sBest.c.pos) // 출발 위치도 길 위로

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
