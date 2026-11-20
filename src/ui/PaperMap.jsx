// 종이 지도 — 매장 위치를 한눈에 보고, 누르면 그 가게 앞으로 바로 이동
//  왼쪽: 도트로 그린 작은 지도(길·숲·광장) + 번호 핀, 오른쪽: 같은 번호의 목록 (북쪽 → 남쪽 순)
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useApp } from '../store.js'
import { STORES, TYPE_LABEL } from '../data/stores.js'
import { STREETS, BG_STREETS, BG_HALF, PLAZA, NODES, START_NODE, distToStreets } from '../data/map.js'
import { C } from '../pixel/colors.js'
import { rng } from '../pixel/draw.js'

const LIST = [...STORES].sort((a, b) => a.building[1] - b.building[1])

// 지도에 그릴 범위 (걷는 길 + 가게 + 여백)
const BOUNDS = (() => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  const grow = ([x, z]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z) }
  STREETS.forEach((s) => s.pts.forEach(grow))
  STORES.forEach((s) => grow(s.building))
  grow([PLAZA.x, PLAZA.z - PLAZA.r])
  const m = 3.5
  return { x0: x0 - m, z0: z0 - m, w: x1 - x0 + m * 2, h: z1 - z0 + m * 2 }
})()

// 낮은 해상도로 그린 뒤 반투명 픽셀을 정리해서 도트처럼 또렷하게
function drawMap(cv, k) {
  const c = cv.getContext('2d')
  c.clearRect(0, 0, cv.width, cv.height)
  const P = (x, z) => [(x - BOUNDS.x0) * k, (z - BOUNDS.z0) * k]
  const line = (pts) => { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(...P(...p)) : c.moveTo(...P(...p)))); c.stroke() }
  c.lineCap = c.lineJoin = 'round'
  // 숲 (작은 소나무)
  const r = rng(42)
  for (let n = 0; n < 420; n++) {
    const x = BOUNDS.x0 + r() * BOUNDS.w, z = BOUNDS.z0 + r() * BOUNDS.h
    if (distToStreets(x, z, true) < 1.8 || STORES.some((s) => Math.hypot(s.building[0] - x, s.building[1] - z) < 3.4)) continue
    const [px, py] = P(x, z).map(Math.round)
    c.fillStyle = C.pine; c.fillRect(px, py - 2, 1, 1); c.fillRect(px - 1, py - 1, 3, 1)
    c.fillStyle = C.pineDark; c.fillRect(px - 1, py, 3, 1)
    c.fillStyle = C.woodDark; c.fillRect(px, py + 1, 1, 1)
  }
  // 배경 골목
  c.strokeStyle = C.pathSoft
  c.lineWidth = Math.max(1, BG_HALF * 2 * k)
  BG_STREETS.forEach(line)
  // 걷는 길 (테두리 → 흙색 → 큰길 가운데 돌)
  c.strokeStyle = C.pathDeep
  STREETS.forEach((s) => { c.lineWidth = Math.max(2, s.half * 2 * k) + 2; line(s.pts) })
  c.strokeStyle = C.path
  STREETS.forEach((s) => { c.lineWidth = Math.max(2, s.half * 2 * k); line(s.pts) })
  c.strokeStyle = C.pathLight
  STREETS.filter((s) => s.main).forEach((s) => { c.lineWidth = Math.max(1, s.half * k); line(s.pts) })
  // 광장 + 트리
  const [qx, qy] = P(PLAZA.x, PLAZA.z)
  c.fillStyle = C.pathDeep; c.beginPath(); c.arc(qx, qy, PLAZA.r * k + 1, 0, 7); c.fill()
  c.fillStyle = C.pathLight; c.beginPath(); c.arc(qx, qy, PLAZA.r * k, 0, 7); c.fill()
  c.fillStyle = C.pine; c.fillRect(Math.round(qx) - 1, Math.round(qy) - 2, 3, 3); c.fillStyle = C.glow; c.fillRect(Math.round(qx), Math.round(qy) - 3, 1, 1)
  // 반투명 가장자리 정리 → 또렷한 도트
  const img = c.getImageData(0, 0, cv.width, cv.height)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] >= 110 ? 255 : 0
  c.putImageData(img, 0, 0)
}

export default function PaperMap() {
  const stamps = useApp((s) => s.stamps)
  const avatarNode = useApp((s) => s.avatarNode)
  const close = useApp((s) => s.closePaperMap)
  const go = useApp((s) => s.goToStore)
  const body = useRef()
  const cv = useRef()
  const [size, setSize] = useState(null)
  const [hover, setHover] = useState(null)

  useLayoutEffect(() => {
    // 열릴 때 커지는 애니메이션(transform) 영향 없는 실제 레이아웃 폭으로 잼
    const bw = body.current.clientWidth
    const maxH = Math.min(window.innerHeight * 0.66, 560)
    const w = Math.min(bw * 0.56, (maxH * BOUNDS.w) / BOUNDS.h)
    setSize({ w, h: (w * BOUNDS.h) / BOUNDS.w, k: w / BOUNDS.w })
  }, [])
  useEffect(() => {
    if (!size) return
    const PIX = 2 // 지도 도트 하나 = 화면 2px
    cv.current.width = Math.round(size.w / PIX)
    cv.current.height = Math.round(size.h / PIX)
    drawMap(cv.current, size.k / PIX)
  }, [size])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const at = (x, z) => ({ left: (x - BOUNDS.x0) * size.k, top: (z - BOUNDS.z0) * size.k })
  const me = NODES[avatarNode] || NODES[START_NODE]
  const start = NODES[START_NODE]

  return (
    <div className="pm-dim" onClick={close}>
      <div className="pm-card paper" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="서촌 종이 지도">
        <span className="tape tape-blue pm-tape" />
        <button className="x" onClick={close} aria-label="지도 닫기">✕</button>
        <div className="pm-head">
          <h2>서촌 겨울 지도</h2>
          <p className="hand">가게를 누르면 바로 그 앞으로 데려다줄게요</p>
        </div>
        <div className="pm-body" ref={body}>
          <div className="pm-map" style={size ? { width: size.w, height: size.h } : { height: 300 }}>
            <canvas ref={cv} />
            {size && (
              <>
                <span className="pm-compass">N↑</span>
                <span className="pm-start hand" style={at(start[0] - 1.6, start[1])}>출발</span>
                <span className="pm-me" style={at(me[0], me[1])} aria-label="지금 위치"><i />나</span>
                {LIST.map((s, i) => (
                  <button
                    key={s.id}
                    className={'pm-pin' + (stamps[s.id] ? ' done' : '') + (hover === s.id ? ' hot' : '')}
                    style={{ ...at(s.building[0], s.building[1]), background: s.color }}
                    onClick={() => go(s.id)}
                    onPointerEnter={() => setHover(s.id)}
                    onPointerLeave={() => setHover(null)}
                    aria-label={`${i + 1}. ${s.name}으로 이동`}
                  >
                    {i + 1}
                  </button>
                ))}
              </>
            )}
          </div>
          <ol className="pm-list" style={size ? { maxHeight: size.h } : undefined}>
            {LIST.map((s, i) => (
              <li key={s.id}>
                <button
                  className={hover === s.id ? 'hot' : ''}
                  onClick={() => go(s.id)}
                  onPointerEnter={() => setHover(s.id)}
                  onPointerLeave={() => setHover(null)}
                >
                  <span className="num" style={{ background: s.color }}>{i + 1}</span>
                  <span className="nm">
                    <b>{s.name}</b>
                    <small>{s.category || TYPE_LABEL[s.type]}{stamps[s.id] ? ' · 도장 완료' : ''}</small>
                  </span>
                  {stamps[s.id] && <span className="ok">✓</span>}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
