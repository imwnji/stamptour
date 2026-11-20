// 도트 마을 월드 — 바닥(정적 큰 캔버스) + 위에 세우는 물체(가게·나무·소품) 목록
//  좌표: 월드 1칸 = T px. 지도 크기·길·가게 위치는 data/ (layout 은 정면이 모두 남쪽)
import { MAP_W, MAP_H, STREETS, BG_STREETS, BG_HALF, PLAZA, NODES, START_NODE, distToStreets } from '../data/map.js'
import { STORES } from '../data/stores.js'
import { C } from './colors.js'
import { canvas, painter, rng, hash } from './draw.js'
import * as S from './sprites.js'

export const T = 16
export const GW = MAP_W * T, GH = MAP_H * T
export const X = (x) => Math.round((x + MAP_W / 2) * T)
export const Y = (z) => Math.round((z + MAP_H / 2) * T)
export const BASE_DZ = 1.25 * S.SHOP_K // 건물 중심 → 정면(바닥선) 거리 (칸, 가게 배율만큼)

const u32 = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)
}

// ── 물체 배치 ──
function placeObjects(walkC) {
  const objs = []
  const buildings = STORES.map((s) => {
    const spr = S.shopSprite(s)
    const o = { kind: 'shop', store: s, spr, x: X(s.building[0]), y: Y(s.building[1] + BASE_DZ) }
    objs.push(o)
    return o
  })
  // 가게 자리 (나무가 가리지 않게 넉넉히)
  const blocked = (x, z, pad = 0) =>
    STORES.some((s) => {
      const [bx, bz] = s.building
      // 가게 그림이 차지하는 자리 + 문 앞 (가게 배율만큼 넓게 → 겹치는 나무·소품은 안 놓임)
      const k = S.SHOP_K
      return x > bx - 2.4 * k - pad && x < bx + 2.4 * k + pad && z > bz - 3.4 * k - pad && z < bz + 4.4 * k + pad
    })
  const near = (list, x, z, d) => list.some((p) => Math.hypot(p[0] - x, p[1] - z) < d)
  const inPlaza = (x, z, pad) => Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + pad
  const add = (kind, spr, x, z, extra) => objs.push({ kind, spr, x: X(x), y: Y(z), ...extra })
  const taken = []

  // 가로등: 큰길 따라 양옆 번갈아
  const lampA = S.festiveLampSprite(false), lampB = S.festiveLampSprite(true)
  const lamps = []
  STREETS.forEach((s) => {
    let side = 1
    for (let t = 3; t < s.len - 2; t += s.main ? 8 : 9) {
      let i = 0
      while (i < s.pts.length - 2 && s.cum[i + 1] < t) i++
      const a = s.pts[i], b = s.pts[i + 1]
      const L = s.cum[i + 1] - s.cum[i] || 1
      const u = (t - s.cum[i]) / L
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L
      const off = s.half + 0.6
      const x = a[0] + (b[0] - a[0]) * u - dz * off * side
      const z = a[1] + (b[1] - a[1]) * u + dx * off * side
      side = -side
      if (blocked(x, z) || distToStreets(x, z) < 0.25 || inPlaza(x, z, 0.5) || near(lamps, x, z, 4)) continue
      lamps.push([x, z])
    }
  })
  // 광장: 크리스마스 트리 + 벤치 + 가로등 4개
  add('tree', S.plazaTreeSprite(), PLAZA.x, PLAZA.z + 0.6)
  taken.push([PLAZA.x, PLAZA.z])
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2
    lamps.push([PLAZA.x + Math.cos(a) * (PLAZA.r + 0.7), PLAZA.z + Math.sin(a) * (PLAZA.r + 0.7)])
  }
  lamps.forEach(([x, z], i) => { add('lamp', i % 2 ? lampB : lampA, x, z); taken.push([x, z]) })
  const bench = S.benchSprite()
  for (const dx of [-1, 1]) { add('bench', bench, PLAZA.x + dx * 2.2, PLAZA.z + 3.3); taken.push([PLAZA.x + dx * 2.2, PLAZA.z + 3.3]) }
  // 출발점 이정표
  const [sx, sz] = NODES[START_NODE]
  add('sign', S.signpostSprite(), sx - 2.4, sz + 0.4)
  taken.push([sx - 2.4, sz + 0.4])

  // 길가 꾸미기: 걷는 길 양옆을 따라 덤불·화분·전구 울타리·벤치·눈사람·그루터기·간판 (문 앞·디딤돌·다른 길은 피해서)
  const segDist = (x, z, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1]
    const L2 = dx * dx + dz * dz || 1e-9
    const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2))
    return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u)
  }
  const nearDoorway = (x, z, pad = 0) => STORES.some((s) => {
    const door = [s.building[0], s.building[1] + BASE_DZ]
    return segDist(x, z, door, s.front) < 1.3 + pad || segDist(x, z, s.front, s.attach) < 1.1 + pad
  })
  const fr = rng(31)
  const FURN = [
    { kind: 'bush', w: 0.5, sprs: [S.bushSprite(true)], p: 0.24 },
    { kind: 'planter', w: 0.6, sprs: [S.planterSprite()], p: 0.12 },
    { kind: 'lights', w: 1.3, sprs: [S.stringLightsSprite()], p: 0.12 },
    { kind: 'bench', w: 0.8, sprs: [S.benchSprite()], p: 0.13 },
    { kind: 'snowman', w: 0.5, sprs: [S.snowmanSprite(0), S.snowmanSprite(1)], p: 0.11 },
    { kind: 'stump', w: 0.8, sprs: [S.stumpSprite()], p: 0.08 },
    { kind: 'sign', w: 0.5, sprs: [S.cafeSignSprite()], p: 0.06 },
    { kind: null, p: 0.14 },
  ]
  const pickFurn = () => { let r0 = fr(); for (const f of FURN) { if ((r0 -= f.p) <= 0) return f } return FURN[0] }
  const prints = [] // 벤치·눈사람 → 길까지 발자국
  // 실제로 그려지는 길(매끈하게 합친 모양) 밖, 가장자리에서 m px 이상 떨어진 눈 위인지
  const onSnow = (x, z, m = 5) => {
    const px = X(x), py = Y(z)
    for (const [dx, dy] of [[0, 0], [-m, 0], [m, 0], [0, -m], [0, m]]) {
      const qx = px + dx, qy = py + dy
      if (qx < 0 || qy < 0 || qx >= GW || qy >= GH || walkC[qy * GW + qx]) return false
    }
    return true
  }
  STREETS.forEach((s) => {
    for (let t = 2; t < s.len - 1.5; t += 2.6 + fr() * 1.2) {
      let i = 0
      while (i < s.pts.length - 2 && s.cum[i + 1] < t) i++
      const a = s.pts[i], b = s.pts[i + 1]
      const L = s.cum[i + 1] - s.cum[i] || 1
      const u = (t - s.cum[i]) / L
      const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L
      const ox = a[0] + (b[0] - a[0]) * u, oz = a[1] + (b[1] - a[1]) * u
      for (const side of [1, -1]) {
        const f = pickFurn()
        if (!f.kind) continue
        for (const extra of [0.7, 1.3, 2.0]) {
          const off = s.half + extra + f.w * 0.5
          const x = ox - dz * off * side, z = oz + dx * off * side
          const pts = f.kind === 'lights' ? [[x - 1.2, z], [x + 1.2, z], [x, z]] : [[x, z]]
          if (pts.some(([ex, ez]) => !onSnow(ex, ez) || blocked(ex, ez, -0.9) || nearDoorway(ex, ez))) continue
          if (inPlaza(x, z, 1) || near(taken, x, z, 0.9 + f.w)) continue
          add(f.kind, f.sprs[(fr() * f.sprs.length) | 0], x, z)
          taken.push([x, z])
          if (f.kind === 'bench' || f.kind === 'snowman') prints.push([x, z + 0.3, ox, oz])
          break
        }
      }
    }
  })
  // 토끼·고양이: 길 가장자리 쪽 길 위, 또는 길 옆 눈 위
  const bunny = S.bunnySprite()
  const cats = [
    S.catSprite(C.snowHi, C.snowMid, C.snowHi), // 하얀 고양이
    S.catSprite(C.woodLight, C.woodDark, C.paper), // 갈색 줄무늬
    S.catSprite('#8C9399', C.iron, '#D9DCDD'), // 회색
    S.catSprite(C.roofLight, C.roof, C.paper), // 치즈
  ]
  const spot = (onRoad) => {
    const s = STREETS[(fr() * STREETS.length) | 0]
    const t = 1 + fr() * Math.max(0, s.len - 2)
    let i = 0
    while (i < s.pts.length - 2 && s.cum[i + 1] < t) i++
    const a = s.pts[i], b = s.pts[i + 1]
    const L = s.cum[i + 1] - s.cum[i] || 1
    const u = (t - s.cum[i]) / L
    const side = fr() < 0.5 ? 1 : -1
    const off = onRoad ? s.half * 0.65 : s.half + 0.9 + fr() * 1.2
    return [a[0] + (b[0] - a[0]) * u - ((b[1] - a[1]) / L) * off * side, a[1] + (b[1] - a[1]) * u + ((b[0] - a[0]) / L) * off * side]
  }
  const critter = (kind, sprOf, count, roadShare) => {
    for (let n = 0, tries = 0; n < count && tries < 600; tries++) {
      const onRoad = n < count * roadShare
      const [x, z] = spot(onRoad)
      if (near(taken, x, z, onRoad ? 3.5 : 1.4) || nearDoorway(x, z, 0.4) || blocked(x, z, -0.6) || inPlaza(x, z, 0.5)) continue
      if (!onRoad && !onSnow(x, z, 3)) continue
      add(kind, sprOf(n), x, z)
      taken.push([x, z])
      n++
    }
  }
  critter('bunny', () => bunny, 12, 0.5)
  critter('cat', (n) => cats[n % cats.length], 10, 0.3)

  // 나무·덤불·바위·눈사람 (지도 가장자리로 갈수록 빽빽한 숲)
  const r = rng(20261219)
  const pines = [S.pineSprite(1), S.pineSprite(0.82), S.pineSprite(1.15)]
  const rounds = [S.roundTreeSprite(0), S.roundTreeSprite(1)]
  const bushes = [S.bushSprite(true), S.bushSprite(false)]
  const rock = S.rockSprite(), snowman = S.snowmanSprite(0)
  const hw = MAP_W / 2 - 0.8, hh = MAP_H / 2 - 0.5
  let nTree = 0, nBush = 0, nRock = 0, nMan = 0
  for (let tries = 0; tries < 16000; tries++) {
    const x = (r() * 2 - 1) * hw, z = (r() * 2 - 1) * hh
    const ds = distToStreets(x, z, true)
    if (ds < 0.9 || blocked(x, z) || inPlaza(x, z, 1.4)) continue
    const edge = Math.min(hw - Math.abs(x), hh - Math.abs(z))
    const roll = r()
    if (roll < 0.72 && nTree < 900) {
      // 나무 윗부분이 걷는 길을 덮지 않게
      if (distToStreets(x, z - 1.2) < 0.9 || distToStreets(x, z - 2.3) < 0.5) continue
      if (near(taken, x, z, 1.35)) continue
      if (ds < 3 && edge > 6 && r() < 0.5) continue // 길가는 조금 성기게
      const pick = r()
      const spr = pick < 0.62 ? pines[(r() * 3) | 0] : rounds[(r() * 2) | 0]
      add('tree', spr, x, z)
      taken.push([x, z])
      nTree++
    } else if (roll < 0.93 && nBush < 260) {
      if (near(taken, x, z, 0.8)) continue
      add('bush', bushes[r() < 0.7 ? 0 : 1], x, z)
      taken.push([x, z])
      nBush++
    } else if (roll < 0.985 && nRock < 40) {
      if (near(taken, x, z, 0.8)) continue
      add('rock', rock, x, z)
      taken.push([x, z])
      nRock++
    } else if (nMan < 6 && ds > 1.4 && ds < 4) {
      if (near(taken, x, z, 3)) continue
      add('snowman', snowman, x, z)
      taken.push([x, z])
      nMan++
    }
  }
  objs.sort((a, b) => a.y - b.y)
  return { objs, buildings, lamps, prints }
}

// 꺾은선 모서리를 둥글게 (Chaikin) — 끝 점(교차로)은 그대로라 길끼리 이어짐
function smooth(pts, it = 3) {
  let p = pts
  for (let k = 0; k < it; k++) {
    const q = [p[0]]
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1]
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75])
    }
    q.push(p[p.length - 1])
    p = q
  }
  return p
}
const SMOOTH = STREETS.map((s) => ({ ...s, pts: smooth(s.pts) }))

// 이진 마스크의 각 픽셀에서 가장 가까운 '안쪽' 픽셀까지 거리의 제곱 (Felzenszwalb 거리 변환)
function edt(inside, w, h) {
  const INF = 1e12
  const f = new Float64Array(Math.max(w, h)), d = new Float64Array(Math.max(w, h))
  const v = new Int32Array(Math.max(w, h)), z = new Float64Array(Math.max(w, h) + 1)
  const out = new Float64Array(w * h)
  const pass = (n) => {
    let k = 0
    v[0] = 0; z[0] = -INF; z[1] = INF
    for (let q = 1; q < n; q++) {
      let sx
      while (true) {
        sx = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        if (sx > z[k]) break
        k--
      }
      k++; v[k] = q; z[k] = sx; z[k + 1] = INF
    }
    k = 0
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = inside[y * w + x] ? 0 : INF
    pass(h)
    for (let y = 0; y < h; y++) out[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x]
    pass(w)
    for (let x = 0; x < w; x++) out[y * w + x] = d[x]
  }
  return out
}
// 닫힘(팽창 → 침식): 길이 갈라지는 오목한 홈을 둥글게 메워 한 덩어리로
function closeMask(inside, w, h, r) {
  const d1 = edt(inside, w, h)
  const grown = new Uint8Array(w * h)
  for (let i = 0; i < grown.length; i++) grown[i] = d1[i] <= r * r ? 0 : 1 // 1 = 길 바깥
  const d2 = edt(grown, w, h)
  const out = new Uint8Array(w * h)
  for (let i = 0; i < out.length; i++) out[i] = d2[i] > r * r ? 1 : 0
  return out
}

// 길 모양 마스크 (부드럽게 그린 뒤 기준값으로 잘라 도트 경계로)
function mask(draw) {
  const m = canvas(GW, GH)
  const c = m.getContext('2d')
  c.strokeStyle = c.fillStyle = '#fff'
  c.lineCap = c.lineJoin = 'round'
  draw(c)
  return c.getImageData(0, 0, GW, GH).data
}
const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, z], i) => (i ? c.lineTo(X(x), Y(z)) : c.moveTo(X(x), Y(z)))); c.stroke() }

// 걷는 길 영역: 일정한 폭의 매끈한 길 + 광장 → 갈래 사이 홈을 둥글게 메운 한 덩어리 (1 = 길)
function walkMask() {
  const m = mask((c) => {
    SMOOTH.forEach((s) => { c.lineWidth = s.half * 2 * T; poly(c, s.pts) })
    c.beginPath(); c.arc(X(PLAZA.x), Y(PLAZA.z), PLAZA.r * T, 0, Math.PI * 2); c.fill()
  })
  const walk = new Uint8Array(GW * GH)
  for (let i = 0; i < walk.length; i++) walk[i] = m[i * 4 + 3] >= 128 ? 1 : 0
  return closeMask(walk, GW, GH, 15) // 반지름 15px ≈ 1칸
}

// ── 바닥 ──
function drawGround({ objs, lamps, prints }, walkC) {
  const cv = canvas(GW, GH)
  const g = cv.getContext('2d')
  const bgM = mask((c) => { c.lineWidth = BG_HALF * 2 * T; BG_STREETS.forEach((pts) => poly(c, pts)) })
  // 큰길(필운대로)은 가운데에 돌을 깐 길
  // 걷는 길 전체를 돌길로: 가장자리 1px 진한 테두리 + 1px 밝은 테두리 + 안쪽 판석
  const edgeD = edt(walkC.map((v) => 1 - v), GW, GH) // 길 밖까지 거리²

  const N = GW * GH
  const kind = new Uint8Array(N) // 0 눈, 1 길 테두리, 2 배경 골목, 3 광장 돌, 4 판석 길, 5 밝은 테두리
  const px0 = X(PLAZA.x), py0 = Y(PLAZA.z), pr = PLAZA.r * T
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      const thr = 128 // 고정 기준 → 가장자리가 들쭉날쭉하지 않은 깔끔한 도트 계단
      if (walkC[i]) kind[i] = Math.hypot(x - px0, y - py0) < pr - 4 ? 3 : edgeD[i] <= 1 ? 1 : edgeD[i] <= 4 ? 5 : 4
      else if (bgM[i * 4 + 3] >= thr) kind[i] = 2
    }

  const img = g.createImageData(GW, GH)
  const out = new Uint32Array(img.data.buffer)
  const P = {
    snow: u32(C.snow), snowHi: u32(C.snowHi), snowMid: u32(C.snowMid), snowShade: u32('#D3DCDD'),
    path: u32(C.path), pathL: u32(C.pathLight), pathD: u32(C.pathDark), pathDD: u32(C.pathDeep),
    bg: u32(C.pathSoft), bgD: u32('#DDD3C0'),
    stone: u32(C.pathLight), stone2: u32('#DACCB2'), mortar: u32(C.pathDark),
  }
  const K0 = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? 0 : kind[y * GW + x])
  const K = (x, y) => { const k = K0(x, y); return k === 4 || k === 5 ? 1 : k } // 경계 판정에선 돌길도 길
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      const k = kind[i]
      const h = hash(x, y)
      let col
      if (k === 1) {
        if (K(x, y - 1) === 0 || K(x, y - 1) === 2) col = P.pathDD // 위쪽 눈둑 그림자
        else if (K(x - 1, y) !== 1 && K(x - 1, y) !== 3 || K(x + 1, y) !== 1 && K(x + 1, y) !== 3 || K(x, y + 1) !== 1 && K(x, y + 1) !== 3) col = P.pathD
        else col = h < 0.045 ? P.pathD : h < 0.075 ? P.pathL : P.path
      } else if (k === 5) {
        col = K0(x, y - 1) === 1 ? P.pathL : P.snowMid // 길 안쪽 밝은 테두리
      } else if (k === 4) {
        // 큰길 돌: 둥근 판석이 엇갈려 깔린 무늬 (가장자리는 흙)
        const row = Math.floor(y / 6), off = (row & 1) * 4
        const cx = (x + off) % 8, cy = y % 6
        const edgeStone = cx === 0 || cy === 0 || (cx === 7 && cy === 5)
        const hs = hash(((x + off) / 8) | 0, row)
        col = edgeStone ? P.mortar : cy === 1 && cx < 4 ? P.snowHi : hs < 0.33 ? P.stone : hs < 0.66 ? P.stone2 : P.path
        if (h < 0.02) col = P.pathD
      } else if (k === 3) {
        // 광장 돌바닥 (어긋난 벽돌)
        const row = y >> 2, off = (row & 1) * 3
        const isM = (y & 3) === 0 || (x + off) % 6 === 0
        col = isM ? P.mortar : hash((x + off) / 6 | 0, row) < 0.5 ? P.stone : P.stone2
        if (Math.hypot(x - px0, y - py0) > pr - 7) col = P.pathDD
      } else if (k === 2) {
        const edge = K(x - 1, y) === 0 || K(x + 1, y) === 0 || K(x, y - 1) === 0 || K(x, y + 1) === 0
        col = edge ? P.bgD : h < 0.03 ? P.bgD : P.bg
      } else {
        if (K(x, y + 1) === 1) col = P.snowHi // 길 바로 위 눈둑 하이라이트
        else if (K(x, y - 1) === 1) col = P.snowShade // 길 아래쪽 가장자리 그늘
        else col = h < 0.012 ? P.snowMid : h < 0.02 ? P.snowHi : P.snow
      }
      out[i] = col
    }
  g.putImageData(img, 0, 0)

  const p = painter(g)
  // 눈 위 작은 눈더미 결 + 길 위 자갈
  const r = rng(7)
  for (let n = 0; n < (GW * GH) / 900; n++) {
    const x = (r() * GW) | 0, y = (r() * GH) | 0
    const k = kind[y * GW + x]
    if (k === 0) {
      p.rect(x, y, 4, 1, C.snowHi); p.px(x - 1, y + 1, C.snowMid); p.px(x + 4, y + 1, C.snowMid); p.rect(x, y + 1, 4, 1, C.snow)
    } else if (k === 1 && r() < 0.5) {
      p.rect(x, y, 2, 1, C.pathLight); p.px(x, y + 1, C.pathDark); p.px(x + 1, y + 1, C.pathDark)
    }
  }
  // 눈 둔덕 (가로로 긴 눈더미) + 얼어붙은 웅덩이
  for (let n = 0; n < (GW * GH) / 5200; n++) {
    const x = (r() * GW) | 0, y = (r() * GH) | 0
    if (kind[y * GW + x] !== 0 || kind[Math.min(N - 1, y * GW + x + 20)] !== 0) continue
    const w = 10 + ((r() * 14) | 0)
    if (r() < 0.16) {
      p.ellipse(x + w / 2, y + 2, w / 2, 2.8, C.skyDark)
      p.ellipse(x + w / 2, y + 1.6, w / 2 - 1, 2.2, C.sky)
      p.rect(x + 3, y + 1, 3, 1, C.skyLight); p.px(x + w - 5, y + 3, C.skyLight)
    } else {
      p.ellipse(x + w / 2, y + 2, w / 2, 2.2, C.snowMid)
      p.ellipse(x + w / 2 - 1, y + 1.4, w / 2 - 1, 1.8, C.snow)
      p.rect(x + 3, y, Math.max(2, w / 2 - 2), 1, C.snowHi)
    }
  }
  // 길 → 가게 문 앞: 눈 위 디딤돌 (흙길이 튀어나오지 않게)
  STORES.forEach((s) => {
    const [fx, fz] = s.front, [ax, az] = s.attach
    const doorZ = s.building[1] + BASE_DZ + 0.15
    const pts = [[s.building[0], doorZ], [fx, fz], [ax, az]]
    let carry = 0
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1]
      const L = Math.hypot(x1 - x0, z1 - z0)
      for (let d = carry; d < L; d += 0.62) {
        const x = x0 + ((x1 - x0) * d) / L, z = z0 + ((z1 - z0) * d) / L
        if (distToStreets(x, z) < -0.2) continue // 길 안쪽은 생략
        const px = X(x), py = Y(z), k = (px + py) & 1
        p.ellipse(px + 0.5, py + 1, 3.5 + k * 0.5, 2.2, C.pathDeep)
        p.ellipse(px + 0.5, py + 0.5, 3 + k * 0.5, 1.8, C.pathLight)
        p.rect(px - 1, py, 2, 1, C.snowHi)
        carry = d + 0.62 - L
      }
    }
  })
  // 돌길 군데군데 작은 눈 뭉치
  const onStone = (x, y, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (kind[(y + dy) * GW + x + dx] !== 4) return false
    return true
  }
  const mr = rng(77)
  for (let n = 0; n < (GW * GH) / 7000; n++) {
    const x = (mr() * GW) | 0, y = (mr() * GH) | 0
    if (!onStone(x, y, 4)) continue
    const w = 3 + mr() * 3
    p.ellipse(x, y + 1, w, 2, C.snowMid); p.ellipse(x - 0.5, y, w - 0.5, 1.6, C.snowHi)
  }

  // 벤치·눈사람에서 길까지 이어진 발자국
  prints.forEach(([x0, z0, x1, z1]) => {
    const L = Math.hypot(x1 - x0, z1 - z0)
    const nx = -(z1 - z0) / L, nz = (x1 - x0) / L
    for (let d = 0.5, k = 0; d < L - 0.4; d += 0.32, k++) {
      const sd = k % 2 ? 0.12 : -0.12
      const px = X(x0 + ((x1 - x0) * d) / L + nx * sd), py = Y(z0 + ((z1 - z0) * d) / L + nz * sd)
      if (kind[py * GW + px] !== 0) continue
      p.rect(px, py, 2, 1, C.snowShade); p.px(px, py + 1, C.snowMid)
    }
  })
  // 따뜻한 불빛 웅덩이 (바둑판 디더)
  const glowPool = (cx, cy, rad) => {
    g.fillStyle = C.glowLight
    g.globalAlpha = 0.55
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++) {
        const d = Math.hypot(x, y * 1.6)
        if (d > rad) continue
        if (((x + y) & 1) === 0 || d < rad * 0.5) g.fillRect(cx + x, cy + y, 1, 1)
      }
    g.globalAlpha = 1
  }
  lamps.forEach(([x, z]) => glowPool(X(x), Y(z) + 1, 18))
  objs.filter((o) => o.kind === 'lights').forEach((o) => glowPool(o.x, o.y - 2, 14))
  STORES.forEach((s) => glowPool(X(s.building[0]), Y(s.building[1] + BASE_DZ) + 8, 30))
  // 그림자 (빛이 왼쪽 위 → 오른쪽 아래로)
  g.fillStyle = C.snowDeep
  g.globalAlpha = 0.22
  for (const o of objs) {
    const w = o.spr.w
    if (o.kind === 'shop') p.rrect(o.x - w / 2 + 8, o.y - 10, w, 13, 5, C.snowDeep)
    else if (o.kind === 'tree') p.ellipse(o.x + 3, o.y - 1, w * 0.36, 3.5, C.snowDeep)
    else p.ellipse(o.x + 2, o.y - 0.5, w * 0.4, 2, C.snowDeep)
  }
  g.globalAlpha = 1
  return cv
}

export function buildWorld() {
  const walkC = walkMask()
  const placed = placeObjects(walkC)
  const ground = drawGround(placed, walkC)
  const postcards = Object.fromEntries(STORES.map((s) => [s.id, S.postcardSprite(s.color)]))
  return { ground, ...placed, avatar: S.avatarSprites(), postcards }
}

// 가게별 엽서 붙는 자리 (정면 바닥선 기준 px)
export const POSTCARD_AT = Object.fromEntries(
  Object.entries({ bag: [12, -18], hanok: [-16, -16], sweater: [-20, -14], cat: [-3, -12], alpaca: [9, -16], glass: [-6, -12], default: [11, -15] })
    .map(([k, [x, y]]) => [k, [Math.round(x * S.SHOP_K), Math.round(y * S.SHOP_K)]]),
)
