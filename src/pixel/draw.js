// 도트 그리기 도구 — 정수 좌표 fillRect 만 써서 번짐 없는 픽셀
import { C } from './colors.js'

export function canvas(w, h) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  return cv
}

// 붓: 스프라이트 하나를 그릴 때 쓰는 도구 모음
export function painter(c) {
  const P = {
    c,
    px(x, y, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1) },
    rect(x, y, w, h, col) { if (w <= 0 || h <= 0) return; c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) },
    // 타원 (cx, cy 는 .5 단위 가능)
    ellipse(cx, cy, rx, ry, col) {
      c.fillStyle = col
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
        const t = (y + 0.5 - cy) / ry
        if (Math.abs(t) > 1) continue
        const hw = rx * Math.sqrt(1 - t * t)
        const x0 = Math.round(cx - hw), x1 = Math.round(cx + hw)
        if (x1 > x0) c.fillRect(x0, y, x1 - x0, 1)
      }
    },
    // 둥근 사각형
    rrect(x, y, w, h, r, col) {
      c.fillStyle = col
      for (let yy = 0; yy < h; yy++) {
        const dy = yy < r ? r - yy - 0.5 : yy >= h - r ? yy - (h - r) + 0.5 : 0
        const inset = dy > 0 ? Math.round(r - Math.sqrt(Math.max(0, r * r - dy * dy))) : 0
        c.fillRect(x + inset, y + yy, w - inset * 2, 1)
      }
    },
    // 위가 반원인 아치 (x,y = 왼쪽 위, w 너비, h 높이)
    arch(x, y, w, h, col) {
      const r = w / 2
      P.ellipse(x + r, y + r, r, r, col)
      P.rect(x, y + r, w, h - r, col)
    },
    // 삼각형(위가 뾰족) 행 단위
    tri(cx, top, h, w, col) {
      c.fillStyle = col
      for (let r = 0; r < h; r++) {
        const hw = Math.round(((r + 1) / h) * (w / 2))
        c.fillRect(Math.round(cx - hw), top + r, hw * 2, 1)
      }
    },
    // 바둑판 디더
    dither(x, y, w, h, col, phase = 0) {
      c.fillStyle = col
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if ((xx + yy + phase) % 2 === 0) c.fillRect(x + xx, y + yy, 1, 1)
    },
  }
  return P
}

const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
const INK = hexRGB(C.ink)

// 투명 픽셀 중 그림에 닿은 곳을 "그 색의 진한 버전"으로 칠해 외곽선 (도트 게임처럼 색이 있는 테두리)
export function autoOutline(cv, strength = 0.5) {
  const c = cv.getContext('2d')
  const img = c.getImageData(0, 0, cv.width, cv.height)
  const d = img.data, w = cv.width, h = cv.height
  const src = new Uint8ClampedArray(d)
  const at = (x, y) => (y * w + x) * 4
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = at(x, y)
      if (src[i + 3] > 0) continue
      let best = -1
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = at(nx, ny)
        if (src[j + 3] > 200) { best = j; if (dy === -1) break } // 위쪽 이웃 색을 우선
      }
      if (best < 0) continue
      for (let k = 0; k < 3; k++) d[i + k] = Math.round(src[best + k] * (1 - strength) * 0.62 + INK[k] * strength)
      d[i + 3] = 255
    }
  c.putImageData(img, 0, 0)
}

// 배율 k 로 "다시 그리는" 붓: 좌표를 k 배 한 뒤 원래 해상도에서 칠함 (그린 뒤 늘리는 게 아니라 번짐·들쭉날쭉한 픽셀 없음)
export function scaledPainter(c, k) {
  if (k === 1) return painter(c)
  const B = painter(c)
  const R = (v) => Math.round(v * k)
  const box = (x, y, w, h) => [R(x), R(y), R(x + w) - R(x), R(y + h) - R(y)]
  return {
    c,
    rect: (x, y, w, h, col) => B.rect(...box(x, y, w, h), col),
    px: (x, y, col) => B.rect(...box(x | 0, y | 0, 1, 1), col),
    ellipse: (cx, cy, rx, ry, col) => B.ellipse(cx * k, cy * k, rx * k, ry * k, col),
    rrect: (x, y, w, h, r, col) => B.rrect(...box(x, y, w, h), r * k, col),
    arch: (x, y, w, h, col) => B.arch(...box(x, y, w, h), col),
    tri: (cx, top, h, w, col) => B.tri(cx * k, R(top), R(top + h) - R(top), w * k, col),
    dither: (x, y, w, h, col, phase) => B.dither(...box(x, y, w, h), col, phase),
  }
}

// 스프라이트 만들기: paint(P) 로 그린 뒤 외곽선. 기준점 = 아래 가운데 (바닥에 닿는 곳)
//  outline: true(보통) | false(없음) | 0~1 숫자(외곽선 진하기 — 나무처럼 배경으로 물러날 것은 옅게)
//  scale: 배율 (가게처럼 크게 다시 그릴 때, withScale 로 지정)
let SCALE = 1
export function sprite(w, h, paint, { outline = true, ax, ay, scale = SCALE } = {}) {
  const W = Math.round(w * scale), H = Math.round(h * scale)
  const cv = canvas(W + 2, H + 2)
  const c = cv.getContext('2d')
  c.translate(1, 1)
  paint(scaledPainter(c, scale))
  if (outline) autoOutline(cv, typeof outline === 'number' ? outline : 0.5) // 숫자면 외곽선 진하기 (배경 소품은 옅게)
  return { cv, w: W + 2, h: H + 2, ax: ax !== undefined ? Math.round(ax * scale) + 1 : Math.floor((W + 2) / 2), ay: ay !== undefined ? Math.round(ay * scale) + 1 : H + 1 }
}
// fn 안에서 만드는 스프라이트를 모두 배율 k 로
export function withScale(k, fn) {
  const prev = SCALE
  SCALE = k
  try { return fn() } finally { SCALE = prev }
}

// 좌우 뒤집기
export function mirror(s) {
  const cv = canvas(s.w, s.h)
  const c = cv.getContext('2d')
  c.translate(s.w, 0)
  c.scale(-1, 1)
  c.drawImage(s.cv, 0, 0)
  return { ...s, cv, ax: s.w - s.ax }
}

// 결정적인 난수 (같은 지도가 매번 똑같이 그려지게)
export function rng(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}
export function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
