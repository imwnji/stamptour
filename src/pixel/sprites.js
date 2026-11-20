// 도트 스프라이트 — 전부 코드로 한 픽셀씩 그림 (외부 이미지 없음)
//  1칸(월드 1) = 16px. 빛은 왼쪽 위에서. 외곽선은 draw.js autoOutline 이 자동으로.
import { C, shade } from './colors.js'
import { sprite, mirror, withScale } from './draw.js'

export const SHOP_K = 1.5 // 가게 크기 배율 (stores.js layoutStores 의 shopScale 과 같게)

const lt = (h, k = 1.16) => shade(h, k)
const dk = (h, k = 0.84) => shade(h, k)

// ── 공통 조각 ──
function pineTier(P, cx, top, h, w, snowy = true) {
  for (let r = 0; r < h; r++) {
    const hw = Math.max(1, Math.round(((r + 1) / h) * (w / 2)))
    P.rect(cx - hw, top + r, hw * 2, 1, r === h - 1 ? C.pineDark : C.pine)
    const sh = Math.round(hw * 0.38)
    P.rect(cx + hw - sh, top + r, sh, 1, r === h - 1 ? C.pineDeep : C.pineDark)
    if (hw > 2) P.px(cx - hw, top + r, C.pineLight)
    if (snowy && r < Math.ceil(h * 0.45)) {
      const sw = Math.round(hw * (r === Math.ceil(h * 0.45) - 1 ? 1.2 : 1.45))
      P.rect(cx - hw, top + r, Math.min(sw, hw * 2), 1, C.snow)
      if (r === 0 || r === 1) P.rect(cx - hw, top + r, Math.max(1, Math.round(hw * 0.8)), 1, C.snowHi)
    }
  }
  // 눈이 끝나는 자리를 들쭉날쭉하게
  if (snowy) {
    const r = Math.ceil(h * 0.45)
    const hw = Math.round(((r + 1) / h) * (w / 2))
    for (let x = cx - hw + 1; x < cx + hw * 0.7; x += 3) P.px(x, top + r, C.snowMid)
  }
}

function snowLumps(P, x0, x1, y, r = 2, col = C.snow) {
  for (let x = x0; x <= x1; x += r * 2 + 1) P.ellipse(x + r, y, r + 0.5, r * 0.8, col)
}

function glowWindow(P, x, y, w, h, frame = C.woodDark, { cross = true, sill = true } = {}) {
  P.rect(x - 1, y - 1, w + 2, h + 2, frame)
  P.rect(x, y, w, h, C.glow)
  P.rect(x, y, Math.max(1, Math.round(w * 0.35)), Math.max(1, Math.round(h * 0.35)), C.glowLight)
  P.rect(x, y + h - 1, w, 1, C.glowDark)
  if (cross) {
    P.rect(x + Math.floor(w / 2), y, 1, h, frame)
    P.rect(x, y + Math.floor(h / 2), w, 1, frame)
  }
  if (sill) {
    P.rect(x - 2, y + h + 1, w + 4, 2, C.wood)
    P.rect(x - 2, y + h, w + 4, 1, C.snow)
  }
}

function archDoor(P, x, y, w, h) {
  P.arch(x - 1, y - 1, w + 2, h + 1, C.woodDeep)
  P.arch(x, y, w, h, C.wood)
  P.rect(x, y + h - 1, w, 1, C.woodDark)
  for (let px = x + 2; px < x + w - 1; px += 3) P.rect(px, y + Math.round(w / 2) + 6, 1, h - Math.round(w / 2) - 7, C.woodDark)
  P.rect(x + 2, y + 2, w - 4, Math.max(3, Math.round(w / 2)), C.glow)
  P.rect(x + 2, y + 2, Math.max(1, Math.round((w - 4) / 2)), 2, C.glowLight)
  P.rect(x + Math.floor(w / 2), y + 2, 1, Math.max(3, Math.round(w / 2)), C.woodDark)
  P.px(x + w - 3, y + Math.round(h * 0.6), C.glowDark)
}

function stripedAwning(P, x, y, w, h, col, solid = false) {
  const light = C.snowHi
  for (let i = 0; i < w; i++) {
    const c = solid ? col : Math.floor(i / 4) % 2 ? light : col
    P.rect(x + i, y, 1, h, c)
    // 아래 둥근 술
    if (i % 4 !== 3) P.px(x + i, y + h, c)
  }
  P.rect(x, y, w, 1, dk(solid ? col : col, 0.8))
  for (let i = 0; i < w; i += 4) P.px(x + i + 1, y + h + 1, solid ? col : (Math.floor(i / 4) % 2 ? light : col))
  // 차양 위 눈
  P.rect(x - 1, y - 2, w + 2, 2, C.snow)
  P.rect(x, y - 2, w, 1, C.snowHi)
}

function snowBase(P, x, w, y) {
  P.rect(x, y, w, 2, C.snow)
  for (let i = x; i < x + w; i += 7) P.ellipse(i + 3, y + 0.5, 3.5, 1.6, C.snow)
  P.rect(x + 2, y + 1, w - 4, 1, C.snowMid)
}

// 업종 아이콘 (간판용 6x6)
function icon(P, type, x, y, col) {
  if (type === 'cafe') {
    P.rect(x, y + 2, 5, 4, col); P.px(x + 5, y + 3, col); P.px(x + 5, y + 4, col)
    P.px(x + 1, y, col); P.px(x + 3, y + 1, col)
  } else if (type === 'gift') {
    P.rect(x, y + 2, 6, 4, col); P.rect(x + 2, y + 2, 2, 4, C.paper); P.px(x + 1, y + 1, col); P.px(x + 4, y + 1, col)
  } else {
    P.rect(x, y + 3, 6, 2, col); P.rect(x + 1, y + 5, 4, 1, col); P.px(x + 1, y + 1, col); P.px(x + 3, y, col); P.px(x + 4, y + 1, col)
  }
}

// ── 공통 가게 (11곳) — 가게마다 벽·차양·간판 색이 다름 ──
function genericShop(s) {
  const wall = s.wall, aw = s.awning
  return sprite(60, 66, (P) => {
    // 벽
    P.rect(4, 34, 52, 28, wall)
    P.rect(4, 34, 2, 28, lt(wall, 1.3))
    P.rect(52, 34, 4, 28, dk(wall, 0.9))
    P.rect(4, 56, 52, 6, dk(wall, 0.86))
    P.rect(4, 56, 52, 1, dk(wall, 0.78))
    // 처마 (테라코타) + 그늘
    P.rect(1, 30, 58, 5, C.roof)
    P.rect(1, 30, 58, 1, C.roofLight)
    P.rect(1, 34, 58, 1, C.roofDark)
    P.rect(4, 35, 52, 2, dk(wall, 0.78))
    // 구름 같은 눈 지붕
    P.rrect(0, 4, 60, 28, 9, C.snowMid)
    P.rrect(0, 3, 60, 27, 9, C.snow)
    P.rrect(6, 4, 30, 6, 3, C.snowHi)
    for (const [x, r] of [[5, 3], [13, 3.5], [22, 3], [31, 3.5], [40, 3], [49, 3.5], [56, 2.5]]) {
      P.ellipse(x, 30.5, r, 2.6, C.snowMid)
      P.ellipse(x, 29.5, r, 2.4, C.snow)
    }
    // 지붕 위 간판 (업종 아이콘 + 가게 색)
    P.rrect(18, 15, 24, 13, 3, C.woodDark)
    P.rect(20, 17, 20, 9, C.paper)
    P.rect(20, 25, 20, 1, dk(C.paper, 0.9))
    icon(P, s.type, 27, 18, s.color)
    P.rect(19, 13, 22, 2, C.snow)
    P.rect(21, 13, 10, 1, C.snowHi)
    // 차양
    stripedAwning(P, 6, 39, 48, 5, aw, s.awningStyle === 'solid')
    // 창문 · 문
    glowWindow(P, 9, 47, 13, 9)
    glowWindow(P, 41, 47, 9, 9)
    P.rect(26, 46, 11, 16, C.woodDeep)
    P.rect(27, 47, 9, 15, C.wood)
    P.rect(29, 49, 5, 4, C.glow)
    P.rect(29, 49, 2, 2, C.glowLight)
    P.rect(28, 55, 7, 1, C.woodDark)
    P.px(34, 56, C.glowDark)
    // 리스
    P.ellipse(31.5, 45, 3, 2, C.pine)
    P.px(31, 47, C.roof)
    // 업종 소품 (오른쪽 아래)
    if (s.type === 'cafe') {
      P.rect(53, 53, 6, 8, C.woodDark); P.rect(54, 54, 4, 5, '#3E3B3A'); P.px(55, 55, C.paper); P.px(56, 57, C.paper)
      P.rect(53, 52, 6, 1, C.snow)
    } else if (s.type === 'gift') {
      P.rect(54, 58, 5, 4, C.roof); P.tri(56.5, 48, 10, 7, C.pine); P.px(56, 48, C.glowLight); P.px(55, 53, C.glow); P.px(57, 55, C.roofLight)
    } else {
      P.rect(53, 52, 6, 9, C.woodDark); P.rect(54, 53, 4, 6, C.paper); P.rect(54, 54, 4, 1, C.roof); P.rect(54, 56, 3, 1, C.roofLight)
    }
    snowBase(P, 1, 58, 62)
    P.rect(25, 62, 13, 1, C.roofDark)
  })
}

// ── 6곳 고유 모양 (일러스트 시안) ──
// 1) 원모어백 — 가방
function bagShop() {
  const B = '#EFE2CB', BL = '#F7EEDF', BD = '#DCCAAD'
  return sprite(60, 70, (P) => {
    // 손잡이 (고리 윗부분)
    for (let y = 2; y <= 26; y++)
      for (let x = 10; x <= 50; x++) {
        const d = Math.hypot(x + 0.5 - 30, y + 0.5 - 26)
        if (d <= 18 && d >= 13) P.px(x, y, d > 16.5 ? BD : d < 14 ? lt(B, 1.3) : B)
        if (d <= 18.5 && d >= 15 && y < 11) P.px(x, y, y < 7 ? C.snowHi : C.snow) // 손잡이 위 눈
      }
    // 가방 몸통
    P.rrect(4, 24, 52, 40, 6, B)
    P.rrect(6, 26, 7, 34, 3, BL)
    P.rect(50, 27, 5, 35, BD)
    for (let y = 28; y < 60; y += 3) { P.px(9, y, BD); P.px(50, y, dk(BD, 0.9)) }
    // 위 눈
    P.rrect(3, 21, 54, 6, 3, C.snow)
    P.rect(6, 21, 24, 1, C.snowHi)
    snowLumps(P, 3, 54, 26, 2)
    // 튤립 패치
    P.rect(36, 30, 11, 11, '#F8F1E4')
    for (let i = 0; i < 11; i += 2) { P.px(36 + i, 30, BD); P.px(36 + i, 40, BD); P.px(36, 30 + i, BD); P.px(46, 30 + i, BD) }
    P.rect(41, 35, 1, 4, C.pine); P.px(40, 37, C.pine); P.px(42, 36, C.pineLight)
    P.rect(39, 32, 5, 3, C.roof); P.px(39, 31, C.roof); P.px(41, 31, C.roof); P.px(43, 31, C.roof); P.px(43, 33, C.roofDark); P.px(40, 32, C.roofLight)
    // 하늘색 줄무늬 차양 + 창 · 문
    stripedAwning(P, 7, 43, 28, 4, C.sky)
    glowWindow(P, 9, 50, 14, 8)
    P.rect(27, 49, 10, 14, C.woodDeep); P.rect(28, 50, 8, 13, C.wood); P.rect(29, 52, 6, 4, C.glow); P.px(34, 58, C.glowDark)
    // 벽 등불
    P.rect(45, 40, 6, 1, C.iron); P.rect(49, 41, 5, 6, C.iron); P.rect(50, 42, 3, 4, C.glow); P.px(50, 42, C.glowLight); P.rect(48, 39, 7, 2, C.snow)
    snowBase(P, 1, 58, 63)
  })
}

// 2) 도틀 — 크림색 마시멜로우 + 짙은 회갈색 기와지붕
function hanokShop() {
  const M = '#F3E6D0', ML = '#F9F2E6', MD = '#E3D2B8'
  const T = '#58514C', TL = '#736A63', TD = '#433D39', TDD = '#36312E'
  const W = 64
  const e = (x) => Math.min(1, Math.abs(x + 0.5 - W / 2) / (W / 2 - 1))
  const eave = (x) => 33 - Math.round(8 * Math.pow(e(x), 2.6)) // 처마선: 양 끝이 휘어 올라감
  const ridge = (x) => 10 - Math.round(4 * Math.pow(e(x), 2.6))
  return sprite(W, 66, (P) => {
    // 마시멜로우 몸통
    P.rrect(9, 30, 46, 34, 11, M)
    P.rrect(12, 34, 10, 25, 5, ML)
    P.rrect(46, 35, 7, 24, 4, MD)
    P.rect(16, 61, 32, 2, MD)
    // 지붕 밑 서까래 그늘
    for (let x = 6; x < W - 6; x++) { P.px(x, eave(x) + 1, C.wood); P.px(x, eave(x) + 2, C.woodDark) }
    P.rect(12, eave(32) + 3, 40, 1, MD)
    // 기와: 세로로 흐르는 둥근 기와 줄 (3칸 밝게 + 1칸 골)
    for (let x = 2; x < W - 2; x++) {
      const yt = ridge(x), yb = eave(x), g = x % 4
      for (let y = yt; y <= yb; y++) P.px(x, y, g === 0 ? TD : g === 1 ? TL : T)
      P.px(x, yb, g === 0 ? TDD : TD) // 처마 끝
      if (g === 2) { P.px(x, yb - 1, TL); P.px(x - 1, yb - 1, TL) } // 둥근 막새
    }
    // 용마루 + 살짝 말려 올라간 양 끝
    for (let x = 3; x < W - 3; x++) { P.px(x, ridge(x) - 1, TD); P.px(x, ridge(x) - 2, TDD) }
    for (const [x, k] of [[3, 1], [W - 4, -1]]) {
      P.rect(x - (k < 0 ? 1 : 0), ridge(x) - 4, 2, 3, TD)
      P.px(x + k * -1, ridge(x) - 5, TL)
    }
    // 지붕 위 두툼한 눈: 용마루를 따라가고 가장자리는 넓게 둥근 물결
    for (let x = 5; x < W - 5; x++) {
      const k = 1 - Math.pow(e(x), 3)
      const yt = ridge(x) - 3
      const lump = Math.round(2.2 * Math.sin(x * 0.4 + 0.6) + 0.8 * Math.sin(x * 0.95))
      const yb = Math.round(ridge(x) + 2 + 9 * k + lump * k)
      for (let y = yt; y <= yb; y++) P.px(x, y, y === yb ? C.snowMid : y <= yt + 1 ? C.snowHi : C.snow)
      P.px(x, yb + 1, TDD) // 눈 아래 그늘
    }
    // 아치 문
    archDoor(P, 22, 42, 12, 21)
    // 걸린 케이크 간판
    P.rect(37, 39, 16, 1, C.woodDark); P.px(37, 38, C.woodDark)
    P.rect(40, 40, 1, 2, C.woodDark); P.rect(50, 40, 1, 2, C.woodDark)
    P.rect(38, 42, 15, 10, C.paper); P.rect(38, 51, 15, 1, dk(C.paper, 0.9))
    P.rect(41, 46, 9, 4, '#E7C7A3'); P.rect(41, 45, 9, 1, C.snowHi); P.rect(41, 47, 9, 1, '#F4E6D4'); P.px(45, 44, C.roof); P.px(46, 43, C.pine)
    // 바닥 등불
    P.rect(53, 61, 5, 2, C.woodDark); P.rect(53, 55, 5, 6, C.woodDark); P.rect(54, 56, 3, 4, C.glow); P.px(54, 56, C.glowLight)
    P.rect(52, 54, 7, 1, C.woodDark); P.rect(52, 53, 7, 1, C.snow)
    snowBase(P, 4, 56, 63)
  })
}

// 3) VINTAGE UNIVERSE — 니트 스웨터
function sweaterShop() {
  const K = C.roof, KL = C.roofLight, KD = C.roofDark, KDD = C.roofDeep, CR = '#F1E5CF', CRD = '#DCCBAE'
  return sprite(64, 64, (P) => {
    // 소매
    for (const k of [-1, 1]) {
      for (let y = 21; y <= 47; y++) {
        const off = Math.round((y - 21) * 0.36)
        const x = k < 0 ? 13 - off - 9 : 51 + off - 1
        P.rect(x, y, 10, 1, y > 43 ? CR : K)
        if (y > 43) for (let i = 0; i < 10; i += 2) P.px(x + i, y, CRD)
        else P.px(k < 0 ? x : x + 9, y, k < 0 ? KL : KD)
      }
    }
    // 몸통
    P.rrect(12, 17, 40, 45, 8, K)
    P.rect(14, 22, 2, 34, KL)
    P.rect(47, 22, 4, 34, KD)
    // 꽈배기 무늬
    for (let y = 23; y < 54; y++) {
      const o = y % 6 < 3 ? 0 : 1
      for (const bx of [17, 45]) { P.px(bx + o, y, KL); P.px(bx + 2 - o, y, KD) }
    }
    // 아가일 다이아
    for (const [cx, col] of [[25, CR], [32, C.sky], [39, CR]])
      for (let dy = -4; dy <= 4; dy++) { const hw = 4 - Math.abs(dy); P.rect(cx - hw, 28 + dy, hw * 2 + 1, 1, col) }
    // 밑단 고무단
    P.rect(12, 56, 40, 6, KD)
    for (let x = 13; x < 51; x += 2) P.rect(x, 56, 1, 6, K)
    // 터틀넥
    P.ellipse(32, 17, 13, 6, CR)
    P.ellipse(32, 16, 9, 3.5, KDD)
    for (let x = 21; x < 44; x += 2) P.px(x, 21, CRD)
    // 어깨·목 위 눈
    P.ellipse(19, 18, 7, 2.6, C.snow); P.ellipse(45, 18, 7, 2.6, C.snow); P.ellipse(32, 11.5, 9, 2.4, C.snow); P.rect(26, 10, 8, 1, C.snowHi)
    // 문 · 창
    archDoor(P, 27, 43, 10, 18)
    P.arch(41, 41, 8, 10, C.woodDeep); P.arch(42, 42, 6, 8, C.glow); P.rect(42, 42, 2, 3, C.glowLight); P.rect(45, 42, 1, 8, C.woodDeep)
    // 옷 간판
    P.rect(1, 51, 10, 7, C.woodDark); P.rect(2, 52, 8, 5, C.woodLight)
    P.rect(4, 53, 4, 3, C.sky); P.px(3, 53, C.sky); P.px(8, 53, C.sky)
    P.rect(2, 58, 1, 4, C.woodDark); P.rect(9, 58, 1, 4, C.woodDark); P.rect(1, 50, 10, 1, C.snow)
    snowBase(P, 2, 60, 62)
  })
}

// 4) 올라이트 — 고양이
function catShop() {
  const M = '#F2E7D3', ML = '#F9F2E6', MD = '#E5D7BF', PK = C.roofLight
  return sprite(64, 64, (P) => {
    // 귀
    for (const cx of [15, 48]) {
      for (let y = 3; y < 22; y++) {
        const hw = Math.round(((y - 3) / 18) * 8)
        P.rect(cx - hw, y, hw * 2 + 1, 1, M)
        const iw = Math.round(((y - 8) / 18) * 6)
        if (y > 8 && y < 20) P.rect(cx - iw, y, iw * 2 + 1, 1, PK)
      }
      P.rect(cx - 1, 3, 3, 2, C.snow); P.px(cx, 2, C.snowHi)
    }
    // 몸통 (큰 둥근 덩어리)
    P.rrect(4, 15, 56, 47, 17, M)
    P.rrect(8, 22, 8, 30, 4, ML)
    P.rrect(49, 24, 9, 32, 4, MD)
    // 머리 위 눈
    P.ellipse(32, 16.5, 17, 3.6, C.snow); P.ellipse(24, 15, 7, 2.2, C.snowHi)
    snowLumps(P, 17, 44, 19, 1.5)
    // 얼굴
    for (const ex of [21, 41]) { P.px(ex, 28, C.ink); P.rect(ex + 1, 29, 3, 1, C.ink); P.px(ex + 4, 28, C.ink) }
    P.rect(31, 31, 3, 1, C.woodDark); P.px(32, 32, C.woodDark)
    P.px(30, 33, C.woodDark); P.px(31, 34, C.woodDark); P.px(32, 33, C.woodDark); P.px(33, 34, C.woodDark); P.px(34, 33, C.woodDark)
    P.rect(16, 32, 3, 2, PK); P.rect(46, 32, 3, 2, PK)
    for (const [x0, y, dir] of [[8, 30, 1], [8, 33, 1], [50, 30, -1], [50, 33, -1]]) P.rect(x0, y + (dir > 0 ? 0 : 0), 7, 1, dk(MD, 0.75))
    // 초록 줄무늬 차양 + 책방 창
    stripedAwning(P, 8, 39, 27, 4, C.pineLight)
    P.rect(9, 46, 25, 12, C.woodDark)
    P.rect(10, 47, 23, 10, C.glow)
    P.rect(10, 47, 8, 3, C.glowLight)
    for (const [x, h, c] of [[11, 5, C.roof], [13, 6, C.sky], [15, 4, C.pine], [17, 6, C.woodLight], [19, 5, C.roofLight], [24, 6, C.sky], [26, 4, C.roof], [28, 5, C.pineLight], [30, 6, C.woodLight]])
      P.rect(x, 57 - h, 2, h, c)
    P.rect(10, 52, 23, 1, C.woodDark)
    P.rect(8, 58, 27, 2, C.wood); P.rect(8, 57, 27, 1, C.snow)
    archDoor(P, 39, 43, 10, 18)
    snowBase(P, 2, 60, 62)
  })
}

// 5) 서촌 파보르 — 알파카
function alpacaShop() {
  const W = '#F5EFE3', WL = '#FCF9F3', WD = '#E6DCCB'
  return sprite(66, 66, (P) => {
    // 몸통
    P.rrect(14, 29, 50, 33, 12, W)
    for (let x = 18; x < 62; x += 6) P.ellipse(x, 30, 4, 3, W)
    for (let x = 20; x < 62; x += 7) P.ellipse(x, 61, 3.5, 2, WD)
    P.rrect(54, 33, 8, 24, 4, WD)
    // 목 + 머리
    P.rrect(8, 15, 16, 31, 7, W)
    P.rect(10, 18, 3, 24, WL)
    for (let y = 20; y < 42; y += 4) { P.px(21, y, WD); P.px(20, y + 2, WD) } // 복슬 털결
    P.rect(10, 0, 3, 7, W); P.rect(21, 0, 3, 7, W); P.rect(11, 2, 1, 4, C.roofLight); P.rect(22, 2, 1, 4, C.roofLight)
    P.ellipse(17, 11, 10, 8.5, W)
    P.ellipse(17, 5, 7, 3.6, WL) // 머리 위 복슬 털
    P.ellipse(12.5, 15.5, 5.5, 3.6, '#EEE4D2') // 주둥이
    P.rect(9, 14, 2, 1, C.ink); P.px(10, 15, C.woodDark)
    P.px(13, 10, C.ink); P.rect(14, 11, 2, 1, C.ink); P.px(16, 10, C.ink) // 감은 눈
    P.rect(17, 13, 2, 1, C.roofLight)
    P.ellipse(17, 3, 6.5, 2.2, C.snow); P.rect(13, 2, 5, 1, C.snowHi)
    // 등 위 담요 + 술
    P.rect(31, 24, 27, 6, C.roof); P.rect(31, 24, 27, 1, C.roofLight)
    P.rect(31, 30, 27, 9, C.roof); P.rect(31, 38, 27, 1, C.roofDark)
    for (const cx of [37, 44, 51]) for (let dy = -3; dy <= 3; dy++) { const hw = 3 - Math.abs(dy); P.rect(cx - hw, 34 + dy, hw * 2 + 1, 1, cx === 44 ? C.sky : C.paper) }
    for (let x = 32; x < 58; x += 4) { P.px(x, 39, C.roofDark); P.px(x, 40, C.roofDark); P.px(x, 41, C.roofDeep) }
    P.ellipse(44, 23.5, 11, 2.2, C.snow)
    // 문 · 창
    archDoor(P, 22, 43, 10, 18)
    P.arch(42, 44, 8, 9, C.woodDeep); P.arch(43, 45, 6, 7, C.glow); P.rect(43, 45, 2, 2, C.glowLight); P.rect(46, 45, 1, 7, C.woodDeep)
    // 기둥 등불 (왼쪽)
    P.rect(2, 46, 2, 16, C.woodDark); P.rect(0, 40, 6, 6, C.woodDark); P.rect(1, 41, 4, 4, C.glow); P.px(1, 41, C.glowLight); P.rect(0, 39, 6, 1, C.snow)
    snowBase(P, 6, 58, 62)
  })
}

// 6) 인왕산 대충유원지 — 큰 유리창 카페 + 소나무
function glassCafe() {
  return sprite(68, 64, (P) => {
    // 나무 몸체 + 유리
    P.rect(14, 25, 51, 37, C.wood)
    P.rect(14, 25, 2, 37, C.woodLight)
    P.rect(62, 25, 3, 37, C.woodDark)
    P.rect(18, 29, 42, 28, C.glow)
    P.rect(18, 29, 16, 8, C.glowLight)
    P.rect(18, 56, 42, 1, C.glowDark)
    for (const x of [28, 39, 49]) P.rect(x, 29, 2, 28, C.woodDark)
    P.rect(18, 42, 42, 2, C.woodDark)
    // 안쪽 실루엣 (드리퍼 · 테이블)
    P.rect(21, 52, 36, 2, dk(C.glowDark, 0.85))
    P.rect(33, 37, 1, 4, C.woodDark); P.rect(31, 36, 5, 1, C.woodDark); P.rect(32, 41, 3, 1, C.woodDark)
    P.rect(52, 34, 5, 3, dk(C.glowDark, 0.9))
    P.rect(14, 57, 51, 5, C.woodDark)
    // 둥근 눈 지붕
    P.rect(11, 22, 57, 4, C.woodDeep)
    P.ellipse(39.5, 17, 30, 9.5, C.snowMid)
    P.ellipse(39.5, 16, 30, 9, C.snow)
    P.ellipse(32, 11, 14, 3, C.snowHi)
    for (const x of [15, 24, 34, 45, 55, 63]) P.ellipse(x, 24.5, 2.6, 2, C.snow)
    // 컵 간판
    P.rect(59, 50, 9, 8, C.woodDark); P.rect(60, 51, 7, 6, C.woodLight); P.rect(61, 53, 4, 3, C.woodDark); P.px(65, 54, C.woodDark); P.px(62, 52, C.woodDark)
    P.rect(60, 58, 1, 4, C.woodDark); P.rect(66, 58, 1, 4, C.woodDark); P.rect(59, 49, 9, 1, C.snow)
    // 소나무 (휘어진 줄기 + 구름 잎)
    for (let y = 26; y < 62; y++) { const x = 7 + Math.round(Math.sin(y * 0.18) * 2.2); P.rect(x, y, 3, 1, C.woodDark); P.px(x, y, C.wood) }
    P.rect(9, 34, 6, 2, C.woodDark); P.rect(3, 40, 5, 2, C.woodDark)
    for (const [x, y, rx, ry] of [[10, 23, 9, 4], [3.5, 34, 5.5, 3], [14, 31, 5, 2.6], [8, 15, 6, 3]]) {
      P.ellipse(x, y, rx, ry, C.pine)
      P.ellipse(x + 1.5, y + 1, rx * 0.7, ry * 0.6, C.pineDark)
      P.ellipse(x - 0.5, y - ry * 0.55, rx * 0.85, ry * 0.5, C.snow)
    }
    // 눈 덮인 바위
    P.ellipse(6, 58, 6, 4, C.stone); P.ellipse(7, 59.5, 5, 2.4, C.stoneDark); P.ellipse(5.5, 56, 4.5, 2, C.snow)
    snowBase(P, 1, 66, 62)
  })
}

const SPECIAL = { bag: bagShop, hanok: hanokShop, sweater: sweaterShop, cat: catShop, alpaca: alpacaShop, glass: glassCafe }
export function shopSprite(store) {
  return withScale(SHOP_K, () => (SPECIAL[store.model] || (() => genericShop(store)))())
}

// 방문 엽서 (도장 찍은 가게 벽에)
export function postcardSprite(color) {
  return sprite(9, 11, (P) => {
    P.rect(0, 0, 9, 11, C.paper)
    P.rect(1, 1, 7, 6, color)
    P.rect(2, 2, 5, 4, shade(color, 1.35))
    P.px(4, 3, color)
    P.rect(1, 8, 5, 1, C.pathDark)
    P.rect(1, 9, 3, 1, C.pathDark)
  })
}

// ── 자연 · 소품 ──
export function pineSprite(size = 1) {
  const w = Math.round(26 * size), h = Math.round(42 * size)
  return sprite(w, h, (P) => {
    const cx = Math.round(w / 2)
    P.rect(cx - 2, h - 8, 4, 8, C.woodDark); P.rect(cx - 2, h - 8, 1, 8, C.wood)
    pineTier(P, cx, Math.round(h * 0.42), Math.round(h * 0.42), w)
    pineTier(P, cx, Math.round(h * 0.2), Math.round(h * 0.36), Math.round(w * 0.78))
    pineTier(P, cx, 0, Math.round(h * 0.32), Math.round(w * 0.55))
  })
}

export function roundTreeSprite(v = 0) {
  return sprite(28, 36, (P) => {
    P.rect(12, 26, 4, 10, C.woodDark); P.rect(12, 26, 1, 10, C.wood); P.px(11, 35, C.woodDark); P.px(16, 35, C.woodDark)
    P.ellipse(14, 16, 13.5, 11.5, C.pineDark)
    P.ellipse(13, 15, 12.5, 10.5, v ? C.pineLight : C.pine)
    P.ellipse(9, 13, 6, 5, v ? lt(C.pineLight, 1.12) : C.pineLight)
    P.ellipse(19, 20, 7, 5, C.pineDark)
    P.ellipse(13, 10, 10.5, 6, C.snowMid)
    P.ellipse(13, 9, 10, 5.6, C.snow)
    P.ellipse(6, 12, 3.6, 2.4, C.snow); P.ellipse(21, 11, 4, 2.6, C.snow)
    P.ellipse(10, 7, 5, 2, C.snowHi)
  })
}

export function bushSprite(berries = true) {
  return sprite(16, 12, (P) => {
    P.ellipse(8, 7, 8, 5.2, C.pineDark)
    P.ellipse(7.5, 6.5, 7.5, 4.8, C.pine)
    P.ellipse(5, 6, 3.5, 2.5, C.pineLight)
    P.ellipse(8, 4, 6.5, 2.8, C.snowMid)
    P.ellipse(7.5, 3.4, 6, 2.5, C.snow)
    if (berries) { P.px(4, 8, C.roof); P.px(11, 7, C.roof); P.px(8, 9, C.roof); P.px(11, 6, C.roofLight) }
  })
}

export function rockSprite() {
  return sprite(14, 9, (P) => {
    P.ellipse(7, 5.5, 7, 3.8, C.stone)
    P.ellipse(8.5, 6.8, 5.5, 2.2, C.stoneDark)
    P.ellipse(6, 3.4, 5, 2.2, C.snow)
  })
}

export function snowmanSprite(v = 0) {
  return sprite(16, 24, (P) => {
    P.ellipse(8, 17, 7, 6.5, C.snowMid); P.ellipse(7.3, 16.5, 6.2, 6, C.snow)
    P.ellipse(8, 8.5, 5, 4.8, C.snowMid); P.ellipse(7.5, 8, 4.4, 4.4, C.snow)
    P.px(6, 7, C.ink); P.px(9, 7, C.ink); P.rect(8, 9, 3, 1, C.roof)
    const sc = v ? C.skyDark : C.roof, scd = v ? '#7C9FAC' : C.roofDark
    P.rect(3, 11, 10, 2, sc); P.rect(10, 12, 2, 4, scd)
    P.px(8, 15, C.ink); P.px(8, 18, C.ink)
    if (v) { // 파란 털모자
      P.ellipse(7.5, 3.6, 4.5, 3, C.skyDark); P.rect(3, 4, 9, 1, '#7C9FAC'); P.rect(6, 0, 3, 2, C.snowHi)
      for (let x = 4; x < 12; x += 2) P.px(x, 4, C.sky)
    } else { P.rect(4, 2, 7, 3, C.iron); P.rect(3, 4, 9, 1, C.iron); P.rect(4, 3, 7, 1, C.roof) }
    P.px(1, 14, C.woodDark); P.px(2, 15, C.woodDark); P.px(0, 13, C.woodDark); P.px(14, 14, C.woodDark); P.px(13, 15, C.woodDark); P.px(15, 13, C.woodDark)
  })
}

// ── 축제 길가 소품 ──
// 리본·리스를 단 가로등 (banner: 눈꽃 배너)
export function festiveLampSprite(banner = false) {
  return sprite(banner ? 18 : 12, 37, (P) => {
    const x = 4
    P.rect(x - 2, 34, 6, 3, C.iron)
    P.rect(x, 11, 2, 24, C.iron); P.rect(x, 11, 1, 24, C.ironLight)
    P.rect(x - 3, 3, 8, 8, C.iron); P.rect(x - 2, 4, 6, 6, C.glow); P.rect(x - 2, 4, 2, 2, C.glowLight); P.rect(x, 4, 1, 6, C.iron)
    P.rect(x - 4, 2, 10, 1, C.iron); P.rect(x - 3, 0, 8, 2, C.snow)
    // 리본
    P.rect(x - 3, 12, 3, 2, C.roof); P.rect(x + 2, 12, 3, 2, C.roof); P.rect(x, 12, 2, 2, C.roofDark)
    P.px(x - 1, 14, C.roof); P.px(x + 2, 14, C.roof); P.px(x - 1, 15, C.roofDark); P.px(x + 3, 15, C.roofDark)
    // 리스
    P.ellipse(x + 1, 19, 4, 3.2, C.pine); P.ellipse(x + 1, 19, 2, 1.4, C.iron)
    P.px(x - 2, 18, C.roof); P.px(x + 3, 21, C.roof); P.px(x + 4, 17, C.glowLight); P.px(x, 21, C.snowHi)
    if (banner) {
      P.rect(x + 2, 13, 9, 1, C.iron)
      P.rect(x + 4, 14, 7, 12, C.roof); P.rect(x + 4, 14, 1, 12, C.roofLight); P.rect(x + 10, 14, 1, 12, C.roofDark)
      P.px(x + 4, 26, C.roof); P.px(x + 6, 26, C.roof); P.px(x + 8, 26, C.roof); P.px(x + 10, 26, C.roof)
      const cx = x + 7, cy = 19 // 눈꽃
      P.rect(cx, cy - 3, 1, 7, C.snowHi); P.rect(cx - 3, cy, 7, 1, C.snowHi)
      P.px(cx - 2, cy - 2, C.snowHi); P.px(cx + 2, cy - 2, C.snowHi); P.px(cx - 2, cy + 2, C.snowHi); P.px(cx + 2, cy + 2, C.snowHi)
    }
  }, { ax: 5 })
}

// 기둥 두 개 사이 늘어진 줄 + 전구
export function stringLightsSprite() {
  return sprite(40, 20, (P) => {
    for (const x of [2, 35]) {
      P.rect(x, 4, 3, 16, C.woodDark); P.rect(x, 4, 1, 16, C.wood)
      P.ellipse(x + 1.5, 3.6, 2.4, 1.8, C.snow)
    }
    for (let x = 5; x < 35; x++) {
      const t = (x - 5) / 30
      const y = Math.round(6 + Math.sin(t * Math.PI) * 5)
      P.px(x, y, C.woodDeep)
      if ((x - 5) % 6 === 3) { P.rect(x - 1, y + 1, 3, 3, C.glow); P.px(x - 1, y + 1, C.glowLight); P.px(x, y + 4, C.glowDark) }
      else if (x % 3 === 0) P.px(x, y - 1, C.snow)
    }
  })
}

// 지팡이 사탕을 꽂은 나무 화분
export function planterSprite() {
  return sprite(20, 17, (P) => {
    for (const [x, h] of [[5, 7], [9, 9], [13, 6]]) {
      const top = 11 - h
      for (let y = top; y < 11; y++) P.px(x, y, (y >> 1) % 2 ? C.roof : C.snowHi)
      P.px(x + 1, top - 1, C.roof); P.px(x + 2, top, C.snowHi); P.px(x + 2, top + 1, C.roof)
    }
    P.px(15, 7, C.roof); P.px(16, 6, C.pine); P.px(3, 8, C.pine); P.px(4, 7, C.roof)
    P.rect(1, 10, 18, 7, C.wood); P.rect(1, 10, 18, 1, C.woodLight); P.rect(1, 13, 18, 1, C.woodDark); P.rect(1, 16, 18, 1, C.woodDark)
    P.rect(1, 10, 1, 7, C.woodDark); P.rect(18, 10, 1, 7, C.woodDark)
    P.rect(0, 9, 20, 2, C.snow); P.rect(2, 9, 8, 1, C.snowHi)
  })
}

// 커피잔 그림이 있는 나무 그루터기 + 작은 등불
export function stumpSprite() {
  return sprite(26, 18, (P) => {
    P.rect(2, 6, 16, 12, C.wood); P.rect(2, 6, 2, 12, C.woodLight); P.rect(15, 6, 3, 12, C.woodDark)
    for (let y = 8; y < 17; y += 3) P.px(5 + (y % 2), y, C.woodDark)
    P.ellipse(10, 6, 8, 3.2, C.woodLight); P.ellipse(10, 6, 5, 2, C.wood); P.ellipse(10, 6, 2, 1, C.woodLight)
    P.ellipse(9, 4.6, 7, 2.4, C.snow); P.rect(5, 3, 6, 1, C.snowHi)
    P.rect(7, 10, 7, 6, C.paper); P.rect(8, 12, 4, 3, C.woodDark); P.px(12, 13, C.woodDark); P.px(9, 11, C.woodDark); P.px(10, 10, C.woodDark)
    // 작은 등불
    P.rect(20, 16, 5, 2, C.iron); P.rect(20, 10, 5, 6, C.iron); P.rect(21, 11, 3, 4, C.glow); P.px(21, 11, C.glowLight)
    P.rect(19, 9, 7, 1, C.iron); P.rect(21, 8, 3, 1, C.iron); P.rect(20, 7, 5, 1, C.snow)
  })
}

// 커피잔 간판
export function cafeSignSprite() {
  return sprite(16, 20, (P) => {
    P.rect(7, 10, 2, 10, C.woodDark)
    P.rect(1, 2, 14, 10, C.woodDark); P.rect(2, 3, 12, 8, C.woodLight)
    P.rect(5, 6, 5, 4, C.woodDark); P.px(10, 7, C.woodDark); P.px(10, 8, C.woodDark); P.rect(4, 10, 7, 1, C.woodDark)
    P.px(6, 4, C.woodDark); P.px(8, 5, C.woodDark)
    P.rect(1, 1, 14, 1, C.snow); P.rect(3, 0, 8, 1, C.snowHi)
  })
}

// 앉아 있는 고양이 (털 색 여러 가지)
export function catSprite(coat = C.woodLight, dark = C.woodDark, belly = C.paper) {
  return sprite(13, 13, (P) => {
    // 꼬리 (말려 올라감)
    P.rect(10, 6, 2, 6, coat); P.px(11, 5, coat); P.px(12, 4, dark)
    // 몸
    P.ellipse(6, 9.5, 4.6, 3.6, coat); P.ellipse(5.5, 10.5, 2.4, 2.2, belly)
    // 머리 + 귀
    P.ellipse(5.5, 4.6, 3.6, 3.2, coat)
    P.px(2, 1, coat); P.rect(2, 2, 2, 1, coat); P.px(9, 1, coat); P.rect(8, 2, 2, 1, coat)
    P.px(3, 2, C.roofLight); P.px(8, 2, C.roofLight)
    // 줄무늬
    P.px(5, 2, dark); P.px(6, 2, dark); P.px(9, 8, dark); P.px(9, 10, dark)
    // 얼굴
    P.px(4, 4, C.ink); P.px(7, 4, C.ink); P.px(5, 5, C.roofLight); P.px(6, 6, dark)
    // 앞발
    P.rect(3, 12, 2, 1, belly); P.rect(7, 12, 2, 1, belly)
  })
}

// 하얀 토끼
export function bunnySprite() {
  return sprite(11, 11, (P) => {
    P.ellipse(5.5, 8, 4.5, 3, C.snowHi)
    P.ellipse(4, 5, 2.8, 2.6, C.snowHi)
    P.rect(2, 0, 2, 4, C.snowHi); P.rect(5, 0, 2, 4, C.snowHi); P.px(2, 1, C.roofLight); P.px(5, 1, C.roofLight); P.px(2, 2, C.roofLight); P.px(5, 2, C.roofLight)
    P.px(3, 5, C.ink); P.px(1, 6, C.roofLight); P.px(9, 7, C.snowMid)
    P.rect(3, 10, 2, 1, C.snowMid); P.rect(7, 10, 2, 1, C.snowMid)
  })
}

export function lampSprite() {
  return sprite(10, 36, (P) => {
    P.rect(2, 33, 6, 3, C.iron)
    P.rect(4, 11, 2, 23, C.iron); P.rect(4, 11, 1, 23, C.ironLight)
    P.rect(1, 3, 8, 8, C.iron)
    P.rect(2, 4, 6, 6, C.glow); P.rect(2, 4, 2, 2, C.glowLight)
    P.rect(4, 4, 1, 6, C.iron)
    P.rect(0, 2, 10, 1, C.iron)
    P.rect(1, 0, 8, 2, C.snow)
  })
}

export function benchSprite() {
  return sprite(26, 13, (P) => {
    P.rect(3, 8, 2, 5, C.woodDark); P.rect(21, 8, 2, 5, C.woodDark)
    P.rect(3, 1, 2, 8, C.woodDark); P.rect(21, 1, 2, 8, C.woodDark)
    P.rect(1, 2, 24, 2, C.wood); P.rect(1, 5, 24, 2, C.wood); P.rect(1, 2, 24, 1, C.woodLight)
    P.rect(0, 8, 26, 2, C.wood); P.rect(0, 8, 26, 1, C.woodLight)
    P.rect(1, 7, 24, 1, C.snow); P.ellipse(8, 7, 4, 1.2, C.snow); P.ellipse(18, 7, 5, 1.2, C.snow)
    P.rect(1, 1, 24, 1, C.snow)
  })
}

// 광장 가운데 크리스마스 트리
export function plazaTreeSprite() {
  return sprite(44, 62, (P) => {
    P.ellipse(22, 57, 15, 4.5, C.woodDark)
    P.ellipse(22, 56, 14, 3.6, C.wood)
    P.ellipse(22, 55, 12, 2.4, C.snow)
    P.rect(20, 48, 4, 8, C.woodDark)
    pineTier(P, 22, 30, 20, 40)
    pineTier(P, 22, 17, 17, 31)
    pineTier(P, 22, 6, 14, 22)
    // 장식
    for (const [x, y, c] of [[14, 44, C.roof], [28, 46, C.glow], [21, 40, C.sky], [33, 42, C.roof], [10, 47, C.glow], [18, 33, C.glow], [26, 30, C.roof], [16, 26, C.sky], [24, 22, C.glow], [20, 14, C.roof], [25, 16, C.glow], [30, 36, C.glowLight], [12, 39, C.glowLight]])
      { P.px(x, y, c); P.px(x, y + 1, shade(c, 0.8)) }
    // 별
    P.rect(21, 0, 2, 6, C.glow); P.rect(19, 2, 6, 2, C.glow); P.px(21, 1, C.glowLight); P.px(22, 2, C.glowLight)
  })
}

export function signpostSprite() {
  return sprite(22, 28, (P) => {
    P.rect(9, 5, 3, 23, C.woodDark); P.rect(9, 5, 1, 23, C.wood)
    P.rect(2, 6, 15, 5, C.woodLight); P.rect(2, 10, 15, 1, C.wood); P.px(17, 7, C.woodLight); P.px(17, 8, C.woodLight); P.px(18, 8, C.woodLight); P.px(17, 9, C.woodLight)
    P.rect(5, 13, 15, 4, C.wood); P.rect(5, 16, 15, 1, C.woodDark); P.px(4, 14, C.wood); P.px(4, 15, C.wood); P.px(3, 14, C.wood)
    P.rect(4, 8, 9, 1, C.woodDark); P.rect(8, 14, 9, 1, C.woodLight)
    P.rect(2, 5, 15, 1, C.snow); P.rect(5, 12, 15, 1, C.snow); P.rect(8, 3, 5, 2, C.snow)
    P.ellipse(10.5, 27, 6, 1.6, C.snow)
  })
}

// ── 아바타: 주홍 니트 모자 + 남색 더플코트 + 겨자색 목도리 여행자 (아래·위·왼쪽·오른쪽, 걷기 3프레임 + 손 흔들기) ──
const AV = { hat: '#D6553F', hatD: '#A9402F', hatL: '#EC8A72', hair: '#6B4433', hairD: '#4E3127', skin: '#FFDCC4', skinD: '#F0B89F', coat: '#43507A', coatD: '#2F3858', leg: '#5A5150', blush: '#F3A3A3' }

function avatarPaint(dir, frame) {
  return (P) => {
    const step = frame === 1 ? 1 : frame === 2 ? -1 : 0
    // 모자 + 방울
    P.rect(7, 0, 3, 2, C.snowHi)
    P.rect(5, 2, 7, 1, AV.hat); P.rect(4, 3, 9, 3, AV.hat); P.rect(4, 6, 9, 1, AV.hatD)
    P.px(5, 3, AV.hatL); P.px(6, 3, AV.hatL)
    for (let x = 4; x < 13; x += 2) P.px(x, 6, AV.hatL)
    if (dir === 'down') {
      P.rect(3, 7, 11, 1, AV.hair); P.rect(3, 8, 2, 5, AV.hair); P.rect(12, 8, 2, 5, AV.hair)
      P.rect(5, 8, 7, 4, AV.skin); P.rect(5, 8, 7, 1, AV.hair); P.px(8, 8, AV.skin)
      P.px(6, 10, C.ink); P.px(10, 10, C.ink); P.px(5, 11, AV.blush); P.px(11, 11, AV.blush); P.px(8, 11, AV.skinD)
    } else if (dir === 'up') {
      P.rect(3, 7, 11, 6, AV.hair); P.rect(5, 8, 1, 4, AV.hairD); P.rect(10, 9, 1, 3, AV.hairD)
      P.rect(7, 11, 3, 2, AV.hairD) // 묶은 머리
    } else {
      // 왼쪽 보기 (오른쪽은 뒤집기)
      P.rect(6, 7, 8, 6, AV.hair); P.rect(4, 8, 6, 4, AV.skin); P.rect(4, 7, 4, 1, AV.hair)
      P.px(5, 10, C.ink); P.px(4, 11, AV.blush); P.px(3, 10, AV.skin); P.rect(12, 9, 2, 4, AV.hairD)
    }
    // 목도리
    P.rect(4, 13, 9, 2, C.glow); P.rect(4, 14, 9, 1, C.glowDark)
    if (dir !== 'up') P.rect(dir === 'down' ? 10 : 9, 15, 2, 2, C.glow)
    // 코트
    P.rect(4, 15, 9, 6, AV.coat); P.rect(11, 15, 2, 6, AV.coatD); P.rect(4, 20, 9, 1, AV.coatD)
    if (dir === 'down') { P.px(8, 17, C.snowHi); P.px(8, 19, C.snowHi) }
    // 팔
    if (frame === 3) {
      P.rect(3, 15, 1, 4, AV.coat); P.px(3, 19, C.roofDark)
      P.rect(13, 10, 1, 5, AV.coat); P.px(13, 9, C.roofDark) // 손 흔들기
    } else if (dir === 'down' || dir === 'up') {
      P.rect(3, 15 + (step > 0 ? -1 : 0), 1, 4, AV.coat); P.px(3, 19 + (step > 0 ? -1 : 0), C.roofDark)
      P.rect(13, 15 + (step < 0 ? -1 : 0), 1, 4, AV.coatD); P.px(13, 19 + (step < 0 ? -1 : 0), C.roofDark)
    } else {
      P.rect(7 + step, 16, 2, 4, AV.coatD); P.px(7 + step, 20, C.roofDark)
    }
    // 다리 · 장화
    if (dir === 'down' || dir === 'up') {
      P.rect(5, 21, 2, step > 0 ? 1 : 2, AV.leg); P.rect(5, step > 0 ? 22 : 23, 2, 1, C.woodDark)
      P.rect(10, 21, 2, step < 0 ? 1 : 2, AV.leg); P.rect(10, step < 0 ? 22 : 23, 2, 1, C.woodDark)
    } else {
      P.rect(6 - step, 21, 2, 2, AV.leg); P.rect(6 - step, 23, 2, 1, C.woodDark)
      P.rect(9 + step, 21, 2, 2, AV.leg); P.rect(9 + step, 23, 2, 1, C.woodDark)
    }
  }
}

export function avatarSprites() {
  const make = (dir) => [0, 1, 2, 3].map((f) => sprite(17, 24, avatarPaint(dir, f)))
  const left = make('left')
  return { down: make('down'), up: make('up'), left, right: left.map(mirror) }
}
