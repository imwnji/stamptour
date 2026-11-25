// 도트 마을 월드 — 바닥(정적 큰 캔버스) + 위에 세우는 물체(가게·나무·소품) 목록
//  좌표: 월드 1칸 = T px. 지도 크기·길·가게 위치는 data/ (layout 은 정면이 모두 남쪽)
//  얼마나 많이·얼마나 진하게는 design.js 에서
//  원칙: 가게가 주인공 → 길은 같은 폭의 판석 돌길(눈은 가장자리에만), 눈밭은 무늬 없이 맑게,
//        눈더미는 나무 밑·울타리·길 가장자리·가게 발치처럼 눈이 실제로 쌓일 곳에만,
//        넓은 빈터엔 직접 고른 자리에 작은 테마 공간(크리스마스 광장·휴식·정원·얼음 연못).
import { MAP_W, MAP_H, STREETS, PLAZA, NODES, EDGES, START_NODE, distToStreets } from '../data/map.js'
import { STORES } from '../data/stores.js'
import { C, mix } from './colors.js'
import { canvas, painter, rng, hash, withScale } from './draw.js'
import { MAP_SEED, PIXEL_UNIT, DETAIL_PX, SHOP, TREE, DECOR, DECOR_SCALE, SPACES, ROAD, VIEW, SHADOW } from './design.js'
import * as S from './sprites.js'

export const T = PIXEL_UNIT
export const GW = MAP_W * T, GH = MAP_H * T
export const X = (x) => Math.round((x + MAP_W / 2) * T)
export const Y = (z) => Math.round((z + MAP_H / 2) * T)
const WX = (px) => px / T - MAP_W / 2, WZ = (py) => py / T - MAP_H / 2
export const BASE_DZ = 1.25 * S.SHOP_K // 건물 중심 → 정면(바닥선) 거리 (칸, 가게 배율만큼)

// 카메라가 움직일 수 있는 범위 (px): 걷는 길·가게가 있는 곳 + 여백
export const CONTENT = (() => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  const grow = ([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
  STREETS.forEach((s) => s.pts.forEach(grow))
  STORES.forEach((s) => grow(s.building))
  grow([PLAZA.x, PLAZA.z - PLAZA.r])
  const m = VIEW.bounds
  return { x0: Math.max(0, X(x0 - m)), x1: Math.min(GW, X(x1 + m)), y0: Math.max(0, Y(z0 - m)), y1: Math.min(GH, Y(z1 + m)) }
})()

const u32 = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return (255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | ((n >> 16) & 255)
}
const segDist = (x, z, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const L2 = dx * dx + dz * dz || 1e-9
  const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2))
  return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u)
}
const smoothstep = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t) }

// 포아송 디스크 샘플링 (Bridson) — 서로 r 이상 떨어진 점을 고르게, 같은 씨앗이면 늘 같은 결과
function poisson(w, h, r, rand, k = 24) {
  const cell = r / Math.SQRT2, gw = Math.ceil(w / cell), gh = Math.ceil(h / cell)
  const grid = new Int32Array(gw * gh).fill(-1)
  const pts = [], active = []
  const put = (p) => { grid[((p[1] / cell) | 0) * gw + ((p[0] / cell) | 0)] = pts.length; pts.push(p); active.push(p) }
  put([rand() * w, rand() * h])
  while (active.length) {
    const i = (rand() * active.length) | 0, a = active[i]
    let found = false
    for (let n = 0; n < k; n++) {
      const ang = rand() * Math.PI * 2, d = r * (1 + rand())
      const p = [a[0] + Math.cos(ang) * d, a[1] + Math.sin(ang) * d]
      if (p[0] < 0 || p[1] < 0 || p[0] >= w || p[1] >= h) continue
      const gx = (p[0] / cell) | 0, gy = (p[1] / cell) | 0
      let ok = true
      for (let y = Math.max(0, gy - 2); y <= Math.min(gh - 1, gy + 2) && ok; y++)
        for (let x = Math.max(0, gx - 2); x <= Math.min(gw - 1, gx + 2); x++) {
          const j = grid[y * gw + x]
          if (j >= 0 && Math.hypot(pts[j][0] - p[0], pts[j][1] - p[1]) < r) { ok = false; break }
        }
      if (ok) { put(p); found = true; break }
    }
    if (!found) active.splice(i, 1)
  }
  return pts
}

// 부드러운 값 노이즈 (0~1) — 격자 크기 g (좌표 단위 그대로)
function valueNoise(seed, g) {
  return (x, y) => {
    const gx = x / g, gy = y / g, x0 = Math.floor(gx), y0 = Math.floor(gy)
    const fx = smoothstep(gx - x0), fy = smoothstep(gy - y0)
    const v = (i, j) => hash(i * 7 + seed, j * 13 - seed)
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * fx
    const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * fx
    return a + (b - a) * fy
  }
}

// 나무 군집 구도 (칸 단위 오프셋) — 삼각형·비대칭, 일렬 없음. 좌우 뒤집기·조금씩 흔들어 반복 티가 안 나게
const CLUSTERS = [
  [[0, 0], [1.5, 0.45], [0.6, -1.0]], // 삼각형
  [[0, 0], [1.3, 0.6]], // 비대칭 둘
  [[0, 0], [1.4, 0.3], [0.5, -1.1], [-1.2, 0.75]], // 넷 (뒤 하나 + 앞 둘 + 옆 하나)
  [[0, 0], [-1.6, 0.5], [0.9, 0.95]], // 넓은 삼각형
  [[0, 0], [1.1, -0.8], [2.0, 0.35]], // 비스듬한 셋
]

// 실제 문 위치 (가게 그림의 doorX, 칸 좌표) — 문 앞 눈길이 진짜 문에서 시작하게
const doorOf = (o) => [WX(o.x - o.spr.ax + (o.spr.doorX ?? 0.5) * o.spr.w), WZ(o.y) + 0.1]

// ── 물체 배치 ──
function placeObjects(walkC) {
  const objs = []
  const add = (kind, spr, x, z, extra) => { const o = { kind, spr, x: X(x), y: Y(z), ...extra }; objs.push(o); return o }
  const buildings = STORES.map((s) => {
    const spr = S.shopSprite(s)
    const o = { kind: 'shop', store: s, spr, x: X(s.building[0]), y: Y(s.building[1] + BASE_DZ) }
    // 엽서 붙는 자리: 아이콘 가게는 몸통 오른쪽 아래
    if (spr.icon) o.postcard = [Math.round(spr.w * 0.3), -Math.round(spr.h * 0.28)]
    o.door = doorOf(o)
    objs.push(o)
    return o
  })
  // 가게 그림이 실제로 차지하는 사각형 (칸) — 나무·소품은 여기 + 여백 안으로 못 들어옴
  const shopRects = buildings.map((o) => ({
    x0: WX(o.x - o.spr.ax), x1: WX(o.x - o.spr.ax + o.spr.w), z0: WZ(o.y - o.spr.ay), z1: WZ(o.y) + 0.4, store: o.store, o,
  }))
  const shopDist = (x, z) => {
    let best = Infinity
    for (const r of shopRects) best = Math.min(best, Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1)))
    return best
  }
  const hitsShop = (x, z, hw, hgt, pad) =>
    shopRects.some((r) => x + hw > r.x0 - pad && x - hw < r.x1 + pad && z > r.z0 - pad && z - hgt < r.z1 + pad)
  // 가게 문 → 문 앞 → 길: 비워 둠 (입구·연결로가 가려지지 않게)
  // 문에서 바로 아래로 조금 내려온 뒤 길까지 곧게 (꺾인 ㄱ자 대신 짧은 연결로)
  const lanes = buildings.map((o) => [o.door, [o.door[0], o.door[1] + 0.7], o.store.attach])
  const nearDoorway = (x, z, pad = 0) => lanes.some(([a, b, c]) => segDist(x, z, a, b) < 1.3 + pad || segDist(x, z, b, c) < 1.1 + pad)
  const inPlaza = (x, z, pad) => Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + pad
  // 실제로 그려지는 길(walkC) 밖, 가장자리에서 m px 이상 떨어진 눈 위인지
  const onSnow = (x, z, m = 4) => {
    const px = X(x), py = Y(z)
    for (const [dx, dy] of [[0, 0], [-m, 0], [m, 0], [0, -m], [0, m]]) {
      const qx = px + dx, qy = py + dy
      if (qx < 0 || qy < 0 || qx >= GW || qy >= GH || walkC[qy * GW + qx]) return false
    }
    return true
  }
  const inMap = (x, z) => x > -MAP_W / 2 + 1 && x < MAP_W / 2 - 1 && z > -MAP_H / 2 + 2 && z < MAP_H / 2 - 0.5
  const taken = [] // [x, z, r] — 놓인 물체 (최소 간격 검사)
  const free = (x, z, r) => taken.every(([tx, tz, tr]) => Math.hypot(tx - x, tz - z) >= Math.max(r, tr))
  const placeDecor = (kind, spr, x, z, { r = 1, hw = 0.6, hgt = 1.2, extra } = {}) => {
    if (!inMap(x, z) || !onSnow(x, z) || hitsShop(x, z, hw, hgt, SHOP.clearDecor) || nearDoorway(x, z) || inPlaza(x, z, 0.6) || !free(x, z, r)) return null
    taken.push([x, z, r])
    return add(kind, spr, x, z, extra)
  }
  // 작은 눈더미 (눈이 실제로 쌓일 곳에만 — 다른 물체 간격은 따지지 않고 길·문 앞만 피함)
  const driftCache = {}
  const driftAt = (x, z, w, seed) => {
    if (!inMap(x, z) || !onSnow(x, z, 2) || nearDoorway(x, z, -0.3) || hitsShop(x, z, w / T / 2, 0.4, 0.2)) return null
    const key = w + '|' + (seed % 7)
    const spr = (driftCache[key] ||= S.driftSprite(w, 101 + (seed % 7) * 37 + w))
    return add('drift', spr, x, z + 0.15)
  }

  // 소품 (가게와 한 세계로 보이게 몇 가지는 조금 크게 — 다시 그려서 도트 크기는 그대로)
  const lampA = withScale(DECOR_SCALE.lamp, () => S.festiveLampSprite(false)), lampB = withScale(DECOR_SCALE.lamp, () => S.festiveLampSprite(true))
  const bench = withScale(DECOR_SCALE.bench, () => S.benchSprite())
  const snowmen = [0, 1].map((v) => withScale(DECOR_SCALE.snowman, () => S.snowmanSprite(v)))
  const bunny = withScale(DECOR_SCALE.bunny, () => S.bunnySprite())
  const planter = S.planterSprite(), stump = S.stumpSprite(), cafeSign = S.cafeSignSprite()
  const lights = S.stringLightsSprite(), signpost = S.signpostSprite(), fence = S.fenceSprite()
  const gifts = [S.giftSprite(C.roof, C.snowHi), S.giftSprite(C.sky, C.roof), S.giftSprite(C.pine, C.glowLight)]
  const ribbonPine = S.ribbonPineSprite()
  const pines = [S.pineSprite(1), S.pineSprite(0.82), S.pineSprite(1.15)]
  const rounds = [S.roundTreeSprite(0), S.roundTreeSprite(1)]
  const bushes = [S.bushSprite(true), S.bushSprite(false)]
  const rocks = [S.buriedRockSprite(0), S.buriedRockSprite(1)]
  const lamps = [], prints = [], patches = [], ponds = []
  let nLamp = 0
  const lampAt = (x, z) => {
    const o = placeDecor('lamp', nLamp % 2 ? lampB : lampA, x, z, { r: 1.4, hw: 0.5, hgt: 2.6 })
    if (o) { lamps.push([x, z]); nLamp++ }
    return o
  }
  const bunnyAt = (x, z) => placeDecor('bunny', bunny, x, z, { r: 0.8, hw: 0.4, hgt: 0.8, extra: { detail: true, hop: hash(X(x), Y(z)) * 9 } })
  const fenceAt = (x, z, seed) => {
    const o = placeDecor('fence', fence, x, z, { r: 0.9, hw: 1, hgt: 0.9 })
    if (o) driftAt(x + (seed % 2 ? 1.1 : -1.1), z + 0.1, 12 + (seed % 3) * 3, seed) // 울타리 끝에 쌓인 눈
    return o
  }
  const treeAt = (x, z, spr, r = TREE.minSpacing) => {
    if (!inMap(x, z) || hitsShop(x, z, spr.w / T / 2, spr.h / T, SHOP.clearTree) || nearDoorway(x, z, 1) || inPlaza(x, z, 1.6)) return null
    if (distToStreets(x, z) < 0.9 || distToStreets(x, z - (spr.h / T) * 0.5) < 0.6 || !free(x, z, r)) return null
    taken.push([x, z, r])
    return add('tree', spr, x, z)
  }
  // 가장 가까운 길 위 지점 (발자국 끝)
  const roadPoint = (x, z) => {
    let best = null
    for (const s of STREETS) for (let i = 0; i < s.pts.length - 1; i++) {
      const a = s.pts[i], b = s.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1e-9
      const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2))
      const q = [a[0] + dx * u, a[1] + dz * u], d = Math.hypot(q[0] - x, q[1] - z)
      if (!best || d < best.d) best = { d, q }
    }
    return best.q
  }

  // 1) 북쪽 광장: 크리스마스 트리 + 가로등 2 + 벤치 1
  add('tree', S.plazaTreeSprite(), PLAZA.x, PLAZA.z + 0.6)
  taken.push([PLAZA.x, PLAZA.z, 2])
  for (let k = 0; k < DECOR.plazaLamps; k++) {
    const a = Math.PI * (0.25 + k * 0.5)
    const x = PLAZA.x + Math.cos(a) * (PLAZA.r + 0.8), z = PLAZA.z + Math.sin(a) * (PLAZA.r + 0.8)
    lamps.push([x, z]); taken.push([x, z, 1.2]); add('lamp', k % 2 ? lampB : lampA, x, z); nLamp++
  }
  for (const [dx, dz] of [[0, 1.6], [-1, 1.2], [1, 1.2], [-1.3, 0], [1.3, 0]]) {
    const x = PLAZA.x + dx * (PLAZA.r + 1.4), z = PLAZA.z + dz * (PLAZA.r + 0.2)
    if (onSnow(x, z) && !hitsShop(x, z, 1, 1, SHOP.clearDecor) && !nearDoorway(x, z) && free(x, z, 1.5)) { add('bench', bench, x, z); taken.push([x, z, 1.5]); break }
  }
  // 2) 출발점 이정표
  const [sx, sz] = NODES[START_NODE]
  add('sign', signpost, sx - 2.4, sz + 0.4); taken.push([sx - 2.4, sz + 0.4, 1.5])

  // 3) 가게 발치 눈더미 (가게마다 수·크기·모양이 다르게, 문 쪽은 피해서 양 모서리)
  const dr = rng(MAP_SEED ^ 0xd21f7)
  buildings.forEach((o, i) => {
    const [lo, hi] = SHOP.drifts
    const n = lo + ((dr() * (hi - lo + 1)) | 0)
    const doorSide = (o.spr.doorX ?? 0.5) < 0.5 ? -1 : 1
    const sides = n === 1 ? [-doorSide] : [-1, 1]
    for (const side of sides) {
      const w = 12 + ((dr() * 9) | 0)
      const spr = S.driftSprite(w, (i + 1) * 977 + side * 31)
      objs.push({ kind: 'drift', spr, x: Math.round(o.x + side * (o.spr.w * 0.5 - w * 0.35)), y: o.y + 2 })
    }
  })

  // 4) 직접 고른 빈터에 작은 테마 공간 (SPACES.anchors) — 각 3~5개 소품이 한 장면
  const spaces = []
  SPACES.anchors.forEach(({ x, z, theme, variant: v }, si) => {
    const road = roadPoint(x, z)
    const before = objs.length
    if (theme === 'christmas') {
      add('tree', S.plazaTreeSprite(), x, z); taken.push([x, z, 2.2])
      patches.push([x, z + 0.5, 2.8])
      for (const [gx, gz, k] of [[-1.3, 0.5, 0], [1.2, 0.6, 1], [0.3, 1.1, 2]]) add('gift', gifts[k], x + gx, z + gz, { detail: true })
      fenceAt(x - 2.7, z + 2.4, si); fenceAt(x + 2.7, z + 2.4, si + 1)
      lampAt(x - 3.3, z + 0.4) || lampAt(x + 3.3, z + 0.4)
      prints.push([x, z + 2.8, ...road])
    } else if (theme === 'rest') {
      if (placeDecor('bench', bench, x, z, { r: 1.4, hw: 1, hgt: 1 })) {
        patches.push([x, z + 0.5, 2.1])
        if (v === 0) {
          lampAt(x - 2, z - 0.2)
          placeDecor('snowman', snowmen[0], x + 2.1, z + 0.3, { r: 1.1, hw: 0.6, hgt: 1.9 })
          driftAt(x + 3.1, z + 0.5, 14, si)
        } else {
          lampAt(x + 2, z - 0.2)
          placeDecor('planter', planter, x - 1.9, z + 0.1, { r: 1, hw: 0.7, hgt: 1 })
          treeAt(x - 0.6, z - 1.7, ribbonPine, 1)
        }
        prints.push([x, z + 1, ...road])
      }
    } else if (theme === 'garden') {
      // 정원마다 구성이 다르게: 0 침엽수 삼각형+관목+울타리+토끼 / 1 둥근 나무+리본 침엽수+관목+울타리
      //                        2 비대칭 침엽수+바위+눈더미+토끼 / 3 침엽수 둘+작은 눈사람+관목+울타리
      const lay = [
        [[-1.4, -0.9, pines[0]], [0.3, -1.8, pines[2]], [1.6, -0.7, pines[1]]],
        [[-1.5, -1.0, rounds[0]], [0.5, -1.6, rounds[1]], [1.8, -0.6, ribbonPine]],
        [[-1.8, -0.4, pines[1]], [-0.4, -1.5, pines[0]], [1.4, -1.2, pines[0]]],
        [[-1.2, -1.2, pines[0]], [1.0, -1.4, pines[1]]],
      ][v % 4]
      for (const [dx, dz, spr] of lay) treeAt(x + dx, z + dz, spr, 1)
      if (v === 0 || v === 1 || v === 3) placeDecor('bush', bushes[v % 2], x - 2.3 + v * 0.3, z + 0.3, { r: 0.7, hw: 0.5, hgt: 0.6 })
      if (v !== 2) fenceAt(x + 0.3, z + 1.5, si)
      if (v === 0 || v === 2) { bunnyAt(x + 0.9, z + 0.4); prints.push([x + 0.9, z + 0.7, ...road]) }
      if (v === 2) { placeDecor('rock', rocks[0], x + 0.2, z + 0.6, { r: 0.8, hw: 0.5, hgt: 0.5, extra: { detail: true } }); driftAt(x - 1.4, z + 0.7, 16, si) }
      if (v === 3) placeDecor('snowman', snowmen[1], x - 0.2, z + 0.2, { r: 1, hw: 0.6, hgt: 1.9 })
    } else if (theme === 'pond') {
      // 얼음 연못 (바닥에 그림) + 둘레 눈더미 + 바위 + 나무 한 그루
      const rx = 2.3 + v * 0.4, rz = 1.1 + v * 0.2
      ponds.push([x, z, rx, rz])
      taken.push([x, z, Math.max(rx, rz) + 0.6])
      driftAt(x - rx - 0.3, z + 0.2, 16, si); driftAt(x + rx * 0.6, z + rz + 0.3, 14, si + 1); driftAt(x + rx + 0.2, z - 0.3, 12, si + 2)
      placeDecor('rock', rocks[v % 2], x - rx * 0.5, z - rz - 0.4, { r: 0.8, hw: 0.5, hgt: 0.5, extra: { detail: true } })
      if (v === 1) treeAt(x + rx + 0.8, z - rz - 0.6, ribbonPine, 1)
      else treeAt(x - rx - 0.6, z - rz - 0.5, pines[1], 1)
    }
    if (objs.length > before || theme === 'pond') spaces.push({ x, z, theme })
  })

  // 5) 길가 후보 자리: 걷는 길 양옆, 그려진 길 가장자리 바로 바깥 눈 위 (1칸 간격)
  const cands = []
  STREETS.forEach((s) => {
    for (let t = 1.5; t < s.len - 1.5; t += 1) {
      let i = 0
      while (i < s.pts.length - 2 && s.cum[i + 1] < t) i++
      const a = s.pts[i], b = s.pts[i + 1]
      const L = s.cum[i + 1] - s.cum[i] || 1
      const u = (t - s.cum[i]) / L
      const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L
      const ox = a[0] + (b[0] - a[0]) * u, oz = a[1] + (b[1] - a[1]) * u
      for (const side of [1, -1]) {
        const nx = -tz * side, nz = tx * side
        const x = ox + nx * (ROAD.half + 1.0), z = oz + nz * (ROAD.half + 1.0)
        if (!onSnow(x, z, 5) || hitsShop(x, z, 1, 1.5, SHOP.clearDecor) || nearDoorway(x, z, 0.3) || inPlaza(x, z, 1)) continue
        let near = null
        for (const r of shopRects) {
          const d = Math.hypot(Math.max(r.x0 - x, 0, x - r.x1), Math.max(r.z0 - z, 0, z - r.z1))
          if (!near || d < near.d) near = { d, st: r.store }
        }
        cands.push({ x, z, tx, tz, nx, nz, road: [ox, oz], edge: [ox + nx * (ROAD.half + 0.35), oz + nz * (ROAD.half + 0.35)], main: s.main, near })
      }
    }
  })
  const cr = rng(MAP_SEED ^ 0x5eed)
  for (let i = cands.length - 1; i > 0; i--) { const j = (cr() * (i + 1)) | 0; [cands[i], cands[j]] = [cands[j], cands[i]] }

  // 6) 길가 작은 장면(비넷): 근처 가게 성격에 맞춰, 장면·테마 공간과 넉넉히 떨어뜨림
  const THEME = { cafe: 'rest', food: 'sign', gift: 'lights' }
  const scenes = spaces.map((sp) => ({ x: sp.x, z: sp.z }))
  const count = { rest: 0, sign: 0, lights: 0, snow: 0 }
  const far = (x, z) => scenes.every((sc) => Math.hypot(sc.x - x, sc.z - z) >= DECOR.sceneSpacing)
  const [fromMin, fromMax] = DECOR.sceneFromShop
  for (const pass of ['lights', 'sign', 'rest', 'snow']) for (const c of cands) {
    let theme = null
    if (c.near.d >= fromMin && c.near.d <= fromMax) theme = THEME[c.near.st.type]
    else if (c.near.d > fromMax + 4) theme = 'snow'
    if (theme !== pass || count[theme] >= DECOR.max[theme] || !far(c.x, c.z)) continue
    const along = (k) => [c.x + c.tx * k, c.z + c.tz * k]
    if (theme === 'rest') {
      if (!placeDecor('bench', bench, c.x, c.z, { r: 1.6, hw: 1, hgt: 1 })) continue
      for (const k of [1.9, -1.9]) if (lampAt(...along(k))) break
      const extra = cr()
      if (extra < DECOR.planterChance) placeDecor('planter', planter, ...along(-1.8), { r: 1, hw: 0.7, hgt: 1, extra: { detail: true } })
      else if (extra < DECOR.planterChance + DECOR.stumpChance) placeDecor('stump', stump, ...along(-1.9), { r: 1, hw: 0.8, hgt: 1.1, extra: { detail: true } })
    } else if (theme === 'sign') {
      if (!placeDecor('sign', cafeSign, c.x, c.z, { r: 1.3, hw: 0.5, hgt: 1.3 })) continue
      for (const k of [1.6, -1.6]) if (lampAt(...along(k))) break
    } else if (theme === 'lights') {
      if (!onSnow(c.x - 1.2, c.z) || !onSnow(c.x + 1.2, c.z)) continue
      if (!placeDecor('lights', lights, c.x, c.z, { r: 1.8, hw: 1.3, hgt: 1.3 })) continue
      fenceAt(...along(2.4), count.lights) || fenceAt(...along(-2.4), count.lights + 1)
    } else if (theme === 'snow') {
      const mx = c.x + c.nx * 0.6, mz = c.z + c.nz * 0.6
      if (!placeDecor('snowman', snowmen[count.snow % 2], mx, mz, { r: 1.3, hw: 0.6, hgt: 1.9 })) continue
      prints.push([mx, mz + 0.3, c.road[0], c.road[1]])
      driftAt(mx + (count.snow % 2 ? 1.1 : -1.1), mz + 0.2, 12, count.snow)
    }
    scenes.push({ x: c.x, z: c.z, theme })
    count[theme]++
  }

  // 7) 장면 없는 큰길에 드문드문 가로등
  let roadLamps = 0
  for (const c of cands) {
    if (roadLamps >= DECOR.roadLamps.max) break
    if (!c.main || scenes.some((sc) => Math.hypot(sc.x - c.x, sc.z - c.z) < 6)) continue
    if (lamps.some(([x, z]) => Math.hypot(x - c.x, z - c.z) < DECOR.roadLamps.every)) continue
    if (lampAt(c.x, c.z)) roadLamps++
  }

  // 8) 큰 갈림길 방향 표지판
  const deg = {}
  EDGES.forEach(([a, b]) => { deg[a] = (deg[a] || 0) + 1; deg[b] = (deg[b] || 0) + 1 })
  const junctions = Object.keys(NODES).filter((n) => n.startsWith('v') && deg[n] >= 3)
  const signs = [[sx, sz]]
  for (const n of junctions) {
    if (signs.length - 1 >= DECOR.junctionSigns) break
    const [jx, jz] = NODES[n]
    if (signs.some(([x, z]) => Math.hypot(x - jx, z - jz) < 22)) continue
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.4
      const x = jx + Math.cos(a) * 2.4, z = jz + Math.sin(a) * 2.4
      if (placeDecor('sign', signpost, x, z, { r: 1.5, hw: 0.7, hgt: 1.7 })) { signs.push([x, z]); break }
    }
  }

  // 9) 소품샵 앞 작은 선물 상자 (몇 곳만, 문 반대쪽 옆에)
  const giftShops = buildings.filter((o) => o.store.type === 'gift')
  for (let k = 0, i = (cr() * giftShops.length) | 0; k < Math.min(DECOR.gifts, giftShops.length); k++, i = (i + 2) % giftShops.length) {
    const o = giftShops[i]
    const away = (o.spr.doorX ?? 0.5) < 0.5 ? 1 : -1
    for (const side of [away, -away]) {
      const x = WX(o.x + side * (o.spr.w * 0.5 + 8)), z = WZ(o.y) + 0.2
      if (!inMap(x, z) || !onSnow(x, z, 3) || nearDoorway(x, z, -0.4) || hitsShop(x, z, 0.3, 0.7, 0) || !free(x, z, 0.8)) continue
      add('gift', gifts[k % gifts.length], x, z, { detail: true }); taken.push([x, z, 0.8])
      break
    }
  }

  // 10) 리본 단 작은 침엽수: 길가 군데군데 (서로 멀리)
  const ribbons = []
  for (const c of cands) {
    if (ribbons.length >= DECOR.ribbonPines) break
    const x = c.x + c.nx * 0.7, z = c.z + c.nz * 0.7
    if (c.near.d < 2.5 || ribbons.some(([rx, rz]) => Math.hypot(rx - x, rz - z) < 18) || scenes.some((sc) => Math.hypot(sc.x - x, sc.z - z) < 5)) continue
    if (distToStreets(x, z - 1) < 0.6) continue
    if (placeDecor('tree', ribbonPine, x, z, { r: 1.1, hw: 0.7, hgt: 2 })) { ribbons.push([x, z]); driftAt(x + 0.9, z + 0.2, 12, ribbons.length) }
  }

  // 11) 작은 동물: 토끼·고양이 몇 마리만, 서로 멀리
  const critters = []
  const cats = [S.catSprite(C.snowHi, C.snowMid, C.snowHi), S.catSprite(C.woodLight, C.woodDark, C.paper)]
  const critter = (place) => {
    for (const c of cands) {
      const x = c.x + c.nx * 0.8, z = c.z + c.nz * 0.8
      if (critters.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 16) || scenes.some((sc) => Math.hypot(sc.x - x, sc.z - z) < 4)) continue
      if (place(x, z)) { critters.push([x, z]); return }
    }
  }
  for (let n = 0; n < DECOR.bunnies; n++) critter(bunnyAt)
  for (let n = 0; n < DECOR.cats; n++) critter((x, z) => placeDecor('cat', cats[n % cats.length], x, z, { r: 1, hw: 0.4, hgt: 0.8, extra: { detail: true } }))

  // 12) 길 가장자리 작은 눈더미 (서로 멀리, 장면·문 앞 피해서) — 길과 눈밭이 이어지게
  const roadDrifts = []
  for (const c of cands) {
    if (roadDrifts.length >= DECOR.roadDrifts) break
    const [x, z] = c.edge
    if (roadDrifts.some(([dx, dz]) => Math.hypot(dx - x, dz - z) < 6) || scenes.some((sc) => Math.hypot(sc.x - x, sc.z - z) < 2.5)) continue
    if (!taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 1.2)) continue
    if (driftAt(x, z, 10 + ((cr() * 8) | 0), roadDrifts.length)) roadDrifts.push([x, z])
  }

  // 13) 나무: 포아송 디스크로 군집 중심 → 삼각형·비대칭 구도로 2~4그루, 발치엔 관목·눈더미
  const tr = rng(MAP_SEED)
  const hw = MAP_W / 2 - 0.8, hh = MAP_H / 2 - 0.5
  const treeOK = (x, z, spr) => {
    const w = spr.w / T / 2, h = spr.h / T
    if (Math.abs(x) > hw || Math.abs(z) > hh) return false
    if (distToStreets(x, z) < TREE.roadClear * 0.55) return false
    if (distToStreets(x, z - h * 0.45) < 0.8 || distToStreets(x, z - h * 0.85) < 0.5) return false // 나무 윗부분이 길을 덮지 않게
    if (hitsShop(x, z, w, h, SHOP.clearTree) || nearDoorway(x, z, 1) || inPlaza(x, z, 1.6)) return false
    if (spaces.some((sp) => Math.hypot(sp.x - x, sp.z - z) < SPACES.clear)) return false
    return free(x, z, TREE.minSpacing)
  }
  const centers = poisson(hw * 2, hh * 2, TREE.clusterSpacing, tr).map(([x, z]) => [x - hw, z - hh])
  // 순서 섞기 — 목표 수에 먼저 닿아도 지도 한쪽만 채워지지 않게 (씨앗 고정이라 매번 같음)
  for (let i = centers.length - 1; i > 0; i--) { const j = (tr() * (i + 1)) | 0; [centers[i], centers[j]] = [centers[j], centers[i]] }
  const grove = valueNoise(MAP_SEED % 997, TREE.groveSize)
  let nTree = 0
  for (const [cx, cz] of centers) {
    if (nTree >= TREE.target) break
    const ds = distToStreets(cx, cz)
    const edge = Math.min(hw - Math.abs(cx), hh - Math.abs(cz))
    let w = smoothstep((ds - TREE.roadClear) / (TREE.denseFrom - TREE.roadClear))
    if (edge < TREE.edgeBoost) w = Math.max(w, 0.95 - edge * 0.05)
    if (shopDist(cx, cz) < SHOP.clearTree + 3) w *= 0.25
    w *= TREE.clearingFloor + (1 - TREE.clearingFloor) * smoothstep((grove(cx, cz) - TREE.groveCut) / 0.3) // 빈터도 완전히 비우진 않음
    if (tr() > w * (1 - TREE.openChance)) continue
    // 구도 하나를 골라 좌우 뒤집고 살짝 흔들기 — 대표 나무 종류 + 가끔 다른 종류
    const lay = CLUSTERS[(tr() * CLUSTERS.length) | 0]
    const flip = tr() < 0.5 ? -1 : 1, jit = 0.85 + tr() * 0.3
    const pineLead = w > 0.7 ? tr() < 0.75 : tr() < 0.4
    const placed = []
    for (const [ox, oz] of lay) {
      const x = cx + ox * flip * jit + (tr() - 0.5) * 0.25, z = cz + oz * jit + (tr() - 0.5) * 0.2
      const pine = tr() < 0.82 ? pineLead : !pineLead
      const spr = pine ? pines[tr() < 0.55 ? 0 : tr() < 0.5 ? 1 : 2] : rounds[(tr() * 2) | 0]
      if (!treeOK(x, z, spr)) continue
      add('tree', spr, x, z); taken.push([x, z, TREE.minSpacing]); placed.push([x, z]); nTree++
    }
    if (!placed.length) continue
    // 발치: 관목 또는 작은 눈더미 (맨 앞 나무 옆)
    const front = placed.reduce((a, b) => (b[1] > a[1] ? b : a))
    const side = tr() < 0.5 ? -1 : 1
    const bx = front[0] + side * (0.8 + tr() * 0.3), bz = front[1] + 0.3
    const roll = tr()
    if (roll < TREE.bushChance && Math.abs(bx) < hw && distToStreets(bx, bz) > 1 && !hitsShop(bx, bz, 0.5, 0.8, SHOP.clearDecor) && !nearDoorway(bx, bz) && taken.every(([tx, tz]) => Math.hypot(tx - bx, tz - bz) >= 0.7)) {
      add('bush', bushes[tr() < 0.7 ? 0 : 1], bx, bz); taken.push([bx, bz, 0.7])
    } else if (roll > 1 - TREE.driftChance) driftAt(front[0] - side * 0.7, front[1] + 0.25, 10 + ((tr() * 8) | 0), nTree)
  }
  // 14) 눈에 반쯤 묻힌 바위 — 나무 군집 가까이에만
  const treeList = objs.filter((o) => o.kind === 'tree')
  for (let n = 0, tries = 0; n < TREE.rocks && tries < 400 && treeList.length; tries++) {
    const t = treeList[(tr() * treeList.length) | 0]
    const x = WX(t.x) + (tr() - 0.5) * 3, z = WZ(t.y) + 0.6 + tr() * 0.8
    if (distToStreets(x, z) < 1.6 || shopDist(x, z) < SHOP.clearDecor + 1.5 || !free(x, z, 3) || inPlaza(x, z, 1)) continue
    add('rock', rocks[n % 2], x, z, { detail: true }); taken.push([x, z, 3]); n++
  }

  objs.sort((a, b) => a.y - b.y)
  return { objs, buildings, lamps, prints, patches, ponds, lanes, shopRects, spaces }
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

// 걷는 길 영역: 모두 같은 폭(ROAD.half)의 매끈한 길 + 광장 → 갈래 사이 홈을 둥글게 메운 한 덩어리 (1 = 길)
function walkMask() {
  const m = mask((c) => {
    c.lineWidth = ROAD.half * 2 * T
    SMOOTH.forEach((s) => poly(c, s.pts))
    c.beginPath(); c.arc(X(PLAZA.x), Y(PLAZA.z), PLAZA.r * T, 0, Math.PI * 2); c.fill()
  })
  const walk = new Uint8Array(GW * GH)
  for (let i = 0; i < walk.length; i++) walk[i] = m[i * 4 + 3] >= 128 ? 1 : 0
  return closeMask(walk, GW, GH, 10)
}

// ── 바닥 ──
//  눈밭: 무늬 없는 맑은 바탕 (규칙적인 점·체크·타원 언덕 없음)
//  걷는 길: 판석 돌길이 기본 표면, 가장자리로 1~3도트만 눈이 들어옴 (2도트 단위), 드물게 작은 눈 뭉치
//  가게 연결로: 실제 문 → 문 앞 → 길까지 짧은 밟힌 눈길, 문 바로 앞만 판석 몇 장
//  얼음 연못: 단순한 픽셀 얼음 면 (테두리·하이라이트 몇 줄)
function drawGround({ objs, lamps, prints, patches, ponds, lanes }, walkC) {
  const cv = canvas(GW, GH)
  const g = cv.getContext('2d')
  const N = GW * GH
  const Q = DETAIL_PX
  const q = (v) => v - (v % Q)
  const edgeD = edt(walkC.map((v) => 1 - v), GW, GH) // 길 밖까지 거리²
  const laneM = mask((c) => {
    c.lineWidth = SHOP.laneWidth * T
    lanes.forEach((pts) => poly(c, pts))
    patches.forEach(([x, z, r]) => { c.beginPath(); c.ellipse(X(x), Y(z), r * T, r * T * 0.55, 0, 0, Math.PI * 2); c.fill() })
  })
  const doors = lanes.map(([d]) => [X(d[0]), Y(d[1])])
  const edgeN = valueNoise(MAP_SEED & 255, 9) // 길 가장자리 눈 (덩어리 9도트)
  const [eMin, eMax] = ROAD.edgeSnow

  // 0 눈밭, 1 판석 길, 2 밟힌 눈 (가게 연결로·장면 바닥), 3 얼음
  const kind = new Uint8Array(N)
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      if (walkC[i]) {
        // 가장자리 눈: 2도트 단위 블록마다 1~3도트 (반폭의 약 10~15%)
        const n = eMin + Math.round(edgeN(q(x), q(y)) * (eMax - eMin))
        kind[i] = Math.sqrt(edgeD[i]) <= n ? 0 : 1
      } else if (laneM[i * 4 + 3] >= 128) {
        let nearDoor = Infinity
        for (const [dx, dy] of doors) { const d = Math.hypot(x - dx, (y - dy) * 1.5); if (d < nearDoor) nearDoor = d }
        kind[i] = nearDoor < 9 ? 1 : 2 // 문 바로 앞은 판석 몇 장
      }
    }
  // 얼음 연못 (2도트 단위 타원)
  for (const [x, z, rx, rz] of ponds) {
    const cx = X(x), cy = Y(z), RX = rx * T, RY = rz * T
    for (let y = cy - RY; y <= cy + RY; y += Q)
      for (let xx = cx - RX; xx <= cx + RX; xx += Q) {
        if (((xx - cx) / RX) ** 2 + ((y - cy) / RY) ** 2 > 1) continue
        for (let k = 0; k < Q * Q; k++) { const px = q(xx) + (k % Q), py = q(y) + ((k / Q) | 0); if (px >= 0 && py >= 0 && px < GW && py < GH) kind[py * GW + px] = 3 }
      }
  }

  const img = g.createImageData(GW, GH)
  const out = new Uint32Array(img.data.buffer)
  const P = {
    snow: u32(C.snow), hi: u32(C.snowHi), shade: u32(C.snowShade),
    stone: u32(C.path), stone2: u32(C.stone), stone3: u32(C.stoneLight), mortar: u32(C.stoneDark), rim: u32(mix(C.stoneDark, C.path, 0.3)),
    trod: u32(C.snowTrod), trodEdge: u32(mix(C.snowTrod, C.snowShade, 0.6)),
    ice: u32('#D3E2EA'), iceHi: u32('#EAF2F6'), iceRim: u32('#B9CCD8'),
  }
  const K = (x, y) => (x < 0 || y < 0 || x >= GW || y >= GH ? 0 : kind[y * GW + x])
  const [BW, BH] = ROAD.brick
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const i = y * GW + x
      const k = kind[i]
      let col = P.snow
      if (k === 1) {
        const up = K(x, y - 1)
        if (up !== 1) col = P.shade // 위쪽 눈둑이 길에 드리운 옅은 푸른 그늘 (1도트)
        else if (K(x - 1, y) !== 1 || K(x + 1, y) !== 1 || K(x, y + 1) !== 1) col = P.rim
        else {
          // 판석: 작은 엇갈린 판석, 낮은 대비 (줄눈과 판석 톤 차이를 작게)
          const row = Math.floor(y / BH), off = (row & 1) * (BW >> 1)
          const bx = (x + off) % BW, by = y % BH
          const t2 = hash(((x + off) / BW) | 0, row)
          col = bx === 0 || by === 0 ? P.mortar : t2 < 0.45 ? P.stone : t2 < 0.8 ? P.stone2 : P.stone3
        }
      } else if (k === 2) {
        col = K(x, y - 1) === 0 ? P.trodEdge : P.trod
      } else if (k === 3) {
        const up = K(x, y - Q), dn = K(x, y + Q)
        col = up !== 3 ? P.iceHi : dn !== 3 || K(x + Q, y) !== 3 ? P.iceRim : P.ice
      } else if (K(x, y + 1) === 1) col = P.hi // 길 바로 위 눈둑 하이라이트
      out[i] = col
    }
  g.putImageData(img, 0, 0)

  const p = painter(g)
  // 얼음 위 하이라이트 줄 몇 개
  for (const [x, z, rx] of ponds) {
    const cx = X(x), cy = Y(z)
    p.rect(q(cx - rx * T * 0.45), q(cy - 4), 10, 2, '#FFFFFF'); p.rect(q(cx - rx * T * 0.2), q(cy + 2), 6, 2, '#FFFFFF'); p.rect(q(cx + rx * T * 0.25), q(cy - 2), 4, 2, '#F2F7FA')
  }
  // 판석 위 작은 눈 뭉치 (아주 드물게, 2도트 단위)
  const tr = rng(MAP_SEED ^ 0x70f7)
  let roadPx = 0
  for (let i = 0; i < N; i++) if (kind[i] === 1) roadPx++
  const nTufts = Math.round((roadPx / (T * T)) * ROAD.tufts)
  for (let n = 0, tries = 0; n < nTufts && tries < nTufts * 40; tries++) {
    const x = q((tr() * GW) | 0), y = q((tr() * GH) | 0)
    if (kind[y * GW + x] !== 1 || edgeD[y * GW + x] < 36) continue
    const w = 4 + q((tr() * 4) | 0)
    p.rect(x, y, w, 2, C.snowHi); p.rect(x + 2, y - 2, Math.max(2, w - 4), 2, C.snowHi); p.rect(x, y + 2, w, 1, C.snowShade)
    n++
  }
  // 발자국 (눈사람·토끼·테마 공간 → 길): 눈 위에만, 2도트 크기
  prints.forEach(([x0, z0, x1, z1]) => {
    const L = Math.hypot(x1 - x0, z1 - z0) || 1
    const nx = -(z1 - z0) / L, nz = (x1 - x0) / L
    for (let d = 0.5, k = 0; d < L - 0.3; d += 0.34, k++) {
      const sd = k % 2 ? 0.13 : -0.13
      const px = X(x0 + ((x1 - x0) * d) / L + nx * sd), py = Y(z0 + ((z1 - z0) * d) / L + nz * sd)
      if (kind[py * GW + px] !== 0) continue
      p.rect(q(px), q(py), 2, 2, C.snowMid)
    }
  })
  // 가로등 아래 은은한 불빛 (작고 옅게, 2단계)
  g.fillStyle = C.light
  for (const [x, z] of lamps) {
    const cx = X(x), cy = Y(z) + 1, rx = 10, ry = 3
    for (let yy = -ry; yy <= ry; yy++)
      for (let xx = -rx; xx <= rx; xx++) {
        const d = Math.hypot(xx / rx, yy / ry)
        if (d > 1) continue
        g.globalAlpha = d < 0.6 ? 0.35 : ((xx + yy) & 1) === 0 ? 0.22 : 0
        if (g.globalAlpha) g.fillRect(cx + xx, cy + yy, 1, 1)
      }
  }
  g.globalAlpha = 1
  // 그림자: 모두 같은 방향(오른쪽 아래)·같은 옅은 블루그레이, 가게는 건물 바닥에 붙은 납작한 그림자
  for (const o of objs) {
    const w = o.spr.w, dx = SHADOW.dx, dy = SHADOW.dy
    if (o.kind === 'shop') p.rrect(o.x - w * 0.42 + dx, o.y - 4 + dy, w * 0.88, 6, 3, C.snowShade)
    else if (o.kind === 'tree') p.ellipse(o.x + dx, o.y - 1 + dy, w * 0.34, 2.6, C.snowShade)
    else if (o.kind !== 'drift') p.ellipse(o.x + dx * 0.7, o.y - 0.5 + dy, w * 0.38, 1.8, C.snowShade)
  }
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
