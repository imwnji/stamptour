// 완성한 윈터 저널을 SNS 공유용 이미지 한 장(1080x1920)으로 그립니다.
import { STORES } from '../data/stores.js'
import { stampUrl, loadImage } from './stampSvg.js'
import { fmtDate } from './photo.js'

const W = 1080
const H = 1920

function wrap(c, text, maxW, maxLines) {
  // 띄어쓰기 단위로 줄바꿈, 한 단어가 너무 길면 글자 단위
  const words = text.split(' ')
  const out = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (c.measureText(test).width <= maxW) line = test
    else {
      if (line) out.push(line)
      line = w
      while (c.measureText(line).width > maxW) {
        let k = line.length
        while (k > 1 && c.measureText(line.slice(0, k)).width > maxW) k--
        out.push(line.slice(0, k))
        line = line.slice(k)
      }
    }
  }
  if (line) out.push(line)
  if (out.length > maxLines) {
    out.length = maxLines
    out[maxLines - 1] = out[maxLines - 1].replace(/.$/, '…')
  }
  return out
}

function fitFont(c, text, weight, size, maxW) {
  let s = size
  c.font = `${weight} ${s}px Galmuri11`
  while (c.measureText(text).width > maxW && s > 20) {
    s -= 2
    c.font = `${weight} ${s}px Galmuri11`
  }
}

function coverDraw(c, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height)
  const sw = w / k, sh = h / k
  c.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h)
}

export async function renderJournalImage(stamps) {
  try { await document.fonts.load('700 40px Galmuri11') } catch {}
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const c = cv.getContext('2d')

  // 종이
  c.fillStyle = '#f6f0e4'
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 14000; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(120,100,70,0.05)' : 'rgba(255,255,255,0.5)'
    c.fillRect(Math.random() * W, Math.random() * H, 2, 2)
  }
  // 모눈
  c.strokeStyle = 'rgba(120,140,170,0.12)'
  c.lineWidth = 1
  for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke() }
  for (let y = 0; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke() }

  // 크리스마스 전구
  c.strokeStyle = '#3d4a3d'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(0, 40)
  for (let x = 0; x <= W; x += 10) c.lineTo(x, 40 + Math.sin((x / W) * Math.PI * 3) * 22 + 30)
  c.stroke()
  const bulbs = ['#ff5a5a', '#ffd25a', '#5ad1ff', '#7be37b', '#ff8ad8']
  for (let i = 0; i < 16; i++) {
    const x = 30 + i * 68
    const y = 40 + Math.sin((x / W) * Math.PI * 3) * 22 + 30
    const col = bulbs[i % bulbs.length]
    const g = c.createRadialGradient(x, y + 22, 2, x, y + 22, 40)
    g.addColorStop(0, col + 'aa')
    g.addColorStop(1, col + '00')
    c.fillStyle = g
    c.beginPath(); c.arc(x, y + 22, 40, 0, 7); c.fill()
    c.fillStyle = '#556'
    c.fillRect(x - 6, y, 12, 10)
    c.fillStyle = col
    c.beginPath(); c.ellipse(x, y + 24, 11, 16, 0, 0, 7); c.fill()
  }

  // 제목
  c.textAlign = 'center'
  c.fillStyle = '#34405e'
  c.font = '700 84px Galmuri11'
  c.fillText('SEOCHON WINTER JOURNAL', W / 2, 220)
  c.fillStyle = '#7a6a58'
  c.font = '700 44px Galmuri11'
  const done = STORES.filter((s) => stamps[s.id]).length
  c.fillText(`겨울의 서촌을 기록하다  ·  ${done} / ${STORES.length}`, W / 2, 285)

  const stampImgs = await Promise.all(STORES.map((s) => loadImage(stampUrl(s))))
  const photos = await Promise.all(STORES.map((s) => (stamps[s.id]?.photo ? loadImage(stamps[s.id].photo).catch(() => null) : null)))

  // 칸 하나 = 495 x 380 (원래 2열 기준) 을 매장 수에 맞춰 축소해서 격자 배치
  const n = STORES.length
  const cols = n <= 8 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const PW = 495, PH = 380, top = 330, bottom = 110
  const sc = Math.min(1, (W - 80) / (cols * PW), (H - top - bottom) / (rows * PH))
  const left = (W - cols * PW * sc) / 2
  STORES.forEach((s, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    c.save()
    c.translate(left + col * PW * sc, top + row * PH * sc)
    c.scale(sc, sc)
    const x = 0, y = 0
    const rec = stamps[s.id]
    const tilt = (i % 2 ? 1 : -1) * (0.03 + (i % 3) * 0.012)

    // 폴라로이드
    c.save()
    c.translate(x + 115, y + 140)
    c.rotate(tilt)
    c.shadowColor = 'rgba(60,40,20,0.22)'
    c.shadowBlur = 16
    c.shadowOffsetY = 6
    c.fillStyle = '#fffefb'
    c.fillRect(-110, -130, 220, 262)
    c.shadowColor = 'transparent'
    if (photos[i]) coverDraw(c, photos[i], -96, -116, 192, 192)
    else {
      c.fillStyle = '#e9e4da'
      c.fillRect(-96, -116, 192, 192)
    }
    c.fillStyle = '#5d5348'
    c.font = '700 30px Galmuri11'
    c.fillText(rec ? fmtDate(rec.date, false) : '—', 0, 112)
    // 테이프
    c.fillStyle = ['rgba(240,200,120,0.8)', 'rgba(170,205,230,0.8)', 'rgba(240,170,170,0.8)'][i % 3]
    c.rotate(-tilt * 3)
    c.fillRect(-48, -146, 96, 32)
    c.restore()

    // 도장
    c.save()
    c.translate(x + 340, y + 95)
    c.rotate(-tilt * 2.5)
    c.globalAlpha = rec ? 0.92 : 0.15
    c.drawImage(stampImgs[i], -88, -88, 176, 176)
    c.restore()

    // 이름 / 기록
    c.textAlign = 'center'
    c.fillStyle = s.color
    fitFont(c, s.name, 700, 36, 205)
    c.fillText(s.name, x + 340, y + 222)
    c.fillStyle = '#5d5348'
    c.font = '400 28px Galmuri11'
    const lines = wrap(c, rec?.note || '', 205, 2)
    lines.forEach((ln, k) => c.fillText(ln, x + 340, y + 262 + k * 32))
    c.restore()
  })

  c.textAlign = 'center'
  c.fillStyle = '#8a7b68'
  c.font = '700 38px Galmuri11'
  c.fillText('#서촌겨울스탬프투어  #SEOCHONWINTERJOURNAL', W / 2, H - 60)

  return new Promise((resolve) => cv.toBlob((b) => resolve(b), 'image/png'))
}
