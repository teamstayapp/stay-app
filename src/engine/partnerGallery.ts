const DB_NAME = 'stay-partner-gallery'
const STORE_NAME = 'galleries'
const MAX_IMAGES = 12

interface StoredGallery {
  userId: string
  imageUrls: string[]
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

function normalize(imageUrls: string[]): string[] {
  return [...new Set(imageUrls.filter((url) => typeof url === 'string' && url.startsWith('data:image/')))].slice(0, MAX_IMAGES)
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = run(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function loadPartnerGallery(userId: string): Promise<string[]> {
  try {
    const stored = await withStore<StoredGallery | undefined>('readonly', (store) => store.get(userId))
    return normalize(stored?.imageUrls || [])
  } catch {
    return []
  }
}

export async function savePartnerGallery(userId: string, imageUrls: string[]): Promise<void> {
  await withStore('readwrite', (store) => store.put({ userId, imageUrls: normalize(imageUrls) }))
}
