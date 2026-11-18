import { stampUrl, loadImage } from './stampSvg.js'

// 촬영/업로드한 사진을 가볍게 줄여 dataURL 로 (IndexedDB 저장용)
export async function fileToDataUrl(file, max = 1100) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const cv = document.createElement('canvas')
    cv.width = Math.round(img.naturalWidth * k)
    cv.height = Math.round(img.naturalHeight * k)
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
    return cv.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// 데모용 임시 사진 (?demo=7)
export async function placeholderPhoto(store) {
  const cv = document.createElement('canvas')
  cv.width = 600
  cv.height = 600
  const c = cv.getContext('2d')
  const g = c.createLinearGradient(0, 0, 600, 600)
  g.addColorStop(0, '#dfe8f1')
  g.addColorStop(1, store.color)
  c.fillStyle = g
  c.fillRect(0, 0, 600, 600)
  for (let i = 0; i < 160; i++) {
    c.fillStyle = 'rgba(255,255,255,0.8)'
    c.beginPath()
    c.arc(Math.random() * 600, Math.random() * 600, 2 + Math.random() * 5, 0, 7)
    c.fill()
  }
  const img = await loadImage(stampUrl(store))
  c.globalAlpha = 0.85
  c.drawImage(img, 150, 140, 300, 300)
  return cv.toDataURL('image/jpeg', 0.8)
}

export function fmtDate(iso, withDay = true) {
  const d = new Date(iso)
  const day = '일월화수목금토'[d.getDay()]
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}${withDay ? ` (${day})` : ''}`
}
