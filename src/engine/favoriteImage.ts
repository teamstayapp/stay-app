const DB_NAME = 'stay-favorites'
const STORE_NAME = 'looks'

export interface FavoriteLook {
  userId: string
  imageUrl: string
  figure: 'master' | 'mistress'
  savedAt: string
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in globalThis)) {
      reject(new Error('IndexedDB er ikke tilgængelig'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'userId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = run(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error)
  }))
}

export async function saveFavoriteLook(look: FavoriteLook): Promise<void> {
  await withStore('readwrite', (store) => store.put(look))
}

export async function loadFavoriteLook(userId: string): Promise<FavoriteLook | null> {
  try {
    const value = await withStore<FavoriteLook | undefined>('readonly', (store) => store.get(userId))
    return value || null
  } catch {
    return null
  }
}

export async function clearFavoriteLook(userId: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(userId))
}
