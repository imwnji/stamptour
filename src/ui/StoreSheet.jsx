import { useState } from 'react'
import { useApp } from '../store.js'
import { STORE_BY_ID, TYPE_LABEL, mapsUrl } from '../data/stores.js'
import { stampUrl, SILHOUETTE } from '../lib/stampSvg.js'
import { fmtDate } from '../lib/photo.js'

export default function StoreSheet() {
  const id = useApp((s) => s.activeStore)
  const rec = useApp((s) => s.stamps[id])
  const fresh = useApp((s) => s.freshStamp === id)
  const closeSheet = useApp((s) => s.closeSheet)
  const openStamp = useApp((s) => s.openStamp)
  const [closing, setClosing] = useState(false)
  const store = STORE_BY_ID[id]

  const close = () => {
    setClosing(true)
    setTimeout(closeSheet, 220)
  }
  const openPage = () => {
    const st = useApp.getState()
    st.closeSheet()
    st.openJournal()
    st.setJournalPage(id)
  }

  return (
    <div className={'dim' + (closing ? ' out' : '')} onClick={close}>
      <div className={'sheet paper' + (closing ? ' out' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={store.name}>
        <div className="sheet-band" style={{ background: store.color }}>
          <span className="chip">{store.category || TYPE_LABEL[store.type]}</span>
          <span className="band-en">{store.nameEn}</span>
        </div>
        <button className="x" onClick={close} aria-label="닫기">✕</button>
        <h2 className="hand">{store.name}</h2>
        <p className="intro">{store.intro}</p>
        <dl className="meta">
          <div><dt>주소</dt><dd>{store.address}</dd></div>
          <div><dt>운영</dt><dd>{store.hours}</dd></div>
          {store.cid && (
            <div><dt>지도</dt><dd><a href={mapsUrl(store)} target="_blank" rel="noopener noreferrer">구글맵에서 보기 ↗</a></dd></div>
          )}
        </dl>

        <div className="slot-wrap">
          <span className="tape t1" />
          {rec ? (
            <button className={'slot stamped' + (fresh ? ' fresh' : '')} onClick={openPage}>
              <img src={stampUrl(store)} alt={`${store.name} 도장`} />
              <span className="hand date">{fmtDate(rec.date)} 방문</span>
            </button>
          ) : (
            <button className="slot empty" onClick={openStamp}>
              <span className="sil" style={{ color: store.color }} dangerouslySetInnerHTML={{ __html: SILHOUETTE[store.type] }} />
              <span className="hand cta">여기를 눌러 도장 찍기</span>
            </button>
          )}
        </div>
        <p className="foot hand">
          {rec ? (fresh ? '시트를 닫으면 가게 벽에 엽서가 붙어요 ✦' : '도장을 누르면 그날의 기록을 볼 수 있어요') : '사진 한 장 + 한 줄 기록으로 방문 인증해요'}
        </p>
      </div>
    </div>
  )
}
