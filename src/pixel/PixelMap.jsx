// 지도 화면 — 위에서 내려다본 2D 도트 마을
//  - 캔버스 하나에 바닥 + y 순서대로 세운 물체 + 아바타 + 눈송이
//  - 배율은 정수(도트가 번지지 않게), 카메라도 정수 픽셀에 맞춤
//  - 매장 탭 → 통 튀고 → 실제 길(findPath)로 걸어감 → 매장 시트 (store.js)
import { useEffect, useRef } from 'react'
import { useApp } from '../store.js'
import { STORES, STORE_BY_ID, TYPE_LABEL } from '../data/stores.js'
import { NODES, START_NODE, findPath } from '../data/map.js'
import { C } from './colors.js'
import { buildWorld, T, GW, GH, X, Y, POSTCARD_AT, CONTENT } from './world.js'
import { loadShopIcons } from './shopIcons.js'
import { SNOW, VIEW } from './design.js'

// 움직임 줄이기 설정이면 내리는 눈 끔
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const WALK = 8 // 칸/초
const LEAD = 0.16 // 아바타를 화면 가운데보다 조금 아래에 → 코스가 이어지는 북쪽(위)이 더 보이게

export default function PixelMap({ onReady }) {
  const ref = useRef()
  const bubble = useRef()
  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    let alive = true, raf = 0, world = null
    let dpr = 1, base = 3, zoom = 0
    const scale = () => Math.max(1, Math.min(14, base + zoom))

    const resize = () => {
      const r = cv.parentElement.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 3)
      cv.width = Math.round(r.width * dpr)
      cv.height = Math.round(r.height * dpr)
      base = Math.max(2, Math.round(cv.width / (T * VIEW.tiles))) // 기본 배율 (정수 — 도트가 번지지 않게)
    }
    resize()
    window.addEventListener('resize', resize)

    // ── 상태 ──
    const [nx, nz] = NODES[useApp.getState().avatarNode] || NODES[START_NODE]
    const av = { x: X(nx), y: Y(nz), dir: 'down', walk: null, waveUntil: 0 }
    const cam = { x: av.x, y: av.y - 20, follow: true }
    const hops = {}
    const sparkles = {}
    const flakes = Array.from({ length: REDUCED ? 0 : SNOW.flakes }, () => ({ x: Math.random(), y: Math.random(), v: (0.03 + Math.random() * 0.05) * SNOW.flakeSpeed, s: Math.random() < 0.2 ? 2 : 1, ph: Math.random() * 6 }))

    const startWalk = (id) => {
      const from = useApp.getState().avatarNode
      const pts = findPath(from, 'f_' + id).map(([x, z]) => [X(x), Y(z)])
      pts[0] = [av.x, av.y]
      let len = 0
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
      av.walk = { pts, seg: 0, d: 0, id, speed: Math.max(WALK * T, len / 7) }
      cam.follow = true
    }
    const teleport = ({ storeId }) => {
      const s = storeId ? STORE_BY_ID[storeId] : null
      const [x, z] = s ? s.front : NODES[START_NODE]
      av.walk = null
      av.x = X(x); av.y = Y(z)
      av.dir = s ? 'up' : 'down'
      cam.follow = true
      if (s) setTimeout(() => (hops[s.id] = performance.now()), 450)
    }
    const unsub = useApp.subscribe((st, prev) => {
      if (st.walkTarget && st.walkTarget !== prev.walkTarget) startWalk(st.walkTarget)
      if (st.teleport && st.teleport !== prev.teleport) teleport(st.teleport)
      if (st.postcard && st.postcard !== prev.postcard) sparkles[st.postcard.storeId] = performance.now()
    })

    // ── 입력: 탭 / 끌기 / 두 손가락 · 휠 확대 ──
    const pts = new Map()
    let drag = null, pinch = null
    const toWorld = (ex, ey) => {
      const r = cv.getBoundingClientRect()
      const s = scale()
      return [cam.x + ((ex - r.left) * dpr - cv.width / 2) / s, cam.y + ((ey - r.top) * dpr - cv.height / 2) / s]
    }
    const onDown = (e) => {
      cv.setPointerCapture?.(e.pointerId)
      pts.set(e.pointerId, [e.clientX, e.clientY])
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, moved: false }
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) }
        drag = null
      }
    }
    const onMove = (e) => {
      if (!pts.has(e.pointerId)) return
      const prev = pts.get(e.pointerId)
      pts.set(e.pointerId, [e.clientX, e.clientY])
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()]
        const d = Math.hypot(a[0] - b[0], a[1] - b[1])
        if (d / pinch.d > 1.3) { zoom++; pinch.d = d }
        else if (d / pinch.d < 0.77) { zoom--; pinch.d = d }
        zoom = Math.max(2 - base, Math.min(4, zoom))
        return
      }
      if (!drag) return
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 8) drag.moved = true
      if (drag.moved && useApp.getState().phase === 'map') {
        const s = scale()
        cam.x -= ((e.clientX - prev[0]) * dpr) / s
        cam.y -= ((e.clientY - prev[1]) * dpr) / s
        cam.follow = false
      }
    }
    const onUp = (e) => {
      pts.delete(e.pointerId)
      if (pts.size < 2) pinch = null
      if (drag && !drag.moved && pts.size === 0) tap(...toWorld(e.clientX, e.clientY))
      if (pts.size === 0) drag = null
    }
    const onWheel = (e) => {
      e.preventDefault()
      zoom = Math.max(2 - base, Math.min(4, zoom + (e.deltaY < 0 ? 1 : -1)))
    }
    cv.addEventListener('pointerdown', onDown)
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerup', onUp)
    cv.addEventListener('pointercancel', onUp)
    cv.addEventListener('wheel', onWheel, { passive: false })

    const tap = (wx, wy) => {
      if (!world) return
      const st = useApp.getState()
      if (st.phase !== 'map' || st.walkTarget || st.activeStore || st.journal || st.paperMap) return
      let hit = null
      for (const o of world.buildings) {
        const x0 = o.x - o.spr.ax, y0 = o.y - o.spr.ay
        if (wx >= x0 && wx < x0 + o.spr.w && wy >= y0 - 6 && wy < o.y + 10 && (!hit || o.y > hit.y)) hit = o
      }
      if (!hit) return
      hops[hit.store.id] = performance.now()
      setTimeout(() => st.tapStore(hit.store.id), 200) // 통 튀는 0.2초 후 출발
    }

    // ── 그리기 ──
    let last = performance.now()
    const frame = (now) => {
      if (!alive) return
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!world) return
      const s = scale()

      // 걷기
      const w = av.walk
      let moving = false
      if (w) {
        let move = w.speed * dt
        while (move > 0 && w.seg < w.pts.length - 1) {
          const A = w.pts[w.seg], B = w.pts[w.seg + 1]
          const len = Math.hypot(B[0] - A[0], B[1] - A[1])
          const rem = len - w.d
          if (move < rem) { w.d += move; move = 0 } else { move -= rem; w.seg++; w.d = 0 }
        }
        if (w.seg >= w.pts.length - 1) {
          const E = w.pts[w.pts.length - 1]
          av.x = E[0]; av.y = E[1]; av.dir = 'up'; av.walk = null
          setTimeout(() => useApp.getState().arrived(w.id), 260)
        } else {
          const A = w.pts[w.seg], B = w.pts[w.seg + 1]
          const len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1
          const dx = (B[0] - A[0]) / len, dy = (B[1] - A[1]) / len
          av.x = A[0] + dx * w.d; av.y = A[1] + dy * w.d
          av.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
          moving = true
        }
      }

      // 카메라
      const vw = cv.width / s, vh = cv.height / s
      if (cam.follow) {
        const k = 1 - Math.exp(-dt * 5)
        cam.x += (av.x - cam.x) * k
        cam.y += (av.y - Math.round(vh * LEAD) - cam.y) * k
      }
      // 길·가게가 있는 범위 밖으로는 멀리 못 가게 (빈 숲으로 길을 잃지 않게)
      const bw = CONTENT.x1 - CONTENT.x0, bh = CONTENT.y1 - CONTENT.y0
      cam.x = vw >= bw ? (CONTENT.x0 + CONTENT.x1) / 2 : Math.max(CONTENT.x0 + vw / 2, Math.min(CONTENT.x1 - vw / 2, cam.x))
      cam.y = vh >= bh ? (CONTENT.y0 + CONTENT.y1) / 2 : Math.max(CONTENT.y0 + vh / 2, Math.min(CONTENT.y1 - vh / 2, cam.y))
      const ox = Math.round(cam.x - vw / 2), oy = Math.round(cam.y - vh / 2)

      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = C.snow
      ctx.fillRect(0, 0, cv.width, cv.height)
      // 바닥 (보이는 부분만)
      const sx = Math.max(0, ox), sy = Math.max(0, oy)
      const sw = Math.min(GW, Math.ceil(ox + vw) + 1) - sx, sh = Math.min(GH, Math.ceil(oy + vh) + 1) - sy
      if (sw > 0 && sh > 0) ctx.drawImage(world.ground, sx, sy, sw, sh, (sx - ox) * s, (sy - oy) * s, sw * s, sh * s)

      // 물체 + 아바타 (y 순서)
      const t = now / 1000
      const avFrame = moving ? [1, 0, 2, 0][Math.floor(t * 8) % 4] : now < av.waveUntil ? (Math.floor(t * 3) % 2 ? 3 : 0) : 0
      const avSpr = world.avatar[av.dir][avFrame]
      const ax = Math.round(av.x), ay = Math.round(av.y)
      const stamps = useApp.getState().stamps
      let drewAv = false
      const drawSpr = (spr, x, y, lift = 0) => {
        const dx = (x - spr.ax - ox) * s, dy = (y - spr.ay - oy - lift) * s
        if (dx > cv.width || dy > cv.height || dx + spr.w * s < 0 || dy + spr.h * s < 0) return
        if (spr.mips) {
          // 원본 그대로 쓰는 큰 그림: 화면 크기 이상인 가장 작은 단계를 부드럽게 줄여 그림
          const tw = spr.w * s
          let m = spr.mips[0]
          for (const k of spr.mips) if (k.width >= tw) m = k
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(m, dx, dy, tw, spr.h * s)
          ctx.imageSmoothingEnabled = false
          return
        }
        ctx.drawImage(spr.cv, dx, dy, spr.w * s, spr.h * s)
      }
      const drawAvatar = () => {
        ctx.fillStyle = C.snowDeep
        ctx.globalAlpha = 0.3
        ctx.fillRect((ax - 5 - ox) * s, (ay - 1 - oy) * s, 11 * s, 2 * s)
        ctx.fillRect((ax - 4 - ox) * s, (ay - 2 - oy) * s, 9 * s, 1 * s)
        ctx.globalAlpha = 1
        drawSpr(avSpr, ax, ay, moving && avFrame ? 1 : 0)
        drewAv = true
      }
      const showDetail = zoom >= VIEW.detailFrom // 축소하면 작은 장식은 숨기고 가게 중심으로
      for (const o of world.objs) {
        if (o.y < oy - 8 || o.y - o.spr.h > oy + vh + 8 || o.x + o.spr.w < ox || o.x - o.spr.w > ox + vw) continue
        if (o.detail && !showDetail) continue
        if (!drewAv && o.y > ay) drawAvatar()
        let lift = 0
        // 토끼: 가끔 한 번 깡충 (움직임 줄이기 설정이면 가만히)
        if (o.kind === 'bunny' && !REDUCED) { const ph = (t + o.hop) % 7; if (ph < 0.3) lift = Math.round(Math.sin((ph / 0.3) * Math.PI) * 3) }
        if (o.kind === 'shop') {
          const h = hops[o.store.id]
          if (h && now - h < 220) lift = Math.round(Math.sin(((now - h) / 220) * Math.PI) * 4)
        }
        drawSpr(o.spr, o.x, o.y, lift)
        if (o.kind === 'shop' && stamps[o.store.id]) {
          const [px, py] = o.postcard || POSTCARD_AT[o.store.model] || POSTCARD_AT.default
          drawSpr(world.postcards[o.store.id], o.x + px, o.y + py, lift)
          const sp = sparkles[o.store.id]
          if (sp && now - sp < 1600) {
            ctx.fillStyle = C.glowLight
            for (let k = 0; k < 6; k++) {
              const a = k * 1.05 + (now - sp) / 300
              const r = 8 + ((now - sp) / 1600) * 10
              const qx = Math.round(o.x + px + Math.cos(a) * r), qy = Math.round(o.y + py - 6 + Math.sin(a) * r)
              ctx.fillRect((qx - ox) * s, (qy - oy) * s, s, s)
              if (k % 2 === 0) ctx.fillRect((qx - ox - 1) * s, (qy - oy) * s, 3 * s, s), ctx.fillRect((qx - ox) * s, (qy - oy - 1) * s, s, 3 * s)
            }
          }
        }
      }
      if (!drewAv) drawAvatar()

      // 가게 말풍선: 누른 가게(걸어가는 중) 위에 이름·종류·도장 여부
      const bt = useApp.getState().walkTarget
      const bel = bubble.current
      if (bel) {
        const o = bt && world.buildings.find((b) => b.store.id === bt)
        if (o) {
          if (bel.dataset.id !== bt) {
            const st = o.store
            bel.dataset.id = bt
            bel.querySelector('b').textContent = st.name
            bel.querySelector('i').textContent = st.category || TYPE_LABEL[st.type]
            const done = !!stamps[bt]
            const em = bel.querySelector('em')
            em.textContent = done ? '도장 완료' : '도장 전'
            em.className = done ? 'done' : ''
          }
          const bx = ((o.x - ox) * s) / dpr, by = ((o.y - o.spr.ay - oy) * s) / dpr
          bel.style.transform = `translate(${Math.round(bx)}px, ${Math.round(by - 6)}px) translate(-50%, -100%)`
          bel.hidden = false
        } else if (!bel.hidden) { bel.hidden = true; bel.dataset.id = '' }
      }

      // 내리는 눈 (화면 기준, 한 도트 크기)
      ctx.fillStyle = C.snowHi
      for (const f of flakes) {
        f.y += f.v * dt
        f.x += Math.sin(t * 0.8 + f.ph) * 0.004 * dt * 10
        if (f.y > 1) { f.y -= 1; f.x = Math.random() }
        const qx = Math.round((f.x * cv.width) / s) * s, qy = Math.round((f.y * cv.height) / s) * s
        ctx.globalAlpha = 0.75
        ctx.fillRect(qx, qy, f.s * s, f.s * s)
      }
      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)

    // 월드 만들기 (무거워서 로딩 화면이 먼저 그려지게 한 박자 뒤에)
    const tm = setTimeout(async () => {
      await loadShopIcons() // 가게 아이콘 그림을 먼저 불러옴
      if (!alive) return
      world = buildWorld()
      // 첫 화면: 출발점 + 가까운 가게 몇 곳(VIEW.firstShops)이 함께 보이도록 배율·위치를 맞춤 (안 되면 개수를 줄임)
      if (useApp.getState().avatarNode === START_NODE) {
        const S0 = NODES[START_NODE]
        const topUI = 70 * dpr, botUI = 70 * dpr // 머리말·안내 쪽지 자리
        for (let n = VIEW.firstShops; n >= 1; n--) {
          const pts = [[X(S0[0]), Y(S0[1])], ...STORES.slice(0, n).flatMap((st) => { const o = world.buildings.find((b) => b.store === st); return [[o.x - o.spr.w / 2, o.y - o.spr.ay], [o.x + o.spr.w / 2, o.y]] })]
          const x0 = Math.min(...pts.map((p) => p[0])) - T, x1 = Math.max(...pts.map((p) => p[0])) + T
          const y0 = Math.min(...pts.map((p) => p[1])) - T, y1 = Math.max(...pts.map((p) => p[1])) + T
          let fit = 0
          for (let sc = Math.min(14, base + 1); sc >= 2; sc--) if ((x1 - x0) * sc <= cv.width && (y1 - y0) * sc <= cv.height - topUI - botUI) { fit = sc; break }
          if (fit) {
            zoom = Math.min(0, fit - base)
            cam.follow = false
            cam.x = (x0 + x1) / 2
            cam.y = (y0 + y1) / 2 - (topUI - botUI) / 2 / scale()
            break
          }
        }
      }
      onReady?.()
      // 첫 진입: 손 흔들기 → 지도
      av.waveUntil = performance.now() + 1500
      setTimeout(() => alive && useApp.getState().setPhase('map'), 1700)
      if (location.search.includes('debug'))
        window.__pixel = { cam, av, world, useApp, setZoom: (z) => (zoom = z), get scale() { return scale() } }
    }, 60)

    return () => {
      alive = false
      clearTimeout(tm)
      cancelAnimationFrame(raf)
      unsub()
      window.removeEventListener('resize', resize)
      cv.removeEventListener('pointerdown', onDown)
      cv.removeEventListener('pointermove', onMove)
      cv.removeEventListener('pointerup', onUp)
      cv.removeEventListener('pointercancel', onUp)
      cv.removeEventListener('wheel', onWheel)
    }
  }, [])
  return (
    <>
      <canvas ref={ref} className="pixel-canvas" aria-label="서촌 픽셀 지도" />
      <div ref={bubble} className="shop-bubble" hidden aria-live="polite">
        <b /> <i /> <em />
      </div>
    </>
  )
}
