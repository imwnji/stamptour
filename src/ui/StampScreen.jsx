import { useRef, useState } from 'react'
import { useApp } from '../store.js'
import { STORES, STORE_BY_ID } from '../data/stores.js'
import { stampUrl } from '../lib/stampSvg.js'
import { fileToDataUrl, diaryDate } from '../lib/photo.js'

// 방문 인증 = 일기장 새 페이지 (날짜 머리말 → 도장 칸 → 폴라로이드 → 줄 노트)
export default function StampScreen() {
  const id = useApp((s) => s.activeStore)
  const count = useApp((s) => Object.keys(s.stamps).length)
  const closeStamp = useApp((s) => s.closeStamp)
  const addStamp = useApp((s) => s.addStamp)
  const store = STORE_BY_ID[id]
  const [photo, setPhoto] = useState(null)
  const [note, setNote] = useState('')
  const [step, setStep] = useState('form') // form → stamping → done
  const [busy, setBusy] = useState(false)
  const [page] = useState(count + 1)
  const scroller = useRef()

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusy(true)
    try {
      setPhoto(await fileToDataUrl(f))
    } catch {
      useApp.getState().showToast('사진을 불러오지 못했어요')
    }
    setBusy(false)
  }

  const doStamp = async () => {
    if (!photo || step !== 'form') return
    scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setStep('stamping')
    setTimeout(() => navigator.vibrate?.([25, 30, 60]), 230)
    await addStamp(id, photo, note.trim())
    setTimeout(() => setStep('done'), 750)
  }

  return (
    <div className="stamp-screen page-paper" ref={scroller}>
      <header className="ss-head">
        <button className="back" onClick={closeStamp} disabled={step === 'stamping'} aria-label="뒤로">←</button>
        <div>
          <p className="sub">PAGE {String(page).padStart(2, '0')} / {STORES.length} · 방문 기록</p>
          <h3>{store.name}</h3>
          <p className="hand when">{diaryDate()} · 눈</p>
        </div>
      </header>

      <div className={'stamp-pad' + (step === 'stamping' ? ' shake' : '')}>
        <span className="slot-label">STAMP</span>
        <div className="pad-ring" style={{ borderColor: store.color + '66' }} />
        {step === 'form' && <img className="ghost" src={stampUrl(store)} alt="" />}
        {step !== 'form' && (
          <>
            <div className="ink" style={{ background: `radial-gradient(circle, ${store.color}55 0%, ${store.color}00 65%)` }} />
            <img className="mark" src={stampUrl(store)} alt={`${store.name} 도장`} />
          </>
        )}
        {step === 'stamping' && (
          <div className="handle">
            <div className="knob" />
            <div className="neck" />
            <div className="base" style={{ background: store.color }} />
          </div>
        )}
      </div>

      {step === 'done' ? (
        <div className="done-box">
          <p className="hand big">쾅! 오늘의 도장 완료</p>
          <p className="small-muted">윈터 저널 {String(page).padStart(2, '0')}쪽에 기록했어요</p>
          <button className="primary" onClick={closeStamp}>저널에 끼우기</button>
        </div>
      ) : (
        <>
          <div className="photo-row">
            <div className="polaroid tilt-l">
              <span className="tape tape-amber" />
              {photo ? <img src={photo} alt="방문 사진" /> : <div className="ph hand">{busy ? '불러오는 중…' : '오늘의 사진'}</div>}
            </div>
            <div className="photo-btns">
              <label className="btn">
                사진 찍기
                <input type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
              </label>
              <label className="btn ghost-btn">
                앨범에서 고르기
                <input type="file" accept="image/*" onChange={onFile} hidden />
              </label>
              <p className="small-muted">간판, 오늘 산 물건, 따뜻한 한 잔 — 뭐든 좋아요</p>
            </div>
          </div>
          <label className="note">
            <span>한 줄 기록</span>
            <input
              className="hand"
              maxLength={40}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="오늘의 서촌은…"
            />
            <em>{note.length}/40</em>
          </label>
          <button className="primary" disabled={!photo || step !== 'form'} onClick={doStamp}>
            {photo ? '도장 쾅 찍기' : '사진을 먼저 붙여주세요'}
          </button>
        </>
      )}
    </div>
  )
}
