import { create } from 'zustand'
import { STORES, STORE_BY_ID } from './data/stores.js'
import { START_NODE } from './data/map.js'
import * as db from './lib/db.js'

export const useApp = create((set, get) => ({
  phase: 'intro', // intro → map
  stamps: {}, // { [storeId]: { storeId, date, photo, note } }
  loaded: false,

  // 아바타
  avatarNode: START_NODE,
  walkTarget: null, // storeId (걷는 중)
  teleport: null, // { storeId, t }  저널 빈 칸 → 지도 이동

  // UI
  activeStore: null, // 정보 시트가 열린 매장
  peek: false, // 꾹 눌러서 멀리서 본 정보 카드 (도착 전이라 도장은 못 찍음)
  stampOpen: false, // 스탬프 인증 화면
  journal: null, // null | 'open'
  journalPage: null, // storeId (기록 보기)
  complete: false, // 완성 페이지
  paperMap: false, // 종이 지도 (매장 한눈에 보고 바로 이동)
  freshStamp: null, // 방금 찍힌 매장 (저널 반짝임)
  seenStamps: [], // 저널에서 확인한 도장 (저널 버튼 배지 = 아직 안 본 새 도장 수)
  postcard: null, // { storeId, t } 건물 엽서 부착 연출
  toast: null,
  // 첫 안내 쪽지를 봤는지 (가게를 한 번 누르면 true, 이번 접속(탭) 동안 유지)
  hintSeen: (() => { try { return sessionStorage.getItem('hintSeen') === '1' } catch { return false } })(),

  async init() {
    const list = await db.loadAll()
    // 매장 목록이 바뀌어 없어진 매장의 옛 기록은 무시
    const stamps = Object.fromEntries(list.filter((r) => STORE_BY_ID[r.storeId]).map((r) => [r.storeId, r]))
    // 저널에서 이미 본 도장 (처음이면 지금 있는 도장은 모두 본 것으로)
    let seen = null
    try { seen = JSON.parse(localStorage.getItem('seenStamps') || 'null') } catch {}
    if (!Array.isArray(seen)) seen = Object.keys(stamps)
    set({ stamps, loaded: true, seenStamps: seen })
  },

  setPhase: (phase) => set({ phase }),

  markHintSeen() {
    if (get().hintSeen) return
    try { sessionStorage.setItem('hintSeen', '1') } catch {}
    set({ hintSeen: true })
  },
  tapStore(storeId) {
    const s = get()
    if (s.walkTarget || s.phase !== 'map' || s.activeStore) return
    s.markHintSeen()
    if (s.avatarNode === 'f_' + storeId) {
      set({ activeStore: storeId, peek: false })
    } else {
      set({ walkTarget: storeId })
    }
  },
  // 꾹 누르기: 걸어가지 않고 정보 카드만. 이미 그 가게 앞이면 평소 카드(도장 가능)
  peekStore(storeId) {
    const s = get()
    if (s.walkTarget || s.phase !== 'map' || s.activeStore || s.journal || s.paperMap) return
    s.markHintSeen()
    set({ activeStore: storeId, peek: s.avatarNode !== 'f_' + storeId })
  },
  // 정보 카드에서 '가서 도장 찍기' → 카드 닫고 그 가게로 걸어감
  walkFromPeek() {
    const id = get().activeStore
    if (!id) return
    set({ activeStore: null, peek: false, stampOpen: false })
    get().tapStore(id)
  },
  arrived(storeId) {
    set({ walkTarget: null, avatarNode: 'f_' + storeId, activeStore: storeId, peek: false })
  },

  closeSheet() {
    const { activeStore, freshStamp } = get()
    set({
      activeStore: null,
      peek: false,
      stampOpen: false,
      postcard:
        freshStamp && freshStamp === activeStore && get().postcard?.storeId !== activeStore
          ? { storeId: activeStore, t: Date.now() }
          : get().postcard,
    })
  },
  openStamp: () => set({ stampOpen: true }),
  closeStamp: () => set({ stampOpen: false }),

  async addStamp(storeId, photo, note) {
    const rec = { storeId, photo, note, date: new Date().toISOString() }
    await db.saveStamp(rec)
    set({ stamps: { ...get().stamps, [storeId]: rec }, freshStamp: storeId })
  },
  async updateStamp(storeId, patch) {
    const rec = { ...get().stamps[storeId], ...patch }
    await db.saveStamp(rec)
    set({ stamps: { ...get().stamps, [storeId]: rec } })
  },

  openJournal() {
    const s = get()
    const done = Object.keys(s.stamps).length === STORES.length
    const seenStamps = Object.keys(s.stamps) // 저널을 펼치면 새 도장을 확인한 것
    try { localStorage.setItem('seenStamps', JSON.stringify(seenStamps)) } catch {}
    set({ journal: 'open', journalPage: null, complete: false, _autoComplete: done, seenStamps })
  },
  closeJournal: () => set({ journal: null, journalPage: null, complete: false, freshStamp: null }),
  setJournalPage: (journalPage) => set({ journalPage }),
  setComplete: (complete) => set({ complete }),

  openPaperMap: () => set({ paperMap: true }),
  closePaperMap: () => set({ paperMap: false }),

  goToStore(storeId) {
    set({
      paperMap: false,
      journal: null,
      journalPage: null,
      complete: false,
      teleport: { storeId, t: Date.now() },
      avatarNode: 'f_' + storeId,
    })
  },

  async reset() {
    await db.removeAll()
    set({ stamps: {}, freshStamp: null, postcard: null, avatarNode: START_NODE, journal: null, teleport: { storeId: null, t: Date.now() } })
  },

  showToast(msg) {
    set({ toast: { msg, t: Date.now() } })
    setTimeout(() => {
      if (get().toast && Date.now() - get().toast.t >= 2400) set({ toast: null })
    }, 2500)
  },
}))
