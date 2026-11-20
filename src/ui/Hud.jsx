import { useApp } from '../store.js'
import { STORES, STORE_BY_ID } from '../data/stores.js'
import { diaryDate } from '../lib/photo.js'

// 날씨 아이콘: 16x15 도트 눈송이 (칸 하나 = 1px, 굵은 가지 6갈래)
const SNOW = [
  '.......XX.......',
  '......XXXX......',
  '..X.X..XX..X.X..',
  '...XX..XX..XX...',
  '..XXXX.XX.XXXX..',
  '.....XXXXXX.....',
  '.X....XXXX....X.',
  'XXXXXXXXXXXXXXXX',
  '.X....XXXX....X.',
  '.....XXXXXX.....',
  '..XXXX.XX.XXXX..',
  '...XX..XX..XX...',
  '..X.X..XX..X.X..',
  '......XXXX......',
  '.......XX.......',
]
function SnowIcon() {
  return (
    <svg className="weather" viewBox="0 0 16 15" width="16" height="15" shapeRendering="crispEdges" role="img" aria-label="눈">
      {SNOW.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? <rect key={x + '-' + y} x={x} y={y} width="1" height="1" /> : null)))}
    </svg>
  )
}

// 지도 위 일기장 머리말: 왼쪽 = 오늘 날짜를 적은 라벨, 오른쪽 = 도장 카드(진행도) + 저널
export default function Hud() {
  const phase = useApp((s) => s.phase)
  const stamps = useApp((s) => s.stamps)
  const walkTarget = useApp((s) => s.walkTarget)
  const activeStore = useApp((s) => s.activeStore)
  const openJournal = useApp((s) => s.openJournal)
  const openPaperMap = useApp((s) => s.openPaperMap)
  const count = Object.keys(stamps).length
  const show = phase === 'map'

  return (
    <>
      <header className={'hud' + (show ? ' on' : '')}>
        <div className="brand">
          <span className="tape tape-red brand-tape" />
          <span className="brand-en">SEOCHON WINTER JOURNAL</span>
          <b className="hand">{diaryDate()} <SnowIcon /></b>
        </div>
        <button className="progress" onClick={openJournal} aria-label={`도장 ${count}개 / ${STORES.length}개`}>
          <span className="progress-n"><b>{String(count).padStart(2, '0')}</b>/{STORES.length}</span>
          <span className="dots">
            {STORES.map((s) => (
              <i key={s.id} className={stamps[s.id] ? 'on' : ''} style={stamps[s.id] ? { background: s.color } : undefined} />
            ))}
          </span>
        </button>
        <button className="journal-btn" onClick={openJournal} aria-label="윈터 저널 열기">
          <svg viewBox="0 0 16 16" width="32" height="32" shapeRendering="crispEdges" aria-hidden="true">
            <path d="M3 1h10v14H3z" fill="#272A40" />
            <path d="M4 2h8v12H4z" fill="#43507A" />
            <path d="M3 1h1v14H3z" fill="#14162A" />
            <path d="M6 5h5v3H6z" fill="#F7F2E8" />
            <path d="M7 6h3v1H7z" fill="#B7AE9F" />
            <path d="M10 0h2v5l-1-1-1 1z" fill="#D14B35" />
            <path d="M13 3h1v2h-1zM13 9h1v2h-1z" fill="#F4B860" />
          </svg>
          {count > 0 && <em>{count}</em>}
        </button>
      </header>
      {/* 종이 지도 버튼 (걷는 중엔 숨김) */}
      {show && !activeStore && !walkTarget && (
        <button className="map-fab" onClick={openPaperMap} aria-label="종이 지도 열기">
          <svg viewBox="0 0 16 16" width="32" height="32" shapeRendering="crispEdges" aria-hidden="true">
            <path d="M1 3h4v11H1zM6 2h4v11H6zM11 3h4v11h-4z" fill="#F7F2E8" />
            <path d="M5 3h1v11H5zM10 2h1v11h-1z" fill="#CDC3B3" />
            <path d="M2 6h2v1H2zM3 9h2v1H3zM7 5h1v3H7zM8 7h2v1H8zM12 6h2v1h-2zM12 10h1v1h-1z" fill="#3B6655" />
            <path d="M8 9h2v2H8z" fill="#D14B35" />
            <path d="M0 3h1v11H0zM15 3h1v11h-1zM1 14h4v1H1zM6 13h4v1H6zM11 14h4v1h-4zM1 2h4v1H1zM6 1h4v1H6zM11 2h4v1h-4z" fill="#272A40" />
          </svg>
          <span>지도</span>
        </button>
      )}
      {show && !activeStore && (
        <div className="hint">
          <span className="tape tape-blue" />
          <span className="hand">
            {walkTarget
              ? `${STORE_BY_ID[walkTarget].name}(으)로 걸어가는 중…`
              : count === 0
                ? '눈 쌓인 가게를 톡! 눌러보세요'
                : count === STORES.length
                  ? '도장 다 모았다! 저널을 펼쳐보자'
                  : `도장 ${STORES.length - count}개 남았다! 가게를 톡`}
          </span>
        </div>
      )}
    </>
  )
}
