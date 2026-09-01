export type LivePlace = 'alone' | 'work' | 'others'
export type LivePrecum = 'none' | 'little' | 'lots'
export type OrgasmLock = 'free' | 'denied' | 'edges' | 'after_tasks' | 'night'
export type PlugSize = 'none' | 'small' | 'purple' | 'large'
export type NippleStatus = 'free' | 'clamped' | 'estim'

export interface LiveStatus {
  arousal: number
  plug: PlugSize
  estim: string
  precum: LivePrecum
  place: LivePlace
  panties: boolean
  nipples: NippleStatus
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
  time: string
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
  homework: string
}

const KEY = 'stay-frue-state'

export const defaultStatus = (): LiveStatus => ({
  arousal: 4,
  plug: 'none',
  estim: '0',
  precum: 'none',
  place: 'alone',
  panties: false,
  nipples: 'free',
})

export const defaultDayPlan = (): DayBlock[] => [
  { id: 'morgen', title: 'Morgen', text: 'Vinget plug + trusser under tøjet.', time: '07:30', accepted: false, done: false },
  { id: 'formiddag', title: 'Formiddag', text: 'Kegels rundt om pluggen.', time: '10:00', accepted: false, done: false },
  { id: 'middag', title: 'Middag', text: 'Tjek-ind. Kort.', time: '12:30', accepted: false, done: false },
  { id: 'eftermiddag', title: 'Eftermiddag', text: 'Større plug kun hvis du er alene.', time: '16:00', accepted: false, done: false },
  { id: 'aften', title: 'Aften', text: 'Edge i kondom. Ingen udløsning uden lov.', time: '20:00', accepted: false, done: false },
  { id: 'nat', title: 'Nat', text: 'Sov med plug. Hænderne væk.', time: '22:30', accepted: false, done: false },
  { id: 'sondag', title: 'Søndag', text: 'Tilladelse eller ny denial-uge.', time: '10:00', accepted: false, done: false },
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
    homework: '',
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
      status: migrateStatus({ ...base.status, ...(parsed.status || {}) }),
      dayPlan: mergeDayPlan(parsed.dayPlan),
      plugLog: Array.isArray(parsed.plugLog) ? parsed.plugLog : [],
    }
  } catch {
    return defaultFrueState()
  }
}

export function saveFrueState(state: FrueState) {
  window.localStorage.setItem(KEY, JSON.stringify(state))
}

function migrateStatus(status: Omit<LiveStatus, 'plug'> & { plug?: PlugSize | boolean }): LiveStatus {
  const plug = status.plug === true ? 'small' : status.plug === false || !status.plug ? 'none' : status.plug
  const nipples = status.nipples === 'clamped' || status.nipples === 'estim' ? status.nipples : 'free'
  return { ...defaultStatus(), ...status, plug, panties: status.panties === true, nipples }
}

function mergeDayPlan(value: unknown): DayBlock[] {
  const incoming = Array.isArray(value) ? value as DayBlock[] : []
  const byId = new Map(incoming.map((row) => [row.id, row]))
  return defaultDayPlan().map((block) => {
    const saved = byId.get(block.id)
    if (!saved) return block
    return {
      ...block,
      ...saved,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(saved.time || '') ? saved.time : block.time,
    }
  })
}

export function statusLine(status: LiveStatus): string {
  const plug = status.plug === 'small' ? 'lille plug' : status.plug === 'purple' ? 'lilla plug' : status.plug === 'large' ? 'stor plug' : 'tom'
  const precum = status.precum === 'lots' ? 'meget i kondomet' : status.precum === 'little' ? 'lidt i kondomet' : 'kondom tomt'
  const place = status.place === 'work' ? 'arbejde' : status.place === 'others' ? 'andre i nærheden' : 'alene'
  const nipples = status.nipples === 'clamped' ? 'klemt' : status.nipples === 'estim' ? 'e-stim' : 'fri'
  return `Tændt ${status.arousal}/10. Plug: ${plug}. E-stim ${status.estim}. ${precum}. Sted: ${place}. Trusser: ${status.panties ? 'ja' : 'nej'}. Vorter: ${nipples}.`
}

export function daysSinceOrgasm(lastOrgasmAt: string): number {
  if (!lastOrgasmAt) return 0
  const then = Date.parse(lastOrgasmAt)
  if (!Number.isFinite(then)) return 0
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000))
}

export function lockBlocksClimax(state: FrueState): string {
  if (state.lock === 'night') {
    const hour = new Date().getHours()
    if (hour >= 22 || hour < 8) return 'Natte-lås. Ingen klimaks før morgenrapport.'
  }
  if (state.lock === 'denied') return 'Udløsning er låst i dag. Brug safeword eller slå låsen fra.'
  if (state.lock === 'edges' && state.lockEdges > 0) return `Endnu ${state.lockEdges} edges før du må komme.`
  if (state.lock === 'after_tasks') {
    const open = state.dayPlan.filter((block) => block.accepted && !block.done)
    if (open.length) return `Opgaver tilbage: ${open.map((block) => block.title).join(', ')}.`
  }
  return ''
}
