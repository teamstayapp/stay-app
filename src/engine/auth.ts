import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import type { PlanId } from './plans'
import { firebaseReady, getFirebaseAuth } from './firebase'

export type AccountStatus = 'active' | 'cancelled' | 'churned' | 'paused'

export interface Account {
  id: string
  email: string
  /** Kun MVP. Rigtig backend hasher. */
  password: string
  role: 'user' | 'admin'
  plan: PlanId
  status: AccountStatus
  createdAt: string
  lastSeen: string
  cancelledAt?: string
  imagesLeft: number
}

const USERS_KEY = 'stay.users'
const SESSION_KEY = 'stay.session'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function seed(): Account[] {
  return [
    {
      id: 'admin',
      email: 'admin@stay.local',
      password: 'admin',
      role: 'admin',
      plan: 'plus',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      imagesLeft: 80,
    },
  ]
}

export function loadAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    if (!raw) {
      const s = seed()
      localStorage.setItem(USERS_KEY, JSON.stringify(s))
      return s
    }
    return JSON.parse(raw) as Account[]
  } catch {
    return seed()
  }
}

export function saveAccounts(list: Account[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(list))
}

export function currentAccount(): Account | null {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  return loadAccounts().find((a) => a.id === id) ?? null
}

export function setSession(id: string | null) {
  if (!id) localStorage.removeItem(SESSION_KEY)
  else localStorage.setItem(SESSION_KEY, id)
}

export function register(email: string, password: string): Account | string {
  const list = loadAccounts()
  const e = email.trim().toLowerCase()
  if (!e.includes('@') || password.length < 4) return 'Email og mindst 4 tegn i kode.'
  if (list.some((a) => a.email === e)) return 'Email er allerede i brug.'
  const acc: Account = {
    id: uid(),
    email: e,
    password,
    role: 'user',
    plan: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    imagesLeft: 2,
  }
  saveAccounts([...list, acc])
  setSession(acc.id)
  return acc
}

export function login(email: string, password: string): Account | string {
  const list = loadAccounts()
  const acc = list.find((a) => a.email === email.trim().toLowerCase() && a.password === password)
  if (!acc) return 'Forkert email eller kode.'
  if (acc.status === 'cancelled' || acc.status === 'churned') {
    return 'Kontoen er opsagt. Skriv til support hvis du vil tilbage.'
  }
  const next = { ...acc, lastSeen: new Date().toISOString() }
  saveAccounts(list.map((a) => (a.id === next.id ? next : a)))
  setSession(next.id)
  return next
}

export function logout() {
  setSession(null)
}

export function setAccountStatus(id: string, status: AccountStatus) {
  const list = loadAccounts().map((a) =>
    a.id === id
      ? {
          ...a,
          status,
          cancelledAt: status === 'cancelled' || status === 'churned' ? new Date().toISOString() : a.cancelledAt,
        }
      : a,
  )
  saveAccounts(list)
}

export function setAccountPlan(id: string, plan: PlanId, imagesLeft: number) {
  saveAccounts(loadAccounts().map((a) => (a.id === id ? { ...a, plan, imagesLeft, status: 'active' } : a)))
}

export function touch(id: string) {
  saveAccounts(loadAccounts().map((a) => (a.id === id ? { ...a, lastSeen: new Date().toISOString() } : a)))
}

function fromFirebase(email: string, uid: string): Account {
  const list = loadAccounts()
  const hit = list.find((a) => a.email === email)
  if (hit) {
    const next = { ...hit, id: uid, lastSeen: new Date().toISOString() }
    saveAccounts(list.map((a) => (a.email === email ? next : a)))
    setSession(uid)
    return next
  }
  const acc: Account = {
    id: uid,
    email,
    password: '',
    role: email === 'admin@stay.local' ? 'admin' : 'user',
    plan: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    imagesLeft: 2,
  }
  saveAccounts([...list, acc])
  setSession(uid)
  return acc
}

export async function loginAsync(email: string, password: string): Promise<Account | string> {
  if (firebaseReady()) {
    const auth = getFirebaseAuth()
    if (!auth) return 'Firebase ikke klar.'
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      return fromFirebase(email.trim().toLowerCase(), cred.user.uid)
    } catch {
      return 'Forkert email eller kode.'
    }
  }
  return login(email, password)
}

export async function registerAsync(email: string, password: string): Promise<Account | string> {
  if (firebaseReady()) {
    const auth = getFirebaseAuth()
    if (!auth) return 'Firebase ikke klar.'
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      return fromFirebase(email.trim().toLowerCase(), cred.user.uid)
    } catch {
      return 'Kunne ikke oprette. Email optaget eller for svag kode.'
    }
  }
  return register(email, password)
}
