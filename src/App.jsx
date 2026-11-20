import { useEffect, useState } from 'react'
import Hud from './ui/Hud.jsx'
import StoreSheet from './ui/StoreSheet.jsx'
import StampScreen from './ui/StampScreen.jsx'
import Journal from './ui/Journal.jsx'
import { useApp } from './store.js'
import { STORES } from './data/stores.js'
import { placeholderPhoto } from './lib/photo.js'
import PixelMap from './pixel/PixelMap.jsx'
import PaperMap from './ui/PaperMap.jsx'

const DEMO_NOTES = ['손 시린 날엔 역시 라떼', '엽서 세 장 득템!', '국물이 진짜 따뜻했다', '창밖 인왕산이 하얘', '필름 한 롤 맡기고 옴', '유자차 김이 모락모락', '슈크림 붕어빵 최고']

export default function App() {
  const [ready, setReady] = useState(false)
  const phase = useApp((s) => s.phase)
  const activeStore = useApp((s) => s.activeStore)
  const stampOpen = useApp((s) => s.stampOpen)
  const journal = useApp((s) => s.journal)
  const toast = useApp((s) => s.toast)
  const paperMap = useApp((s) => s.paperMap)

  useEffect(() => {
    ;(async () => {
      await useApp.getState().init()
      // 데모: ?demo=7 → 7칸을 미리 채움 (발표·테스트용)
      const n = parseInt(new URLSearchParams(location.search).get('demo') || '0', 10)
      if (n > 0 && Object.keys(useApp.getState().stamps).length === 0) {
        for (const [i, s] of STORES.slice(0, Math.min(n, STORES.length)).entries()) {
          const photo = await placeholderPhoto(s)
          await useApp.getState().addStamp(s.id, photo, DEMO_NOTES[i] || '')
        }
        useApp.setState({ freshStamp: null })
      }
    })()
  }, [])

  return (
    <div className="app pixel">
      <div className="scene">
        <PixelMap onReady={() => setReady(true)} />
      </div>
      <Hud />
      <div className="osm-credit">지도 데이터 © OpenStreetMap contributors</div>
      {phase === 'intro' && ready && (
        <div className="intro-title">
          <span className="tape tape-red" />
          <p className="small">SEOCHON WINTER JOURNAL</p>
          <h1 className="hand">겨울의 서촌을 기록해요</h1>
        </div>
      )}
      {paperMap && <PaperMap />}
      {activeStore && <StoreSheet key={activeStore} />}
      {stampOpen && <StampScreen />}
      {journal && <Journal />}
      {toast && <div className="toast" key={toast.t}>{toast.msg}</div>}
      <div className={'loading' + (ready ? ' gone' : '')}>
        <div className="loading-book">
          <span className="cover-band" />
          <div className="cover-label">
            <small>2026 — 2027 WINTER</small>
            <h1>SEOCHON<br />WINTER<br />JOURNAL</h1>
          </div>
        </div>
        <p className="hand">서촌에 눈이 내리는 중<span className="flake">❄</span></p>
      </div>
    </div>
  )
}
