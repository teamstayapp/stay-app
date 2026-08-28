import type { Line, Nearness, NotificationStyle, PrivacyMode, Profile } from '../types'

const DB_NAME = 'stay-device-data'
const STORE_NAME = 'sessions'
const FALLBACK_PREFIX = 'stay.saved-session.'
const PRIVACY_PREFIX = 'stay.privacy-mode.'
const NOTIFICATION_STYLE_PREFIX = 'stay.notification-style.'

export interface DeviceSession {
  profile: Profile
  lines: Line[]
  near: Nearness
  cycle: number
  running: boolean
  savedAt: string
  media?: { kind: 'image' | 'video'; blob: Blob }
}

interface StoredDeviceSession extends DeviceSession {
  userId: string
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

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const request = run(transaction.objectStore(STORE_NAME))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function saveDeviceSession(userId: string, session: DeviceSession): Promise<void> {
  const stored: StoredDeviceSession = { ...session, userId }
  try {
    await withStore('readwrite', (store) => store.put(stored))
    localStorage.removeItem(FALLBACK_PREFIX + userId)
  } catch {
    const textOnly = { ...session, media: undefined }
    localStorage.setItem(FALLBACK_PREFIX + userId, JSON.stringify(textOnly))
  }
}

export async function loadDeviceSession(userId: string): Promise<DeviceSession | null> {
  try {
    const stored = await withStore<StoredDeviceSession | undefined>('readonly', (store) => store.get(userId))
    if (stored) {
      const { userId: _userId, ...session } = stored
      return session
    }
  } catch {
    // Brug tekst-fallbacken nedenfor.
  }
  try {
    const raw = localStorage.getItem(FALLBACK_PREFIX + userId)
    return raw ? JSON.parse(raw) as DeviceSession : null
  } catch {
    return null
  }
}

export async function hasDeviceSession(userId: string): Promise<boolean> {
  return Boolean(await loadDeviceSession(userId))
}

export async function clearDeviceSession(userId: string): Promise<void> {
  localStorage.removeItem(FALLBACK_PREFIX + userId)
  try {
    await withStore('readwrite', (store) => store.delete(userId))
  } catch {
    // Der er ikke noget andet sted at rydde, hvis IndexedDB ikke er tilgængelig.
  }
}

export function loadPrivacyMode(userId: string): PrivacyMode {
  return localStorage.getItem(PRIVACY_PREFIX + userId) === 'device' ? 'device' : 'private'
}

export function savePrivacyMode(userId: string, mode: PrivacyMode): void {
  localStorage.setItem(PRIVACY_PREFIX + userId, mode)
}

export function loadNotificationStyle(userId: string): NotificationStyle {
  return localStorage.getItem(NOTIFICATION_STYLE_PREFIX + userId) === 'explicit' ? 'explicit' : 'discreet'
}

export function saveNotificationStyle(userId: string, style: NotificationStyle): void {
  localStorage.setItem(NOTIFICATION_STYLE_PREFIX + userId, style)
}
