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
  stampOpen: false, // 스탬프 인증 화면
  journal: null, // null | 'open'
  journalPage: null, // storeId (기록 보기)
  complete: false, // 완성 페이지
  freshStamp: null, // 방금 찍힌 매장 (저널 반짝임)
  postcard: null, // { storeId, t } 건물 엽서 부착 연출
  toast: null,

  async init() {
    const list = await db.loadAll()
    // 매장 목록이 바뀌어 없어진 매장의 옛 기록은 무시
    const stamps = Object.fromEntries(list.filter((r) => STORE_BY_ID[r.storeId]).map((r) => [r.storeId, r]))
    set({ stamps, loaded: true })
  },

  setPhase: (phase) => set({ phase }),

  tapStore(storeId) {
    const s = get()
    if (s.walkTarget || s.phase !== 'map' || s.activeStore) return
    if (s.avatarNode === 'f_' + storeId) {
      set({ activeStore: storeId })
    } else {
      set({ walkTarget: storeId })
    }
  },
  arrived(storeId) {
    set({ walkTarget: null, avatarNode: 'f_' + storeId, activeStore: storeId })
  },

  closeSheet() {
    const { activeStore, freshStamp } = get()
    set({
      activeStore: null,
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
    set({ journal: 'open', journalPage: null, complete: false, _autoComplete: done })
  },
  closeJournal: () => set({ journal: null, journalPage: null, complete: false, freshStamp: null }),
  setJournalPage: (journalPage) => set({ journalPage }),
  setComplete: (complete) => set({ complete }),

  goToStore(storeId) {
    set({
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
