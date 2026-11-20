import { useState } from 'react'
import { useApp } from '../store.js'
import { STORES, STORE_BY_ID, TYPE_LABEL, mapsUrl } from '../data/stores.js'
import { stampUrl, SILHOUETTE } from '../lib/stampSvg.js'
import { fmtDate } from '../lib/photo.js'

// 매장 정보 = 일기장에 끼워 둔 인덱스 카드 (가게 색 마스킹테이프 + 여권식 도장 칸)
export default function StoreSheet() {
  const id = useApp((s) => s.activeStore)
  const rec = useApp((s) => s.stamps[id])
  const fresh = useApp((s) => s.freshStamp === id)
  const closeSheet = useApp((s) => s.closeSheet)
  const openStamp = useApp((s) => s.openStamp)
  const [closing, setClosing] = useState(false)
  const store = STORE_BY_ID[id]
  const no = String(STORES.indexOf(store) + 1).padStart(2, '0')

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
      <div className={'sheet' + (closing ? ' out' : '')} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={store.name}>
        <span className="tape sheet-tape" style={{ '--tape': store.color }} />
        <button className="x" onClick={close} aria-label="닫기">✕</button>
        <div className="sheet-top">
          <span className="no">No.{no}</span>
          <span className="chip" style={{ color: store.color }}>{store.category || TYPE_LABEL[store.type]}</span>
        </div>
        <h2>{store.name}</h2>
        <p className="name-en">{store.nameEn}</p>
        <p className="intro">{store.intro}</p>
        <dl className="meta">
          <div><dt>주소</dt><dd>{store.address}</dd></div>
          <div><dt>운영</dt><dd>{store.hours}</dd></div>
          {store.cid && (
            <div><dt>지도</dt><dd><a href={mapsUrl(store)} target="_blank" rel="noopener noreferrer">구글맵에서 보기 ↗</a></dd></div>
          )}
        </dl>

        <div className="slot-wrap">
          {rec ? (
            <button className={'slot stamped' + (fresh ? ' fresh' : '')} onClick={openPage}>
              <span className="slot-label">VISITED</span>
              <img src={stampUrl(store)} alt={`${store.name} 도장`} />
              <span className="hand date">{fmtDate(rec.date)} 다녀옴</span>
            </button>
          ) : (
            <button className="slot empty" onClick={openStamp}>
              <span className="slot-label">STAMP HERE</span>
              <span className="sil" style={{ color: store.color }} dangerouslySetInnerHTML={{ __html: SILHOUETTE[store.type] }} />
              <span className="cta">눌러서 도장 찍기</span>
            </button>
          )}
        </div>
        <p className="foot hand">
          {rec ? (fresh ? '카드를 닫으면 가게 벽에 엽서가 붙어요' : '도장을 누르면 그날의 기록이 펼쳐져요') : '사진 한 장 + 한 줄 기록 = 오늘의 도장'}
        </p>
      </div>
    </div>
  )
}
