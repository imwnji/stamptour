// 도트 색 — 팔레트(palette.js)를 그대로 쓰고, 명암용으로 같은 색의 밝은/어두운 단계만 추가
import { PAL } from './palette.js'

export const C = {
  snow: PAL.snow, snowHi: '#FFFFFF', snowMid: PAL.snowShade, snowShade: PAL.shade, snowDeep: '#8E9FB0', snowTrod: '#ECEEEA',
  sky: PAL.sky, skyLight: '#C9D9E6', skyDark: '#6F8FAA',
  pine: PAL.pine, pineLight: '#7F9C91', pineDark: PAL.pineDark, pineDeep: '#334F45',
  roof: PAL.roof, roofLight: '#D27A66', roofDark: PAL.roofDark, roofDeep: '#6E2C21',
  glow: PAL.glow, glowLight: '#F7DFAE', glowDark: '#D3A158', light: PAL.light,
  wood: PAL.wood, woodLight: '#AE927C', woodDark: PAL.woodDark, woodDeep: '#4A3A30',
  path: PAL.path, pathLight: '#EEEBE4', pathDark: PAL.pathDark, pathDeep: '#B7B0A3', pathSoft: PAL.pathSoft,
  iron: '#454B5E', ironLight: '#687086', ink: PAL.ink, paper: '#FBFAF6',
  stone: '#D4D0C6', stoneDark: '#CBC6BB', stoneLight: '#DEDAD2',
  grid: '#E5E8EB', // 일기장 도트 그리드 (눈밭 위 1칸마다 점 하나, 아주 옅게)
}

// #rrggbb 밝기 조절 (k < 1 어둡게, > 1 밝게) — 가게마다 다른 벽·차양 색의 명암 단계용
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))))
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

// 두 색 섞기 (t = 0 → a, 1 → b)
export function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  const A = p(a), B = p(b)
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')
}
