import * as THREE from 'three'

// 간판 텍스처 — 실제 매장 간판 이미지가 생기면 여기서 이미지로 교체
export function signTexture(text, bg, fg = '#fffaf0', w = 512, h = 128) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const c = cv.getContext('2d')
  c.fillStyle = bg
  c.beginPath()
  c.roundRect(4, 4, w - 8, h - 8, 22)
  c.fill()
  c.strokeStyle = 'rgba(255,255,255,0.55)'
  c.lineWidth = 5
  c.setLineDash([12, 8])
  c.beginPath()
  c.roundRect(14, 14, w - 28, h - 28, 16)
  c.stroke()
  c.fillStyle = fg
  let size = 74
  c.font = `700 ${size}px Gaegu, sans-serif`
  while (c.measureText(text).width > w - 60 && size > 30) {
    size -= 4
    c.font = `700 ${size}px Gaegu, sans-serif`
  }
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(text, w / 2, h / 2 + 4)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function stripeTexture(color) {
  const cv = document.createElement('canvas')
  cv.width = 128
  cv.height = 16
  const c = cv.getContext('2d')
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? '#fffaf0' : color
    c.fillRect(i * 16, 0, 16, 16)
  }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function snowDotTexture() {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const c = cv.getContext('2d')
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.85)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(cv)
}

export function postcardTexture(stampImg, color) {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 320
  const c = cv.getContext('2d')
  c.fillStyle = '#fffdf7'
  c.fillRect(0, 0, 256, 320)
  c.strokeStyle = color
  c.lineWidth = 6
  c.setLineDash([10, 7])
  c.strokeRect(12, 12, 232, 296)
  c.setLineDash([])
  c.save()
  c.translate(128, 140)
  c.rotate(-0.12)
  c.drawImage(stampImg, -100, -100, 200, 200)
  c.restore()
  c.fillStyle = color
  c.font = '700 34px Gaegu, sans-serif'
  c.textAlign = 'center'
  c.fillText('VISITED ✓', 128, 288)
  // 마스킹테이프
  c.fillStyle = 'rgba(240,200,120,0.85)'
  c.save()
  c.translate(128, 8)
  c.rotate(0.05)
  c.fillRect(-46, -14, 92, 30)
  c.restore()
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 지붕 위 둥근 간판: 매장 문양 아이콘 + 이름
export function plaqueTexture(store, iconImg) {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 360
  const c = cv.getContext('2d')
  c.fillStyle = '#8a6250'
  c.beginPath()
  c.roundRect(0, 0, 512, 360, 90)
  c.fill()
  c.fillStyle = '#f7ecdc'
  c.beginPath()
  c.roundRect(18, 18, 476, 324, 74)
  c.fill()
  c.strokeStyle = 'rgba(138,98,80,0.35)'
  c.lineWidth = 5
  c.setLineDash([12, 9])
  c.beginPath()
  c.roundRect(36, 36, 440, 288, 60)
  c.stroke()
  c.setLineDash([])
  if (iconImg) c.drawImage(iconImg, 256 - 85, 44, 170, 170)
  c.fillStyle = '#7a5444'
  let size = 66
  c.font = `700 ${size}px Gaegu, sans-serif`
  while (c.measureText(store.sign).width > 420 && size > 34) {
    size -= 4
    c.font = `700 ${size}px Gaegu, sans-serif`
  }
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(store.sign, 256, 268)
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

export function awningTexture(color, style) {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 32
  const c = cv.getContext('2d')
  if (style === 'solid') {
    c.fillStyle = color
    c.fillRect(0, 0, 256, 32)
    c.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 8; i++) c.fillRect(i * 32 + 14, 0, 4, 32)
  } else {
    for (let i = 0; i < 10; i++) {
      c.fillStyle = i % 2 ? '#fbf3ea' : color
      c.fillRect(i * 25.6, 0, 25.6, 32)
    }
  }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function brickTexture() {
  const cv = document.createElement('canvas')
  cv.width = 256
  cv.height = 128
  const c = cv.getContext('2d')
  c.fillStyle = '#ead1ca'
  c.fillRect(0, 0, 256, 128)
  const rows = 6
  const bh = 128 / rows
  for (let y = 0; y < rows; y++) {
    const off = y % 2 ? 21 : 0
    for (let x = -1; x < 7; x++) {
      const v = 0.92 + ((x * 7 + y * 13) % 5) * 0.025
      c.fillStyle = `rgb(${Math.round(196 * v)},${Math.round(132 * v)},${Math.round(128 * v)})`
      c.fillRect(x * 42 + off + 2, y * bh + 2, 38, bh - 4)
    }
  }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  return t
}

export function chalkTexture(kind) {
  const cv = document.createElement('canvas')
  cv.width = 128
  cv.height = 160
  const c = cv.getContext('2d')
  c.fillStyle = '#3c3a38'
  c.fillRect(0, 0, 128, 160)
  c.strokeStyle = '#f2ebe2'
  c.fillStyle = '#f2ebe2'
  c.lineWidth = 5
  c.lineCap = 'round'
  if (kind === 'cafe') {
    c.beginPath(); c.roundRect(34, 60, 50, 48, 10); c.stroke()
    c.beginPath(); c.arc(90, 82, 11, -1.3, 1.3); c.stroke()
    c.beginPath(); c.moveTo(28, 120); c.lineTo(96, 120); c.stroke()
  } else if (kind === 'gift') {
    c.beginPath(); c.moveTo(64, 48); c.lineTo(64, 62); c.moveTo(64, 62); c.lineTo(24, 100); c.lineTo(104, 100); c.closePath(); c.stroke()
    c.beginPath(); c.arc(64, 44, 7, 0, 7); c.stroke()
  } else {
    for (let i = 0; i < 5; i++) {
      c.fillRect(22, 36 + i * 22, 46 + ((i * 17) % 30), 5)
      c.fillRect(92, 36 + i * 22, 14, 5)
    }
  }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function checkTexture() {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 64
  const c = cv.getContext('2d')
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      c.fillStyle = (x + y) % 2 ? '#f6dede' : '#d9737c'
      c.fillRect(x * 8, y * 8, 8, 8)
    }
  const t = new THREE.CanvasTexture(cv)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
