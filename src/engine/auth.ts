import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
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
  emailVerified?: boolean
}

export type AuthResult =
  | { ok: true; account: Account }
  | { ok: true; notice: string }
  | { ok: false; error: string }

const USERS_KEY = 'stay.users'
const SESSION_KEY = 'stay.session'
const REMEMBERED_EMAIL_KEY = 'stay.remembered-email'

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

export function loadRememberedEmail(): string {
  return localStorage.getItem(REMEMBERED_EMAIL_KEY)?.trim().toLowerCase() || ''
}

export function rememberLoginEmail(email: string): void {
  const value = email.trim().toLowerCase()
  if (value.includes('@')) localStorage.setItem(REMEMBERED_EMAIL_KEY, value)
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
  const auth = getFirebaseAuth()
  if (auth) void signOut(auth)
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

function fromFirebase(email: string, uid: string, emailVerified: boolean): Account {
  const list = loadAccounts()
  const hit = list.find((a) => a.email === email)
  const role = email === (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ? 'admin' : 'user'
  if (hit) {
    const next: Account = { ...hit, id: uid, role, emailVerified, lastSeen: new Date().toISOString() }
    saveAccounts(list.map((a) => (a.email === email ? next : a)))
    setSession(uid)
    return next
  }
  const acc: Account = {
    id: uid,
    email,
    password: '',
    role,
    plan: 'free',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    imagesLeft: 2,
    emailVerified,
  }
  saveAccounts([...list, acc])
  setSession(uid)
  return acc
}

export async function loginAsync(email: string, password: string): Promise<AuthResult> {
  if (firebaseReady()) {
    const auth = getFirebaseAuth()
    if (!auth) return { ok: false, error: 'Firebase er ikke klar.' }
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      if (!cred.user.emailVerified) {
        await sendEmailVerification(cred.user).catch(() => undefined)
        await signOut(auth)
        setSession(null)
        return { ok: true, notice: 'Bekræft din e-mail via linket, vi har sendt, og log derefter ind.' }
      }
      rememberLoginEmail(email)
      return { ok: true, account: fromFirebase(email.trim().toLowerCase(), cred.user.uid, true) }
    } catch (error) {
      return { ok: false, error: authError(error, 'Kunne ikke logge ind.') }
    }
  }
  const result = login(email, password)
  if (typeof result === 'string') return { ok: false, error: result }
  rememberLoginEmail(email)
  return { ok: true, account: result }
}

export async function registerAsync(email: string, password: string): Promise<AuthResult> {
  if (password.length < 8) return { ok: false, error: 'Adgangskoden skal være på mindst 8 tegn.' }
  if (firebaseReady()) {
    const auth = getFirebaseAuth()
    if (!auth) return { ok: false, error: 'Firebase er ikke klar.' }
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await sendEmailVerification(cred.user).catch(() => undefined)
      await signOut(auth)
      setSession(null)
      rememberLoginEmail(email)
      return { ok: true, notice: 'Kontoen er oprettet. Bekræft din e-mail via linket, vi har sendt.' }
    } catch (error) {
      return { ok: false, error: authError(error, 'Kunne ikke oprette kontoen.') }
    }
  }
  const result = register(email, password)
  if (typeof result === 'string') return { ok: false, error: result }
  rememberLoginEmail(email)
  return { ok: true, account: result }
}

export async function requestPasswordReset(email: string): Promise<string> {
  const value = email.trim().toLowerCase()
  if (!value.includes('@')) return 'Indtast din e-mailadresse først.'
  if (!firebaseReady()) return 'Nulstilling virker, når Firebase er slået til.'
  const auth = getFirebaseAuth()
  if (!auth) return 'Firebase er ikke klar.'
  try {
    await sendPasswordResetEmail(auth, value)
    return 'Hvis adressen findes, er der sendt et link til at vælge en ny adgangskode.'
  } catch {
    return 'Hvis adressen findes, er der sendt et link til at vælge en ny adgangskode.'
  }
}

export function observeAccount(callback: (account: Account | null) => void): () => void {
  if (!firebaseReady()) {
    callback(currentAccount())
    return () => undefined
  }
  const auth = getFirebaseAuth()
  if (!auth) return () => undefined
  return onAuthStateChanged(auth, (user) => {
    if (!user?.email) {
      setSession(null)
      callback(null)
      return
    }
    callback(fromFirebase(user.email.toLowerCase(), user.uid, user.emailVerified))
  })
}

function authError(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Forkert e-mail eller adgangskode.'
  }
  if (code.includes('email-already-in-use')) return 'Der findes allerede en konto med den e-mail.'
  if (code.includes('invalid-email')) return 'E-mailadressen er ikke gyldig.'
  if (code.includes('weak-password')) return 'Adgangskoden er for svag.'
  if (code.includes('too-many-requests')) return 'For mange forsøg. Vent lidt og prøv igen.'
  if (code.includes('network-request-failed')) return 'Ingen forbindelse til login-serveren.'
  return fallback
}
