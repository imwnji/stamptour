// IndexedDB 저장 (MVP). 브라우저가 막으면 메모리에만 보관.
// 나중에 Firebase로 옮길 때 이 파일의 4개 함수만 바꾸면 됩니다.
const DB_NAME = 'seochon-winter-journal'
const STORE = 'stamps'
let dbPromise = null
const memory = new Map()

function open() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'storeId' })
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

function tx(db, mode, fn) {
  return new Promise((resolve) => {
    try {
      const t = db.transaction(STORE, mode)
      const r = fn(t.objectStore(STORE))
      t.oncomplete = () => resolve(r && r.result)
      t.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function loadAll() {
  const db = await open()
  if (!db) return [...memory.values()]
  const res = await tx(db, 'readonly', (s) => s.getAll())
  return res || []
}

export async function saveStamp(rec) {
  memory.set(rec.storeId, rec)
  const db = await open()
  if (db) await tx(db, 'readwrite', (s) => s.put(rec))
}

export async function removeAll() {
  memory.clear()
  const db = await open()
  if (db) await tx(db, 'readwrite', (s) => s.clear())
}
