import { useEffect, useState } from 'react'
import MapScene from './three/MapScene.jsx'
import Hud from './ui/Hud.jsx'
import StoreSheet from './ui/StoreSheet.jsx'
import StampScreen from './ui/StampScreen.jsx'
import Journal from './ui/Journal.jsx'
import { useApp } from './store.js'
import { STORES } from './data/stores.js'
import { placeholderPhoto } from './lib/photo.js'

const DEMO_NOTES = ['손 시린 날엔 역시 라떼', '엽서 세 장 득템!', '국물이 진짜 따뜻했다', '창밖 인왕산이 하얘', '필름 한 롤 맡기고 옴', '유자차 김이 모락모락', '슈크림 붕어빵 최고']

export default function App() {
  const [ready, setReady] = useState(false)
  const phase = useApp((s) => s.phase)
  const activeStore = useApp((s) => s.activeStore)
  const stampOpen = useApp((s) => s.stampOpen)
  const journal = useApp((s) => s.journal)
  const toast = useApp((s) => s.toast)

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
    <div className="app">
      <div className="scene">
        <MapScene onReady={() => setReady(true)} />
        <div className="haze" />
      </div>
      <Hud />
      {phase === 'intro' && ready && (
        <div className="intro-title">
          <p className="hand small">SEOCHON WINTER JOURNAL</p>
          <h1 className="hand">겨울의 서촌을 기록해요</h1>
        </div>
      )}
      {activeStore && <StoreSheet key={activeStore} />}
      {stampOpen && <StampScreen />}
      {journal && <Journal />}
      {toast && <div className="toast" key={toast.t}>{toast.msg}</div>}
      <div className={'loading' + (ready ? ' gone' : '')}>
        <div className="flake">❄</div>
        <p className="hand">서촌에 눈이 내리는 중…</p>
      </div>
    </div>
  )
}
