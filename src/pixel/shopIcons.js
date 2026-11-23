// 가게 아이콘 — "파는 물건 모양의 집" (64x64 도트, 지도에는 정수 2배로)
//  · 아이콘 이름 = src/assets/shops/<이름>.png (투명 배경 64x64, 바닥선 y=58) 또는 아래 DRAWN 의 코드 그림
//  · 어느 가게에 어떤 아이콘을 쓸지는 stores.js 의 icon: '<이름>' 으로 정함 (없으면 예전 가게 그림)
import { canvas, painter, autoOutline } from './draw.js'

export const ICON_SCALE = 2 // 64px 그림 → 지도 위 128px (도트 번짐 없게 정수 배율)

const FILES = import.meta.glob('../assets/shops/*.{png,webp}', { eager: true, import: 'default' })
const URLS = Object.fromEntries(Object.entries(FILES).map(([p, url]) => [p.split('/').pop().replace(/\.(png|webp)$/, ''), url]))
// 큰 원본 그림(폭 128px 초과)은 손대지 않고 그대로: 원본 SRC_PER_WORLD px = 지도 1px 크기로 부드럽게 줄여 그림
const SRC_PER_WORLD = 9 / 0.8 // 원래 9 → 4/5 크기로 줄임

// 공통 색 (참고 그림의 문·창·눈 색)
const D = {
  doorD: '#4E3122', door: '#7A4E34', doorL: '#9C6A48',
  frame: '#6B4430', win: '#F2C46B', winL: '#FBE3A6',
  snow: '#FFFFFF', snowS: '#DCE3EC',
}

// ── 공통 조각 ──
function door(P, x, y) { // 8x12
  P.arch(x, y, 8, 12, D.doorD)
  P.arch(x + 1, y + 1, 6, 11, D.door)
  P.rect(x + 2, y + 4, 1, 8, D.doorL)
  P.rect(x + 4, y + 4, 1, 8, D.doorD)
  P.rect(x + 2, y + 2, 1, 2, D.win); P.rect(x + 5, y + 2, 1, 2, D.win)
}
function win(P, x, y) { // 7x8
  P.arch(x, y, 7, 8, D.frame)
  P.arch(x + 1, y + 1, 5, 6, D.win)
  P.rect(x + 3, y + 1, 1, 6, D.frame)
  P.rect(x + 1, y + 4, 5, 1, D.frame)
  P.px(x + 1, y + 2, D.winL)
}
function snowBase(P, x0, x1) { // 바닥 양쪽 눈 둔덕 (y 55~58)
  P.rect(x0 + 2, 57, x1 - x0 - 4, 1, D.snowS)
  for (const [cx, rx] of [[x0 + 3, 4.5], [x1 - 3, 4.5]]) {
    P.ellipse(cx, 57.2, rx, 1.8, D.snowS)
    P.ellipse(cx - 0.5, 56.9, rx - 1, 1.3, D.snow)
  }
}
function snowCap(P, x, y, w) { // 위에 얹힌 눈 (들쭉날쭉)
  P.rect(x, y, w, 2, D.snow)
  for (let i = 0; i < w; i += 5) P.rect(x + i + 1, y + 2, 2, 1, D.snow)
  P.rect(x + 1, y + 2, w - 2, 1, D.snowS)
  for (let i = 0; i < w; i += 5) P.rect(x + i + 1, y + 2, 2, 1, D.snow)
}
// 원통형 몸통 한 줄 (왼쪽 밝게, 오른쪽 어둡게)
function band(P, cx, y, hw, c) {
  P.rect(cx - hw, y, hw * 2, 1, c.m)
  P.rect(cx - hw, y, Math.max(1, Math.round(hw * 0.35)), 1, c.l)
  P.rect(cx + hw - Math.max(1, Math.round(hw * 0.3)), y, Math.max(1, Math.round(hw * 0.3)), 1, c.d)
}
const cut = (P, fn) => { P.c.globalCompositeOperation = 'destination-out'; fn(); P.c.globalCompositeOperation = 'source-over' }

// ── 코드로 그린 아이콘 6종 ──
const DRAWN = {
  // 모카포트
  'moka-pot'(P) {
    const S = { l: '#E7E9ED', m: '#BFC3CA', d: '#8E939C' }
    P.rect(30, 6, 4, 3, '#2E2E34'); P.rect(31, 5, 2, 1, '#2E2E34')
    P.rect(21, 9, 22, 3, S.m); P.rect(21, 9, 7, 3, S.l); P.rect(37, 9, 6, 3, S.d)
    snowCap(P, 22, 8, 20)
    P.rect(18, 12, 28, 2, S.d) // 뚜껑 테
    P.tri(16, 12, 5, 6, S.m) // 주둥이
    P.rect(13, 12, 5, 2, S.m); P.rect(13, 12, 5, 1, S.l)
    for (let y = 14; y <= 30; y++) band(P, 32, y, Math.round(13 - (y - 14) * 0.3), S)
    P.rect(24, 31, 16, 3, '#6E737C')
    for (let y = 34; y <= 56; y++) band(P, 32, y, Math.round(9 + (y - 34) * 0.3), S)
    P.rect(22, 56, 20, 2, S.d)
    P.rect(45, 15, 3, 2, '#2E2E34'); P.rect(47, 16, 3, 12, '#2E2E34'); P.rect(43, 27, 5, 2, '#2E2E34'); P.px(48, 17, '#5A5A62')
    for (let y = 16; y < 30; y += 4) P.rect(26, y, 1, 3, S.l)
    door(P, 28, 44); win(P, 36, 38)
    snowBase(P, 16, 48)
  },
  // 청자 주전자
  'celadon-teapot'(P) {
    const G = { l: '#C9E0D2', m: '#9DBFAE', d: '#76988A', dd: '#5E7F72' }
    P.rect(46, 33, 3, 2, '#8A6242'); P.rect(48, 34, 3, 12, '#8A6242'); P.rect(45, 45, 4, 2, '#8A6242'); P.rect(49, 35, 1, 9, '#B08560')
    for (let i = 0; i < 10; i++) P.rect(12 - i, 41 - i, 5, 3, i < 2 ? G.d : G.m) // 주둥이
    P.rect(2, 30, 4, 2, G.l)
    P.ellipse(30, 42, 19, 15, G.dd)
    P.ellipse(30, 42, 18, 14, G.m)
    P.ellipse(37, 45, 10, 10, G.d)
    P.ellipse(30, 42, 15, 12, G.m)
    P.ellipse(23, 35, 7, 5, G.l)
    P.rect(19, 54, 22, 4, G.d); P.rect(19, 54, 22, 1, G.dd)
    P.rect(13, 36, 34, 1, G.dd) // 띠
    P.ellipse(30, 28, 11, 3, G.d); P.ellipse(30, 27.5, 10, 2.5, G.l)
    P.ellipse(30, 24, 3, 2.5, G.d); P.px(29, 23, G.l)
    snowCap(P, 21, 25, 18)
    // 구름 무늬
    for (const [x, y] of [[17, 44], [41, 40], [20, 50]]) { P.rect(x, y, 4, 1, '#F2F7F3'); P.rect(x + 1, y - 1, 2, 1, '#F2F7F3') }
    door(P, 26, 44); win(P, 35, 39)
    snowBase(P, 14, 46)
  },
  // 물방울무늬 머그 (따뜻한 라떼)
  'dot-mug'(P) {
    const M = { l: '#FFFDF8', m: '#F4EBDD', d: '#E0D1BC' }
    P.rrect(44, 30, 12, 18, 5, M.d)
    cut(P, () => P.rrect(47, 34, 6, 10, 3, '#000'))
    for (let y = 24; y <= 57; y++) band(P, 29, y, 18, M)
    P.rect(11, 22, 36, 3, M.d); P.rect(13, 22, 32, 2, '#8A5A3C'); P.rect(16, 22, 10, 1, '#B98A64')
    P.rect(20, 23, 18, 1, '#F4E3C8') // 라떼 거품
    snowCap(P, 11, 20, 14)
    for (const [x, y] of [[16, 30], [26, 28], [38, 31], [14, 40], [42, 42], [20, 49], [40, 52], [32, 34]]) P.rrect(x, y, 4, 4, 1, '#D96A55')
    // 김
    for (const [x, y] of [[20, 14], [30, 11], [38, 15]]) { P.px(x, y, D.snowS); P.px(x + 1, y + 1, D.snowS); P.px(x, y + 2, D.snowS); P.px(x + 1, y + 3, D.snowS) }
    P.rect(11, 56, 36, 2, M.d)
    door(P, 24, 44); win(P, 33, 38)
    snowBase(P, 8, 50)
  },
  // 연필꽂이 + 붓
  'pencil-cup'(P) {
    const pencil = (x, top, col, colD) => {
      P.rect(x, top + 6, 5, 32 - top - 6, col); P.rect(x + 3, top + 6, 2, 32 - top - 6, colD); P.px(x, top + 6, '#FFFFFF')
      P.tri(x + 2.5, top + 1, 5, 5, '#E8C29A'); P.rect(x + 2, top, 1, 2, '#3A3A40')
    }
    pencil(15, 9, '#D9573F', '#B04432')
    pencil(22, 4, '#F4B860', '#D48E35')
    pencil(29, 11, '#6FA58A', '#4F8068')
    // 붓
    P.rect(37, 16, 3, 16, '#7FA9D6'); P.rect(39, 16, 1, 16, '#5F86B5'); P.rect(36, 13, 5, 3, '#BFC3CA'); P.tri(38.5, 6, 7, 5, '#3A3A40'); P.px(38, 6, '#D14B35')
    pencil(43, 12, '#9B6AA8', '#7A4F87')
    const N = { l: '#5F6C99', m: '#46527C', d: '#333C5E' }
    for (let y = 31; y <= 57; y++) band(P, 31, y, 19, N)
    P.rect(11, 29, 40, 3, '#5F6C99'); snowCap(P, 12, 28, 38)
    P.rect(12, 36, 38, 2, '#F4B860'); P.rect(12, 52, 38, 2, '#F4B860')
    door(P, 22, 44); win(P, 34, 40)
    snowBase(P, 8, 54)
  },
  // 스티커 붙은 빈티지 트렁크
  'sticker-trunk'(P) {
    P.rrect(24, 12, 16, 7, 3, '#5A3A28'); cut(P, () => P.rect(27, 15, 10, 4, '#000'))
    P.rrect(7, 18, 50, 40, 4, '#875838')
    P.rrect(8, 18, 48, 39, 4, '#A8714A')
    P.rect(9, 20, 2, 35, '#C48D62')
    P.rect(53, 20, 2, 35, '#875838')
    P.rect(8, 27, 48, 2, '#6B4430')
    snowCap(P, 10, 17, 44)
    for (const x of [17, 43]) { P.rect(x, 19, 4, 38, '#6B4430'); P.rect(x - 1, 31, 6, 4, '#E3B55C'); P.rect(x + 1, 32, 2, 2, '#6B4430') }
    for (const [x, y] of [[8, 19], [53, 19], [8, 53], [53, 53]]) P.rect(x, y, 3, 3, '#E3B55C')
    // 행성 스티커
    P.ellipse(31, 22.5, 3.5, 3.5, '#F4B860'); P.rect(26, 22, 11, 1, '#43507A'); P.px(29, 21, '#FCE2A8')
    // 별 스티커
    P.rect(46, 40, 5, 1, '#F7F2E8'); P.rect(48, 38, 1, 5, '#F7F2E8')
    P.rrect(11, 35, 5, 7, 1, '#AFC3DA'); P.rect(12, 37, 3, 1, '#43507A')
    door(P, 28, 45); win(P, 33, 32)
    snowBase(P, 5, 59)
  },
  // 캔버스 토트백
  'tote-bag'(P) {
    const handle = (cx) => { P.ellipse(cx, 20, 6, 12, '#43507A'); cut(P, () => P.ellipse(cx, 21, 3.5, 9.5, '#000')) }
    handle(23); handle(41)
    cut(P, () => P.rect(0, 26, 64, 40, '#000'))
    const B = { l: '#F5EBD6', m: '#E8D9BC', d: '#D2BE9A' }
    for (let y = 25; y <= 57; y++) band(P, 32, y, Math.round(20 + (y - 25) * 0.08), B)
    P.rect(12, 25, 40, 3, B.d)
    snowCap(P, 12, 24, 40)
    P.rect(12, 33, 40, 2, '#43507A'); P.rect(12, 36, 40, 1, '#D14B35')
    P.rrect(43, 39, 6, 9, 1, '#D14B35'); P.rect(45, 41, 2, 1, '#F7F2E8') // 태그
    door(P, 25, 45); win(P, 35, 40)
    snowBase(P, 9, 55)
  },
}

// 64x64 그림 → 투명한 테두리를 잘라내고 정수 배율로 키운 스프라이트 (기준점 = 아래 가운데)
function toSprite(src) {
  const t = canvas(64, 64)
  const tc = t.getContext('2d')
  tc.drawImage(src, 0, 0)
  const d = tc.getImageData(0, 0, 64, 64).data
  let x0 = 64, y0 = 64, x1 = -1, y1 = -1
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (d[(y * 64 + x) * 4 + 3] > 20) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, k = ICON_SCALE
  const cv = canvas(w * k, h * k)
  const c = cv.getContext('2d')
  c.imageSmoothingEnabled = false
  c.drawImage(t, x0, y0, w, h, 0, 0, w * k, h * k)
  return { cv, w: w * k, h: h * k, ax: Math.floor((w * k) / 2), ay: h * k - 2 * k, icon: true }
}

// 바깥 윤곽선 얇게: 바깥(투명)에 닿은 어두운 윤곽선을 바깥쪽부터 n 겹 벗겨냄 (안쪽 그림·색은 그대로)
//  원본 윤곽선 두께 ≈ 17px → OUTLINE_PEEL 만큼 줄어듦. 4방향/8방향을 번갈아 써서 대각선도 고르게.
const OUTLINE_PEEL = 7
function thinOutline(img, W, H, n) {
  const d = img.data
  const out = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] < 128) out[i] = 1
  const dark = (i) => d[i * 4 + 3] >= 128 && d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2] < 300
  let front = []
  for (let i = 0; i < W * H; i++) if (out[i]) front.push(i)
  const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]]
  for (let k = 0; k < n; k++) {
    const nb = k % 2 ? N8 : N4, next = []
    for (const i of front) {
      const x = i % W, y = (i / W) | 0
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const j = ny * W + nx
        if (!out[j] && dark(j)) { out[j] = 1; next.push(j) }
      }
    }
    front = next
  }
  for (let i = 0; i < W * H; i++) if (out[i]) d[i * 4 + 3] = 0
}

// 큰 원본 그림 → 투명 테두리만 잘라내고 원본 해상도 그대로 + 미리 줄여둔 단계(mips) — 바깥 윤곽선만 조금 얇게
function toHiresSprite(im) {
  const W = im.naturalWidth, H = im.naturalHeight
  const t = canvas(W, H)
  const tc = t.getContext('2d')
  tc.drawImage(im, 0, 0)
  const img = tc.getImageData(0, 0, W, H)
  thinOutline(img, W, H, OUTLINE_PEEL)
  tc.putImageData(img, 0, 0)
  const d = img.data
  let x0 = W, y0 = H, x1 = -1, y1 = -1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1
  let cv = canvas(cw, ch)
  cv.getContext('2d').drawImage(t, x0, y0, cw, ch, 0, 0, cw, ch)
  const mips = [cv]
  while (cv.width > 160) { // 반씩 줄인 단계 — 화면 크기에 가장 가까운 걸 골라 그리면 깨끗함
    const n = canvas(Math.round(cv.width / 2), Math.round(cv.height / 2))
    const c = n.getContext('2d')
    c.imageSmoothingQuality = 'high'
    c.drawImage(cv, 0, 0, n.width, n.height)
    mips.push((cv = n))
  }
  const w = Math.round(cw / SRC_PER_WORLD), h = Math.round(ch / SRC_PER_WORLD)
  return { cv: mips[0], mips, w, h, ax: Math.floor(w / 2), ay: h - 2, icon: true }
}

function drawIcon(paint) {
  const cv = canvas(64, 64)
  paint(painter(cv.getContext('2d')))
  autoOutline(cv, 0.55)
  return cv
}

let ICONS = {}
// 이미지 파일을 모두 불러온 뒤 스프라이트로 (buildWorld 전에 한 번)
export async function loadShopIcons() {
  const load = (url) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url })
  const imgs = await Promise.all(Object.entries(URLS).map(async ([id, url]) => [id, await load(url)]))
  ICONS = {}
  for (const [id, paint] of Object.entries(DRAWN)) ICONS[id] = toSprite(drawIcon(paint))
  for (const [id, im] of imgs) if (im) ICONS[id] = im.naturalWidth > 128 ? toHiresSprite(im) : toSprite(im)
  return ICONS
}
export const shopIcon = (name) => (name ? ICONS[name] : undefined)
export const iconNames = () => Object.keys(ICONS)
