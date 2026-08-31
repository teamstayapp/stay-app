export type LivePlace = 'alone' | 'work' | 'others'
export type LivePrecum = 'none' | 'little' | 'lots'
export type OrgasmLock = 'free' | 'denied' | 'edges' | 'after_tasks'

export interface LiveStatus {
  arousal: number
  plug: boolean
  estim: string
  precum: LivePrecum
  place: LivePlace
}

export interface PlugLogEntry {
  id: string
  plug: string
  startedAt: string
  endedAt?: string
  slept: boolean
  note: string
}

export interface DayBlock {
  id: string
  title: string
  text: string
  accepted: boolean
  done: boolean
}

export interface FrueState {
  workMode: boolean
  status: LiveStatus
  lock: OrgasmLock
  lockEdges: number
  lastOrgasmAt: string
  plugLog: PlugLogEntry[]
  dayPlan: DayBlock[]
}

const KEY = 'stay-frue-state'

export const defaultStatus = (): LiveStatus => ({
  arousal: 4,
  plug: false,
  estim: '0',
  precum: 'none',
  place: 'alone',
})

export const defaultDayPlan = (): DayBlock[] => [
  { id: 'morgen', title: 'Morgen', text: 'Vinget plug + lingeri under tøjet.', accepted: false, done: false },
  { id: 'middag', title: 'Middag', text: 'Tjek-ind og Kegel. Kort.', accepted: false, done: false },
  { id: 'eftermiddag', title: 'Eftermiddag', text: 'Større plug kun hvis du er alene.', accepted: false, done: false },
  { id: 'aften', title: 'Aften', text: 'Edge. Ingen udløsning før Fruen siger ja.', accepted: false, done: false },
]

export function defaultFrueState(): FrueState {
  return {
    workMode: false,
    status: defaultStatus(),
    lock: 'free',
    lockEdges: 3,
    lastOrgasmAt: '',
    plugLog: [],
    dayPlan: defaultDayPlan(),
  }
}

export function loadFrueState(): FrueState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return defaultFrueState()
    const parsed = JSON.parse(raw) as Partial<FrueState>
    const base = defaultFrueState()
    return {
      ...base,
      ...parsed,
      status: { ...base.status, ...(parsed.status || {}) },
      dayPlan: Array.isArray(parsed.dayPlan) && parsed.dayPlan.length ? parsed.dayPlan : base.dayPlan,
      plugLog: Array.isArray(parsed.plugLog) ? parsed.plugLog : [],
    }
  } catch {
    return defaultFrueState()
  }
}

export function saveFrueState(state: FrueState) {
  window.localStorage.setItem(KEY, JSON.stringify(state))
}

export function statusLine(status: LiveStatus): string {
  const precum = status.precum === 'lots' ? 'meget precum' : status.precum === 'little' ? 'lidt precum' : 'intet precum'
  const place = status.place === 'work' ? 'arbejde' : status.place === 'others' ? 'andre i nærheden' : 'alene'
  return `Tændt ${status.arousal}/10. Plug: ${status.plug ? 'i' : 'intet'}. E-stim ${status.estim}. ${precum}. Sted: ${place}.`
}

export function daysSinceOrgasm(lastOrgasmAt: string): number {
  if (!lastOrgasmAt) return 0
  const then = Date.parse(lastOrgasmAt)
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
}

export function lockBlocksClimax(state: FrueState): string {
  if (state.lock === 'denied') return 'Udløsning er låst i dag. Brug safeword eller slå låsen fra.'
  if (state.lock === 'edges' && state.lockEdges > 0) return `Endnu ${state.lockEdges} edges før du må komme.`
  if (state.lock === 'after_tasks') {
    const open = state.dayPlan.filter((block) => block.accepted && !block.done)
    if (open.length) return `Opgaver tilbage: ${open.map((block) => block.title).join(', ')}.`
  }
  return ''
}
