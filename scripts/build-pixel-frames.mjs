// 도트 테두리(border-image)용 8x8 SVG 를 만들어 src/pixel-frames.css 로 씁니다.
//  모서리가 깎인 도트 상자 + 위·왼쪽 밝은 면, 아래·오른쪽 그늘.  색을 바꾸면: node scripts/build-pixel-frames.mjs
//  CSS: border: 6px solid transparent; border-image: var(--px-paper) 3 fill / 6px stretch;
import { writeFileSync } from 'node:fs'

const INK = '#30354A'
const FRAMES = {
  paper: { o: INK, h: '#FFFFFF', f: '#F8F6F0', s: '#E6E1D7' },
  card: { o: INK, h: '#FFFFFF', f: '#FFFDF9', s: '#ECE7DE' },
  ink: { o: '#1B1E2D', h: '#4E5572', f: INK, s: '#222638' },
  red: { o: INK, h: '#D67563', f: '#B94D3B', s: '#963C2D' },
  pine: { o: INK, h: '#5E8D76', f: '#3B6655', s: '#2C5044' },
  amber: { o: INK, h: '#FCE2A8', f: '#F4B860', s: '#D48E35' },
  gray: { o: '#9A9286', h: '#E4DFD6', f: '#D3CDC2', s: '#B9B2A5' },
  // 메모지: 외곽선이 연한 종이 (지도 위 손글씨 쪽지)
  memo: { o: '#BDB6AA', h: '#FFFFFF', f: '#FFFEFB', s: '#EFEBE3' },
}
const ROWS = [
  '..OOOO..',
  '.OHHHHO.',
  'OHFFFFSO',
  'OHFFFFSO',
  'OHFFFFSO',
  'OHFFFFSO',
  '.OSSSSO.',
  '..OOOO..',
]
const svg = (c) => {
  const map = { O: c.o, H: c.h, F: c.f, S: c.s }
  let r = ''
  ROWS.forEach((row, y) => [...row].forEach((ch, x) => {
    if (map[ch]) r += `<rect x='${x}' y='${y}' width='1' height='1' fill='${map[ch]}'/>`
  }))
  const s = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8' width='8' height='8' shape-rendering='crispEdges'>${r}</svg>`
  return `url("data:image/svg+xml,${s.replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E')}")`
}

let css = '/* 자동 생성 — scripts/build-pixel-frames.mjs (직접 고치지 말 것) */\n:root {\n'
for (const [k, c] of Object.entries(FRAMES)) css += `  --px-${k}: ${svg(c)};\n`
css += '}\n'
writeFileSync(new URL('../src/pixel-frames.css', import.meta.url), css)
console.log('src/pixel-frames.css', Object.keys(FRAMES).join(', '))
