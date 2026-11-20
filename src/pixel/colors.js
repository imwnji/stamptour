// 도트 색 — 겨울 팔레트(palette.js) 8색을 그대로 쓰고, 명암용으로 같은 색의 밝은/어두운 단계만 추가
import { PAL } from './palette.js'

export const C = {
  snow: PAL.snow, snowHi: '#FDFCF8', snowMid: '#E3E8E6', snowShade: PAL.shade, snowDeep: '#8A9FAB',
  sky: PAL.sky, skyLight: '#DCEAEE', skyDark: '#95B4BF',
  pine: PAL.pine, pineLight: '#6F9180', pineDark: '#435F55', pineDeep: '#31473F',
  roof: PAL.roof, roofLight: '#DE9F88', roofDark: '#A5614F', roofDeep: '#7F4538',
  glow: PAL.glow, glowLight: '#FBE6B3', glowDark: '#D7A656',
  wood: PAL.wood, woodLight: '#B9987D', woodDark: '#775942', woodDeep: '#55402F',
  path: PAL.path, pathLight: '#E4D7C0', pathDark: '#C0AA89', pathDeep: '#A28B6C', pathSoft: '#E9E2D3',
  iron: '#4B5258', ironLight: '#6A737A', ink: '#2F2A36', paper: '#FBF6EC',
  stone: '#BDBBB3', stoneDark: '#9A988F',
}

// #rrggbb 밝기 조절 (k < 1 어둡게, > 1 밝게) — 가게마다 다른 벽·차양 색의 명암 단계용
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))))
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}
