import { useEffect, useState } from 'react'
import { useApp } from '../store.js'
import { STORES, STORE_BY_ID } from '../data/stores.js'
import { stampUrl, SILHOUETTE } from '../lib/stampSvg.js'
import { fmtDate, fileToDataUrl } from '../lib/photo.js'
import { renderJournalImage } from '../lib/shareImage.js'

const TILT = [-5, 4, -2, 6, 3, -6, 5, -3]
// 미리보기(샌드박스 iframe)에서는 다운로드·공유가 막혀 있음
const IN_FRAME = (() => {
  try {
    return window.self !== window.top
  } catch {
    return true
  }
})()
const TAPES = ['t1', 't2', 't3']

export default function Journal() {
  const stamps = useApp((s) => s.stamps)
  const page = useApp((s) => s.journalPage)
  const complete = useApp((s) => s.complete)
  const fresh = useApp((s) => s.freshStamp)
  const { closeJournal, setJournalPage, setComplete, goToStore } = useApp.getState()
  const [opened, setOpened] = useState(!!page)
  const count = Object.keys(stamps).length
  const allDone = count === STORES.length

  useEffect(() => {
    if (opened) return
    const t = setTimeout(() => setOpened(true), 550)
    return () => clearTimeout(t)
  }, [])
  // 방금 마지막 도장을 찍었다면 완성 페이지로
  useEffect(() => {
    if (opened && allDone && fresh && !page) {
      const t = setTimeout(() => setComplete(true), 1100)
      return () => clearTimeout(t)
    }
  }, [opened])

  return (
    <div className="journal">
      <button className="x jx" onClick={closeJournal} aria-label="저널 닫기">✕</button>
      <div className="book">
        <div className="pages paper">
          <div className="page-head">
            <p className="hand sub">나의 겨울 서촌 일기</p>
            <h2 className="hand">Winter Journal</h2>
            <p className="hand count">{count} / {STORES.length} 칸</p>
          </div>
          <div className="grid">
            {STORES.map((s, i) => {
              const rec = stamps[s.id]
              return (
                <button
                  key={s.id}
                  className={'cell' + (rec ? ' on' : '') + (opened && fresh === s.id ? ' fresh' : '')}
                  onClick={() => (rec ? setJournalPage(s.id) : goToStore(s.id))}
                >
                  <span className={'tape ' + TAPES[i % 3]} />
                  {rec ? (
                    <>
                      <img src={stampUrl(s)} alt={s.name} style={{ transform: `rotate(${TILT[i]}deg)` }} />
                      <span className="hand date">{fmtDate(rec.date)}</span>
                    </>
                  ) : (
                    <>
                      <span className="sil" dangerouslySetInnerHTML={{ __html: SILHOUETTE[s.type] }} />
                      <span className="hand date dim-t">아직 비어 있어요</span>
                    </>
                  )}
                  <span className="cell-name">{s.name}</span>
                </button>
              )
            })}
          </div>
          <div className="journal-foot">
            {allDone ? (
              <button className="primary xmas" onClick={() => setComplete(true)}>🎄 완성 페이지 보기</button>
            ) : (
              <p className="hand muted">빈 칸을 누르면 그 가게 앞으로 데려다줄게요</p>
            )}
            <ResetButton />
          </div>
        </div>
        <div className={'cover' + (opened ? ' open' : '')} onClick={() => setOpened(true)}>
          <div className="cover-in">
            <span className="cover-label hand">2026 WINTER</span>
            <h1 className="hand">SEOCHON<br />WINTER<br />JOURNAL</h1>
            <p className="hand">겨울의 서촌을 기록</p>
            <div className="cover-flakes">❄ ✦ ❄</div>
            <span className="cover-count hand">{count} / {STORES.length}</span>
          </div>
        </div>
      </div>
      {page && <DiaryPage id={page} onBack={() => setJournalPage(null)} />}
      {complete && <CompletePage onBack={() => setComplete(false)} />}
    </div>
  )
}

function ResetButton() {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button className="reset" onClick={() => (armed ? useApp.getState().reset() : setArmed(true))}>
      {armed ? '한 번 더 누르면 모든 기록이 지워져요' : '기록 초기화 (베타 테스트용)'}
    </button>
  )
}

function DiaryPage({ id, onBack }) {
  const store = STORE_BY_ID[id]
  const rec = useApp((s) => s.stamps[id])
  const updateStamp = useApp((s) => s.updateStamp)
  const [edit, setEdit] = useState(false)
  const [note, setNote] = useState(rec?.note || '')
  const [photo, setPhoto] = useState(rec?.photo)
  if (!rec) return null

  const save = async () => {
    await updateStamp(id, { note: note.trim(), photo })
    setEdit(false)
    useApp.getState().showToast('기록을 고쳤어요')
  }
  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) setPhoto(await fileToDataUrl(f))
  }

  return (
    <div className="diary paper lined">
      <header className="ss-head">
        <button className="back" onClick={onBack} aria-label="저널로">←</button>
        <div>
          <p className="hand sub">{fmtDate(rec.date)} · 맑음, 눈</p>
          <h3 className="hand" style={{ color: store.color }}>{store.name}</h3>
        </div>
      </header>
      <div className="diary-body">
        <div className="photo-wrap">
          <div className="polaroid big tilt-r">
            <span className="tape t1" />
            <img src={edit ? photo : rec.photo} alt="그날의 사진" />
            <span className="hand cap">{store.name} 앞에서</span>
          </div>
          <img className="diary-stamp" src={stampUrl(store)} alt="" />
        </div>
        {edit ? (
          <div className="edit">
            <label className="note">
              <span className="hand">한 줄 기록</span>
              <input className="hand" maxLength={40} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
              <em>{note.length}/40</em>
            </label>
            <div className="row">
              <label className="btn ghost-btn">🖼 사진 바꾸기<input type="file" accept="image/*" hidden onChange={onFile} /></label>
              <button className="btn ghost-btn" onClick={() => { setEdit(false); setNote(rec.note || ''); setPhoto(rec.photo) }}>취소</button>
              <button className="btn" onClick={save}>저장</button>
            </div>
          </div>
        ) : (
          <>
            <p className="hand diary-note">{rec.note ? rec.note : '한 줄 기록이 비어 있어요'}</p>
            <button className="btn ghost-btn edit-btn" onClick={() => setEdit(true)}>✎ 기록 고치기</button>
          </>
        )}
      </div>
    </div>
  )
}

function CompletePage({ onBack }) {
  const stamps = useApp((s) => s.stamps)
  const [img, setImg] = useState(null) // { url, blob }
  const [busy, setBusy] = useState(false)

  const make = async () => {
    setBusy(true)
    const blob = await renderJournalImage(stamps)
    setImg({ blob, url: URL.createObjectURL(blob) })
    setBusy(false)
  }
  const file = img && new File([img.blob], 'seochon-winter-journal.png', { type: 'image/png' })
  const canShare = file && navigator.canShare?.({ files: [file] })

  return (
    <div className="complete paper">
      <div className="lights">
        {Array.from({ length: 11 }).map((_, i) => <i key={i} style={{ animationDelay: `${(i % 4) * 0.25}s` }} />)}
      </div>
      <button className="back cb" onClick={onBack} aria-label="저널로">←</button>
      <p className="hand sub">SEOCHON WINTER JOURNAL</p>
      <h2 className="hand">겨울 서촌 완주!</h2>
      <p className="hand muted">{STORES.length}개의 도장을 모두 모았어요</p>
      <div className="mini-grid">
        {STORES.map((s, i) => (
          <img key={s.id} src={stampUrl(s)} alt={s.name} style={{ transform: `rotate(${TILT[i]}deg)`, animationDelay: `${0.1 + i * 0.07}s` }} />
        ))}
      </div>
      <button className="primary xmas" onClick={make} disabled={busy}>{busy ? '저널을 엮는 중…' : '저널을 이미지 한 장으로 저장'}</button>
      <p className="small-muted">#서촌겨울스탬프투어 로 공유해주세요</p>

      {img && (
        <div className="share-modal" onClick={() => setImg(null)}>
          <div className="share-box" onClick={(e) => e.stopPropagation()}>
            <img src={img.url} alt="윈터 저널 공유 이미지" />
            <p className="small-muted">
              {IN_FRAME ? '미리보기 화면에서는 다운로드가 막혀 있어요. 이미지를 길게 눌러 저장해 주세요.' : '이미지를 길게 눌러 사진첩에 저장할 수도 있어요'}
            </p>
            <div className="row">
              {!IN_FRAME && <a className="btn" href={img.url} download="seochon-winter-journal.png">저장하기</a>}
              {canShare && !IN_FRAME && (
                <button className="btn" onClick={() => navigator.share({ files: [file], title: 'SEOCHON WINTER JOURNAL', text: '#서촌겨울스탬프투어' }).catch(() => {})}>
                  공유하기
                </button>
              )}
              <button className="btn ghost-btn" onClick={() => setImg(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
