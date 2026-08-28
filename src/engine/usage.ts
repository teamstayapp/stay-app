import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { getFirebaseDb } from './firebase'
import { ADDONS, PLANS, type AddOnId, type PlanId } from './plans'

export interface UsageConfig {
  freeChatDaily: number
  freeImageGenerationsMonthly: number
  freeImageAnalysesMonthly: number
  soloChatDaily: number
  soloImageGenerationsMonthly: number
  soloImageAnalysesMonthly: number
  plusChatDaily: number
  plusImageGenerationsMonthly: number
  plusImageAnalysesMonthly: number
}

export interface ModelUsage {
  calls: number
  inputTokens: number
  outputTokens: number
}

export interface UsageSnapshot {
  chatToday: number
  chatMonth: number
  imageGenerations: number
  imageAnalyses: number
  models: Record<string, ModelUsage>
}

export interface Entitlement {
  plan: PlanId
  extraPacks: boolean
  bonusPeriod: string
  bonusImageGenerations: number
  bonusImageAnalyses: number
}

export interface PurchaseRequest {
  id: string
  uid: string
  email: string
  type: 'plan' | 'addon'
  productId: PlanId | AddOnId
  title: string
  priceDkk: number
  status: 'pending' | 'approved' | 'rejected'
  createdAt?: { toDate?: () => Date }
}

export interface UsageDashboardRow extends UsageSnapshot {
  id: string
  uid: string
  email: string
  period: string
}

export const DEFAULT_USAGE_CONFIG: UsageConfig = {
  freeChatDaily: 50,
  freeImageGenerationsMonthly: 2,
  freeImageAnalysesMonthly: 5,
  soloChatDaily: 500,
  soloImageGenerationsMonthly: 25,
  soloImageAnalysesMonthly: 100,
  plusChatDaily: 1_000,
  plusImageGenerationsMonthly: 80,
  plusImageAnalysesMonthly: 300,
}

const emptyUsage = (): UsageSnapshot => ({
  chatToday: 0,
  chatMonth: 0,
  imageGenerations: 0,
  imageAnalyses: 0,
  models: {},
})

export function currentUsagePeriod(): string {
  return new Date().toISOString().slice(0, 7)
}

function currentUsageDay(): string {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '')
}

function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function usageConfig(value: Record<string, unknown> | undefined): UsageConfig {
  const result = { ...DEFAULT_USAGE_CONFIG }
  if (!value) return result
  for (const key of Object.keys(result) as Array<keyof UsageConfig>) {
    const candidate = number(value[key])
    if (candidate >= 0) result[key] = Math.round(candidate)
  }
  return result
}

function usageSnapshot(value: Record<string, unknown> | undefined): UsageSnapshot {
  const rawModels = value?.models && typeof value.models === 'object' ? value.models as Record<string, unknown> : {}
  const models: Record<string, ModelUsage> = {}
  for (const [model, item] of Object.entries(rawModels)) {
    if (!item || typeof item !== 'object') continue
    const fields = item as Record<string, unknown>
    models[model] = {
      calls: number(fields.calls),
      inputTokens: number(fields.inputTokens),
      outputTokens: number(fields.outputTokens),
    }
  }
  return {
    chatToday: number(value?.chatToday),
    chatMonth: number(value?.chatCalls),
    imageGenerations: number(value?.imageGenerations),
    imageAnalyses: number(value?.imageAnalyses),
    models,
  }
}

export function limitsForPlan(config: UsageConfig, plan: PlanId) {
  const prefix = plan === 'plus' ? 'plus' : plan === 'solo' ? 'solo' : 'free'
  return {
    chatDaily: config[`${prefix}ChatDaily`],
    imageGenerationsMonthly: config[`${prefix}ImageGenerationsMonthly`],
    imageAnalysesMonthly: config[`${prefix}ImageAnalysesMonthly`],
  }
}

export function observeUsageConfig(callback: (value: UsageConfig) => void): () => void {
  const db = getFirebaseDb()
  if (!db) {
    callback({ ...DEFAULT_USAGE_CONFIG })
    return () => undefined
  }
  return onSnapshot(
    doc(db, 'usageConfig', 'default'),
    (snapshot) => callback(usageConfig(snapshot.data())),
    () => callback({ ...DEFAULT_USAGE_CONFIG }),
  )
}

export async function publishUsageConfig(value: UsageConfig): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase er ikke klar.')
  await setDoc(doc(db, 'usageConfig', 'default'), { ...value, updatedAt: serverTimestamp() }, { merge: true })
}

export async function setUserEntitlementPlan(uid: string, plan: PlanId): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase er ikke klar.')
  await setDoc(doc(db, 'userEntitlements', uid), { plan, updatedAt: serverTimestamp() }, { merge: true })
}

export async function ensureUserProfile(uid: string, email: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) return
  const reference = doc(db, 'userProfiles', uid)
  const snapshot = await getDoc(reference)
  if (snapshot.exists()) {
    await setDoc(reference, { email, lastSeen: serverTimestamp() }, { merge: true })
  } else {
    await setDoc(reference, { email, chatName: '', createdAt: serverTimestamp(), lastSeen: serverTimestamp() })
  }
}

export function observeEntitlement(uid: string, callback: (value: Entitlement) => void): () => void {
  const fallback: Entitlement = {
    plan: 'free',
    extraPacks: false,
    bonusPeriod: currentUsagePeriod(),
    bonusImageGenerations: 0,
    bonusImageAnalyses: 0,
  }
  const db = getFirebaseDb()
  if (!db) {
    callback(fallback)
    return () => undefined
  }
  return onSnapshot(
    doc(db, 'userEntitlements', uid),
    (snapshot) => {
      const data = snapshot.data()
      const plan = data?.plan === 'solo' || data?.plan === 'plus' ? data.plan : 'free'
      callback({
        plan,
        extraPacks: data?.extraPacks === true,
        bonusPeriod: typeof data?.bonusPeriod === 'string' ? data.bonusPeriod : currentUsagePeriod(),
        bonusImageGenerations: number(data?.bonusImageGenerations),
        bonusImageAnalyses: number(data?.bonusImageAnalyses),
      })
    },
    () => callback(fallback),
  )
}

export function observeUserUsage(uid: string, callback: (value: UsageSnapshot) => void): () => void {
  const db = getFirebaseDb()
  if (!db) {
    callback(emptyUsage())
    return () => undefined
  }
  let daily = 0
  let monthly = emptyUsage()
  const emit = () => callback({ ...monthly, chatToday: daily })
  const stopDaily = onSnapshot(
    doc(db, 'usageDaily', `${uid}_${currentUsageDay()}`),
    (snapshot) => { daily = number(snapshot.data()?.chatCalls); emit() },
    () => undefined,
  )
  const stopMonthly = onSnapshot(
    doc(db, 'usageMonthly', `${uid}_${currentUsagePeriod()}`),
    (snapshot) => { monthly = usageSnapshot(snapshot.data()); emit() },
    () => undefined,
  )
  return () => { stopDaily(); stopMonthly() }
}

export async function requestPlanPurchase(uid: string, email: string, planId: PlanId): Promise<void> {
  const product = PLANS.find((item) => item.id === planId)
  if (!product || planId === 'free') return
  await createPurchase(uid, email, 'plan', planId, product.title, product.dkkMonth)
}

export async function requestAddonPurchase(uid: string, email: string, addonId: AddOnId): Promise<void> {
  const product = ADDONS.find((item) => item.id === addonId)
  if (!product) return
  await createPurchase(uid, email, 'addon', addonId, product.title, product.dkk)
}

async function createPurchase(
  uid: string,
  email: string,
  type: 'plan' | 'addon',
  productId: PlanId | AddOnId,
  title: string,
  priceDkk: number,
) {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase er ikke klar.')
  await addDoc(collection(db, 'purchaseRequests'), {
    uid,
    email,
    type,
    productId,
    title,
    priceDkk,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

export function observeUsageDashboard(callback: (rows: UsageDashboardRow[]) => void): () => void {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => undefined
  }
  return onSnapshot(collection(db, 'usageMonthly'), (snapshot) => {
    callback(snapshot.docs.map((item) => {
      const data = item.data()
      return {
        id: item.id,
        uid: typeof data.uid === 'string' ? data.uid : '',
        email: typeof data.email === 'string' ? data.email : '',
        period: typeof data.period === 'string' ? data.period : '',
        ...usageSnapshot(data),
      }
    }))
  }, () => callback([]))
}

export function observePurchaseRequests(callback: (rows: PurchaseRequest[]) => void): () => void {
  const db = getFirebaseDb()
  if (!db) {
    callback([])
    return () => undefined
  }
  return onSnapshot(collection(db, 'purchaseRequests'), (snapshot) => {
    callback(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as PurchaseRequest)))
  }, () => callback([]))
}

export async function approvePurchase(request: PurchaseRequest): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase er ikke klar.')
  await runTransaction(db, async (transaction) => {
    const requestRef = doc(db, 'purchaseRequests', request.id)
    const entitlementRef = doc(db, 'userEntitlements', request.uid)
    const current = await transaction.get(entitlementRef)
    const entitlement = current.data()
    const period = currentUsagePeriod()
    const oldPeriod = entitlement?.bonusPeriod === period
    const baseGeneration = oldPeriod ? number(entitlement?.bonusImageGenerations) : 0
    const baseAnalysis = oldPeriod ? number(entitlement?.bonusImageAnalyses) : 0

    if (request.type === 'plan') {
      const plan = request.productId === 'solo' || request.productId === 'plus' ? request.productId : 'free'
      transaction.set(entitlementRef, { plan, updatedAt: serverTimestamp() }, { merge: true })
    } else {
      const addon = ADDONS.find((item) => item.id === request.productId)
      transaction.set(entitlementRef, {
        bonusPeriod: period,
        bonusImageGenerations: baseGeneration + (addon?.images ?? 0),
        bonusImageAnalyses: baseAnalysis + (addon?.imageAnalyses ?? 0),
        extraPacks: addon?.packs ? true : Boolean(entitlement?.extraPacks),
        updatedAt: serverTimestamp(),
      }, { merge: true })
    }
    transaction.update(requestRef, { status: 'approved', approvedAt: serverTimestamp() })
  })
}

export async function rejectPurchase(requestId: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase er ikke klar.')
  await setDoc(doc(db, 'purchaseRequests', requestId), { status: 'rejected', reviewedAt: serverTimestamp() }, { merge: true })
}
