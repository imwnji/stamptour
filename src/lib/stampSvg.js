// 매장별 도장 문양(SVG). React <img>, 3D 엽서 텍스처, 공유 이미지에서 모두 같은 이미지를 씁니다.
const C = 60

function poly(n, r, rot = 0) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * Math.PI * 2
    pts.push(`${(C + r * Math.cos(a)).toFixed(1)},${(C + r * Math.sin(a)).toFixed(1)}`)
  }
  return pts.join(' ')
}

function bumps(n, r, amp) {
  let d = ''
  const steps = n * 12
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const rr = r + amp * Math.abs(Math.cos((a * n) / 2))
    d += (i ? 'L' : 'M') + (C + rr * Math.cos(a)).toFixed(1) + ',' + (C + rr * Math.sin(a)).toFixed(1)
  }
  return d + 'Z'
}

const SHAPES = {
  circle: (c) => `<circle cx="60" cy="60" r="55" fill="none" stroke="${c}" stroke-width="4"/><circle cx="60" cy="60" r="48" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  scallop: (c) => `<path d="${bumps(18, 50, 5)}" fill="none" stroke="${c}" stroke-width="3.4"/><circle cx="60" cy="60" r="46" fill="none" stroke="${c}" stroke-width="1.4" stroke-dasharray="3 3"/>`,
  square: (c) => `<rect x="6" y="6" width="108" height="108" rx="14" fill="none" stroke="${c}" stroke-width="4"/><rect x="13" y="13" width="94" height="94" rx="9" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  hexagon: (c) => `<polygon points="${poly(6, 56, Math.PI / 6)}" fill="none" stroke="${c}" stroke-width="4"/><polygon points="${poly(6, 48, Math.PI / 6)}" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  ticket: (c) => `<rect x="8" y="14" width="104" height="92" rx="6" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="7 3"/><rect x="15" y="21" width="90" height="78" rx="3" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  octagon: (c) => `<polygon points="${poly(8, 57, Math.PI / 8)}" fill="none" stroke="${c}" stroke-width="4"/><polygon points="${poly(8, 49, Math.PI / 8)}" fill="none" stroke="${c}" stroke-width="1.6"/>`,
  flower: (c) => `<path d="${bumps(10, 46, 10)}" fill="none" stroke="${c}" stroke-width="3.6"/><circle cx="60" cy="60" r="45.5" fill="none" stroke="${c}" stroke-width="1.2"/>`,
  shield: (c) => `<path d="M60 4 L110 18 Q110 82 60 116 Q10 82 10 18 Z" fill="none" stroke="${c}" stroke-width="4"/><path d="M60 12 L102 24 Q101 78 60 107 Q19 78 18 24 Z" fill="none" stroke="${c}" stroke-width="1.6"/>`,
}

// 가운데 문양: 0~40 좌표계
const MOTIFS = {
  snowflake: (c) => `<g stroke="${c}" stroke-width="3.2" stroke-linecap="round" fill="none">
    ${[0, 60, 120].map((r) => `<g transform="rotate(${r} 20 20)"><line x1="20" y1="2" x2="20" y2="38"/><polyline points="14,7 20,12 26,7"/><polyline points="14,33 20,28 26,33"/></g>`).join('')}</g>`,
  pencil: (c) => `<g transform="rotate(-35 20 20)"><rect x="14" y="2" width="12" height="27" fill="${c}"/><rect x="14" y="2" width="12" height="5" fill="none" stroke="${c}" stroke-width="2"/><polygon points="14,29 26,29 20,39" fill="none" stroke="${c}" stroke-width="2.4" stroke-linejoin="round"/><polygon points="18.2,35 21.8,35 20,38.5" fill="${c}"/></g>`,
  bowl: (c) => `<g stroke="${c}" stroke-linecap="round" fill="none"><path d="M3 20 H37 Q35 36 20 37 Q5 36 3 20 Z" fill="${c}" stroke-width="2"/><line x1="26" y1="18" x2="38" y2="2" stroke-width="2.4"/><line x1="30" y1="18" x2="40" y2="5" stroke-width="2.4"/><path d="M11 15 q-3 -4 0 -7 q3 -3 0 -7" stroke-width="2.4"/><path d="M19 15 q-3 -4 0 -7 q3 -3 0 -7" stroke-width="2.4"/></g>`,
  mountain: (c) => `<g><polygon points="1,36 16,8 31,36" fill="${c}"/><polygon points="16,36 28,16 40,36" fill="${c}" opacity=".7"/><polygon points="16,8 11.5,17 14,15.5 16,18 18.5,15.5 20.5,17" fill="#fff"/><circle cx="33" cy="6" r="3.4" fill="none" stroke="${c}" stroke-width="2"/></g>`,
  camera: (c) => `<g><rect x="2" y="11" width="36" height="25" rx="4" fill="${c}"/><rect x="9" y="6" width="10" height="7" rx="1.5" fill="${c}"/><circle cx="20" cy="23.5" r="8.5" fill="#fff"/><circle cx="20" cy="23.5" r="5.5" fill="${c}"/><circle cx="32" cy="16" r="2" fill="#fff"/></g>`,
  teapot: (c) => `<g fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"><ellipse cx="19" cy="26" rx="13" ry="10" fill="${c}"/><path d="M31 23 Q38 22 39 14"/><path d="M7 21 Q0 22 2 29 Q4 33 9 31"/><path d="M13 16 Q19 9 25 16"/><circle cx="19" cy="10" r="2" fill="${c}"/><path d="M33 9 q-2 -3 0 -5 q2 -2 0 -4" stroke-width="1.8"/></g>`,
  fish: (c) => `<g><path d="M4 20 Q14 6 28 12 L38 5 L36 20 L38 35 L28 28 Q14 34 4 20 Z" fill="${c}"/><circle cx="11" cy="18" r="2.2" fill="#fff"/><g fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"><path d="M16 15 q3 5 0 10"/><path d="M21 14 q3 6 0 12"/></g></g>`,
  mitten: (c) => `<g><path d="M9 30 V14 Q9 3 19 3 Q29 3 29 13 V19 Q33 13 37 17 Q39 20 33 27 L29 31 Z" fill="${c}"/><rect x="7" y="29" width="24" height="9" rx="2" fill="none" stroke="${c}" stroke-width="2.6"/><g stroke="#fff" stroke-width="1.6" stroke-linecap="round"><line x1="14" y1="13" x2="24" y2="13"/><line x1="14" y1="19" x2="24" y2="19"/></g></g>`,
  bean: (c) => `<g transform="rotate(30 20 20)"><ellipse cx="20" cy="20" rx="12" ry="17" fill="${c}"/><path d="M15 6 Q25 20 15 34" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`,
  mug: (c) => `<g><path d="M6 14 H28 V30 Q28 36 22 36 H12 Q6 36 6 30 Z" fill="${c}"/><path d="M28 18 Q36 18 36 24 Q36 30 28 30" fill="none" stroke="${c}" stroke-width="3"/><path d="M12 10 q-2 -3 0 -6 M18 10 q-2 -3 0 -6 M24 10 q-2 -3 0 -6" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M11 23 l3 3 l3 -3 l3 3 l3 -3" stroke="#fff" stroke-width="1.8" fill="none" stroke-linejoin="round"/></g>`,
  drumstick: (c) => `<g><ellipse cx="16" cy="16" rx="13" ry="11" transform="rotate(-40 16 16)" fill="${c}"/><rect x="22" y="23" width="6" height="12" rx="2" transform="rotate(-45 25 29)" fill="${c}"/><circle cx="31" cy="35" r="3.4" fill="${c}"/><circle cx="35" cy="31" r="3.4" fill="${c}"/><path d="M9 14 q4 -6 11 -5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`,
  berry: (c) => `<g><path d="M20 38 Q5 26 8 15 Q12 8 20 10 Q28 8 32 15 Q35 26 20 38 Z" fill="${c}"/><path d="M11 9 L20 13 L29 9 L24 4 L20 8 L16 4 Z" fill="${c}" opacity=".7"/><g fill="#fff"><circle cx="15" cy="19" r="1.4"/><circle cx="22" cy="17" r="1.4"/><circle cx="27" cy="23" r="1.4"/><circle cx="17" cy="26" r="1.4"/><circle cx="22" cy="31" r="1.4"/></g></g>`,
  moon: (c) => `<g><path d="M24 3 A17 17 0 1 0 37 29 A13 13 0 1 1 24 3 Z" fill="${c}"/><circle cx="33" cy="8" r="2" fill="${c}"/><circle cx="29" cy="17" r="1.3" fill="${c}"/></g>`,
  bread: (c) => `<g><path d="M3 28 Q3 11 20 11 Q37 11 37 28 Q37 34 31 34 H9 Q3 34 3 28 Z" fill="${c}"/><g stroke="#fff" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="18" x2="15" y2="26"/><line x1="19" y1="17" x2="21" y2="26"/><line x1="26" y1="17" x2="27" y2="26"/></g></g>`,
  leaf: (c) => `<g><path d="M6 35 Q3 10 35 4 Q37 31 6 35 Z" fill="${c}"/><path d="M8 33 Q18 21 30 9" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M15 25 l-1 -6 M21 19 l-1 -6 M18 22 l6 1 M24 16 l6 1" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`,
  gate: (c) => `<g fill="${c}"><rect x="5" y="11" width="9" height="25" rx="1"/><rect x="26" y="11" width="9" height="25" rx="1"/><rect x="3" y="5" width="13" height="5" rx="1"/><rect x="24" y="5" width="13" height="5" rx="1"/><rect x="1" y="36" width="38" height="3" rx="1"/><g fill="#fff"><rect x="7.5" y="15" width="4" height="2"/><rect x="28.5" y="15" width="4" height="2"/></g></g>`,
  brush: (c) => `<g transform="rotate(35 20 20)"><rect x="17" y="1" width="6" height="22" rx="2" fill="${c}"/><rect x="15.5" y="22" width="9" height="4" fill="${c}" opacity=".7"/><path d="M16 26 H24 Q25 34 20 39 Q15 34 16 26 Z" fill="${c}"/></g>`,
  gift: (c) => `<g><rect x="5" y="16" width="30" height="21" rx="2" fill="${c}"/><rect x="3" y="11" width="34" height="7" rx="2" fill="${c}"/><rect x="18" y="11" width="4" height="26" fill="#fff"/><path d="M20 11 Q12 2 9 7 Q7 11 20 11 Q28 2 31 7 Q33 11 20 11" fill="none" stroke="${c}" stroke-width="2.4"/></g>`,
  planet: (c) => `<g><circle cx="20" cy="20" r="10" fill="${c}"/><ellipse cx="20" cy="20" rx="18" ry="6" transform="rotate(-20 20 20)" fill="none" stroke="${c}" stroke-width="2.6"/><circle cx="35" cy="5" r="1.8" fill="${c}"/><circle cx="5" cy="35" r="1.4" fill="${c}"/><circle cx="16" cy="16" r="2.4" fill="#fff" opacity=".7"/></g>`,
  bag: (c) => `<g><path d="M6 14 H34 L32 37 H8 Z" fill="${c}"/><path d="M14 17 V10 Q14 4 20 4 Q26 4 26 10 V17" fill="none" stroke="${c}" stroke-width="2.8"/><circle cx="14" cy="17" r="1.7" fill="#fff"/><circle cx="26" cy="17" r="1.7" fill="#fff"/></g>`,
}

let seed = 1
export function stampSvg(store, { withFilter = true } = {}) {
  const c = store.color
  const id = 'ink' + seed++
  const shape = SHAPES[store.stamp.shape](c)
  const motif = MOTIFS[store.stamp.motif](c)
  const text = store.nameEn.replace(/&/g, "&amp;")
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="240" height="240">
  <defs>
    <path id="arc" d="M60,98 A38,38 0 1,1 60,22 A38,38 0 1,1 60,98"/>
    <filter id="${id}" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="${(store.id.length * 7) % 50}" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="1" seed="${store.id.length * 3}" result="n2"/>
      <feColorMatrix in="n2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.45" result="m"/>
      <feComposite in="d" in2="m" operator="in"/>
    </filter>
  </defs>
  <g ${withFilter ? `filter="url(#${id})"` : ''}>
    ${shape}
    <text font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${text.length > 15 ? 7.8 : 8.6}" letter-spacing="1.2" fill="${c}">
      <textPath href="#arc" startOffset="50%" text-anchor="middle">${text}</textPath>
    </text>
    <g transform="translate(40 48)">${motif}</g>
    <text x="60" y="97" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="6.2" letter-spacing="1.6" fill="${c}" text-anchor="middle">SEOCHON · WINTER</text>
  </g>
</svg>`
}

// 간판용: 가운데 문양만
export function motifUrl(store, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 44 44" width="240" height="240">${MOTIFS[store.stamp.motif](color)}</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const cache = {}
export function stampUrl(store) {
  if (!cache[store.id]) cache[store.id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(stampSvg(store))
  return cache[store.id]
}

// 업종 실루엣 (빈 칸)
export const SILHOUETTE = {
  cafe: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M5 14 H29 V26 Q29 34 21 34 H13 Q5 34 5 26 Z" fill="currentColor"/><path d="M29 17 Q36 17 36 22 Q36 27 29 27" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 10 q-2 -3 0 -5 M18 10 q-2 -3 0 -5 M24 10 q-2 -3 0 -5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="3" y="35" width="30" height="2.5" rx="1.2" fill="currentColor"/></svg>`,
  gift: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="16" width="30" height="20" rx="2" fill="currentColor"/><rect x="3" y="11" width="34" height="7" rx="2" fill="currentColor"/><path d="M20 11 Q12 2 9 7 Q7 11 20 11 Q28 2 31 7 Q33 11 20 11" fill="none" stroke="currentColor" stroke-width="2.4"/><rect x="18" y="11" width="4" height="25" fill="#fff" opacity=".55"/></svg>`,
  food: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M3 18 H37 Q35 34 20 35 Q5 34 3 18 Z" fill="currentColor"/><rect x="13" y="35" width="14" height="3" rx="1.5" fill="currentColor"/><path d="M12 14 q-3 -4 0 -7 M20 14 q-3 -4 0 -7 M28 14 q-3 -4 0 -7" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
