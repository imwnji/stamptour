// 도트 색 — 팔레트(palette.js)를 그대로 쓰고, 명암용으로 같은 색의 밝은/어두운 단계만 추가
import { PAL } from './palette.js'

export const C = {
  snow: PAL.snow, snowHi: '#FFFDF8', snowMid: '#E4E5E4', snowShade: PAL.shade, snowDeep: '#7F8FAB',
  sky: PAL.sky, skyLight: '#D6E1EE', skyDark: '#8199B8',
  pine: PAL.pine, pineLight: '#56826D', pineDark: PAL.pineDark, pineDeep: '#1F3A33',
  roof: PAL.roof, roofLight: '#E2876C', roofDark: PAL.roofDark, roofDeep: '#73301F',
  glow: PAL.glow, glowLight: '#FCE2A8', glowDark: '#D48E35',
  wood: PAL.wood, woodLight: '#B48B6A', woodDark: PAL.woodDark, woodDeep: '#4B3326',
  path: PAL.path, pathLight: '#E1DACD', pathDark: PAL.pathDark, pathDeep: '#8D8273', pathSoft: PAL.pathSoft,
  iron: '#3E4458', ironLight: '#5F677E', ink: PAL.ink, paper: '#FBF7EE',
  stone: '#BCB8B0', stoneDark: '#959188',
  grid: '#CBD2DC', // 일기장 도트 그리드 (눈밭 위 1칸마다 점 하나)
}

// #rrggbb 밝기 조절 (k < 1 어둡게, > 1 밝게) — 가게마다 다른 벽·차양 색의 명암 단계용
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1))))
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}
