import { useApp } from '../store.js'
import { STORES, STORE_BY_ID } from '../data/stores.js'

export default function Hud() {
  const phase = useApp((s) => s.phase)
  const stamps = useApp((s) => s.stamps)
  const walkTarget = useApp((s) => s.walkTarget)
  const activeStore = useApp((s) => s.activeStore)
  const openJournal = useApp((s) => s.openJournal)
  const count = Object.keys(stamps).length
  const show = phase === 'map'

  return (
    <>
      <header className={'hud' + (show ? ' on' : '')}>
        <div className="brand hand">
          <span>Seochon</span>
          <b>Winter Journal</b>
        </div>
        <button className="progress" onClick={openJournal} aria-label="스탬프 진행도">
          <span className="hand">❄ {count} / {STORES.length}</span>
          <span className="dots">
            {STORES.map((s) => (
              <i key={s.id} style={stamps[s.id] ? { background: s.color } : undefined} />
            ))}
          </span>
        </button>
        <button className="journal-btn" onClick={openJournal} aria-label="윈터 저널 열기">
          <svg viewBox="0 0 32 32" width="26" height="26">
            <rect x="6" y="4" width="20" height="24" rx="3" fill="#34405e" />
            <rect x="9" y="4" width="2.4" height="24" fill="#c25b56" />
            <path d="M15 12 l2 -3 l2 3 l3 -1 l-1 3 l2 2 l-3 1 l-1 3 l-2 -2 l-2 2 l-1 -3 l-3 -1 l2 -2 l-1 -3 z" fill="#fff" transform="translate(1 0) scale(.95)" />
          </svg>
          {count > 0 && <em>{count}</em>}
        </button>
      </header>
      {show && !activeStore && (
        <div className="hint hand">
          {walkTarget
            ? `${STORE_BY_ID[walkTarget].name}(으)로 걸어가는 중…`
            : count === 0
              ? '눈 쌓인 가게를 톡! 눌러보세요'
              : count === STORES.length
                ? '모든 도장을 모았어요! 저널을 열어보세요 🎄'
                : `도장 ${STORES.length - count}개 남았어요 · 가게를 눌러 이동`}
        </div>
      )}
    </>
  )
}
