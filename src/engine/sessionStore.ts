import type { Line, Nearness, NotificationStyle, PrivacyMode, Profile } from '../types'

const DB_NAME = 'stay-device-data'
const STORE_NAME = 'sessions'
const FALLBACK_PREFIX = 'stay.saved-session.'
const PRIVACY_PREFIX = 'stay.privacy-mode.'
const NOTIFICATION_STYLE_PREFIX = 'stay.notification-style.'
const PANIC_DESTINATION_PREFIX = 'stay.panic-destination.'
const MEMORY_PREFIX = 'stay.memory.'
const AVAILABLE_PREFIX = 'stay.available.'
const TASK_PLAN_PREFIX = 'stay.task-plan.'
const TASK_BANK_PREFIX = 'stay.task-bank.'

export type PanicDestinationMode = 'decoy' | 'weather' | 'calendar' | 'shortcut' | 'custom'

export interface PanicDestination {
  mode: PanicDestinationMode
  customUrl: string
  shortcutName: string
}

export interface DeviceSession {
  profile: Profile
  lines: Line[]
  near: Nearness
  cycle: number
  running: boolean
  savedAt: string
  media?: { kind: 'image' | 'video'; blob: Blob }
}

export interface DeviceMemory {
  notes: string
  last: string
}

export type TaskCategory = 'mix' | 'lingerie' | 'edge' | 'sissy' | 'protocol' | 'worship' | 'estim' | 'cei' | 'work'
export type TaskBank = Record<TaskCategory, string[]>

export const TASK_CATEGORIES: TaskCategory[] = ['mix', 'lingerie', 'edge', 'sissy', 'protocol', 'worship', 'estim', 'cei', 'work']

export const DEFAULT_TASK_BANK: TaskBank = {
  mix: [],
  lingerie: [
    'Tjek lingeriet. Sidder det som aftalt?',
    'Trusser på. Skriv, når de sidder.',
    'Strømper op. Små skridt.',
  ],
  edge: [
    'Tyve langsomme ryk. Stop.',
    'Hænderne væk i to minutter.',
    'Edge. Du kommer ikke endnu.',
  ],
  sissy: [
    'Paryk eller læbestift, hvis du har det. Vis det i chatten.',
    'Trusserne bliver på. Pikken indenunder.',
    'Gå som aftalt. Små skridt.',
  ],
  protocol: [
    'Knæ. Sig titlen. Vent.',
    'Hænderne i skødet. Vent på næste besked.',
    'Titulér din partner i næste besked.',
  ],
  worship: [
    'Tænk på partnerens fødder. Skriv det.',
    'Kys luften. Du skylder en vrist senere.',
    'Tilbed kort. Ingen hænder på dig selv endnu.',
  ],
  estim: [
    'Brug kun færdigt e-stim-legetøj. Ét lavt hak op; stop straks ved smerte, svie eller følelsesløshed.',
    'Skru e-stim ned og pust roligt ud.',
    'E-stim slukket i to minutter. Hænderne væk.',
    'E-stim på lavt niveau. Ingen elektroder på hoved, hals, bryst eller beskadiget hud.',
  ],
  cei: [
    'Kondom på. Opsaml kun, hvis det er frivilligt og aftalt.',
    'Tjek kondomet og skriv kort, hvad du ser.',
    'Edge i kondomet. Ingen udløsning endnu.',
    'Hvis du kom i kondomet: vent på næste besked. Brug kun frisk indhold og kassér det ved tvivl.',
  ],
  work: [
    'Tjek diskret, at lingeriet sidder under tøjet. Ingen handling foran andre.',
    'Hvis en plug allerede er sikker og behagelig, bliver den hvor den er. Stop ved smerte eller følelsesløshed.',
    'Ingen berøring på arbejde eller offentligt. Vent, til du er helt privat.',
    'Skriv “på plads”, når tøjet sidder diskret. Mere først, når du er privat.',
  ],
}
DEFAULT_TASK_BANK.mix = TASK_CATEGORIES
  .filter((category) => category !== 'mix')
  .flatMap((category) => DEFAULT_TASK_BANK[category])

export interface TaskPlan {
  category: TaskCategory
  categories: TaskCategory[]
  intervalMin: number
  count: number
  mode: 'random' | 'fixed'
}

export const DEFAULT_TASK_PLAN: TaskPlan = {
  category: 'mix',
  categories: ['mix'],
  intervalMin: 45,
  count: 6,
  mode: 'random',
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

export function loadPanicDestination(userId: string): PanicDestination {
  try {
    const parsed = JSON.parse(localStorage.getItem(PANIC_DESTINATION_PREFIX + userId) || '') as Partial<PanicDestination>
    const allowed: PanicDestinationMode[] = ['decoy', 'weather', 'calendar', 'shortcut', 'custom']
    return {
      mode: allowed.includes(parsed.mode as PanicDestinationMode) ? parsed.mode as PanicDestinationMode : 'decoy',
      customUrl: typeof parsed.customUrl === 'string' ? parsed.customUrl.slice(0, 500) : '',
      shortcutName: typeof parsed.shortcutName === 'string' ? parsed.shortcutName.slice(0, 100) : '',
    }
  } catch {
    return { mode: 'decoy', customUrl: '', shortcutName: '' }
  }
}

export function savePanicDestination(userId: string, destination: PanicDestination): void {
  localStorage.setItem(PANIC_DESTINATION_PREFIX + userId, JSON.stringify({
    mode: destination.mode,
    customUrl: destination.customUrl.slice(0, 500),
    shortcutName: destination.shortcutName.slice(0, 100),
  }))
}

export function loadDeviceMemory(userId: string): DeviceMemory {
  try {
    const parsed = JSON.parse(localStorage.getItem(MEMORY_PREFIX + userId) || '') as Partial<DeviceMemory>
    return {
      notes: typeof parsed.notes === 'string' ? parsed.notes.slice(0, 600) : '',
      last: typeof parsed.last === 'string' ? parsed.last.slice(0, 400) : '',
    }
  } catch {
    return { notes: '', last: '' }
  }
}

export function saveDeviceMemory(userId: string, memory: DeviceMemory): void {
  localStorage.setItem(MEMORY_PREFIX + userId, JSON.stringify({
    notes: memory.notes.slice(0, 600),
    last: memory.last.slice(0, 400),
  }))
}

export function clearDeviceMemory(userId: string): void {
  localStorage.removeItem(MEMORY_PREFIX + userId)
}

export function loadAvailability(userId: string): boolean {
  return localStorage.getItem(AVAILABLE_PREFIX + userId) === '1'
}

export function saveAvailability(userId: string, available: boolean): void {
  localStorage.setItem(AVAILABLE_PREFIX + userId, available ? '1' : '0')
}

export function loadTaskPlan(userId: string): TaskPlan {
  try {
    const parsed = JSON.parse(localStorage.getItem(TASK_PLAN_PREFIX + userId) || '') as Partial<TaskPlan>
    const legacyCategory = TASK_CATEGORIES.includes(parsed.category as TaskCategory)
      ? parsed.category as TaskCategory
      : 'mix'
    const storedCategories = Array.isArray(parsed.categories)
      ? [...new Set(parsed.categories.filter((category): category is TaskCategory => TASK_CATEGORIES.includes(category as TaskCategory)))]
      : []
    const categories = storedCategories.length ? storedCategories : [legacyCategory]
    const normalizedCategories = categories.includes('mix') ? ['mix' as TaskCategory] : categories
    return {
      category: normalizedCategories[0],
      categories: normalizedCategories,
      intervalMin: Math.max(5, Math.min(360, Number(parsed.intervalMin) || DEFAULT_TASK_PLAN.intervalMin)),
      count: Math.max(1, Math.min(24, Number(parsed.count) || DEFAULT_TASK_PLAN.count)),
      mode: parsed.mode === 'fixed' ? 'fixed' : 'random',
    }
  } catch {
    return { ...DEFAULT_TASK_PLAN }
  }
}

export function loadTaskBank(userId: string): TaskBank {
  const fallback = Object.fromEntries(
    TASK_CATEGORIES.map((category) => [category, [...DEFAULT_TASK_BANK[category]]]),
  ) as TaskBank
  try {
    const parsed = JSON.parse(localStorage.getItem(TASK_BANK_PREFIX + userId) || '') as Partial<TaskBank>
    for (const category of TASK_CATEGORIES) {
      const entries = parsed[category]
      if (!Array.isArray(entries)) continue
      const cleaned = entries
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim().slice(0, 180))
        .filter(Boolean)
        .slice(0, 24)
      fallback[category] = cleaned
    }
  } catch {
    // Standardteksterne bruges, hvis det lokale lager er beskadiget.
  }
  return fallback
}

export function saveTaskBank(userId: string, bank: TaskBank): void {
  const safeBank = Object.fromEntries(TASK_CATEGORIES.map((category) => [
    category,
    (bank[category] || []).map((entry) => entry.trim().slice(0, 180)).filter(Boolean).slice(0, 24),
  ]))
  localStorage.setItem(TASK_BANK_PREFIX + userId, JSON.stringify(safeBank))
}

export function saveTaskPlan(userId: string, plan: TaskPlan): void {
  localStorage.setItem(TASK_PLAN_PREFIX + userId, JSON.stringify({
    category: plan.categories[0] || plan.category,
    categories: plan.categories.length ? plan.categories : [plan.category],
    intervalMin: Math.max(5, Math.min(360, plan.intervalMin)),
    count: Math.max(1, Math.min(24, plan.count)),
    mode: plan.mode,
  }))
}
