import type { TaskBank, TaskPlan } from './sessionStore'
import type { DayBlock } from './frue'
import { getFirebaseAuth } from './firebase'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '')
const VAPID_PUBLIC = (import.meta.env.VITE_VAPID_PUBLIC as string | undefined)?.trim()
const PUSH_CONFIG_URL = new URL('stay-push-config', window.location.href).href

interface PushSettings {
  explicit: boolean
  partnerTitle: string
  plan: TaskPlan
  taskBank: TaskBank
  dayPlan: DayBlock[]
}

export async function hasStayPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  try {
    const registration = await navigator.serviceWorker.ready
    return Boolean(await registration.pushManager.getSubscription())
  } catch {
    return false
  }
}

export async function subscribeStayPush(settings: PushSettings): Promise<string> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'Denne enhed understøtter ikke Web Push.'
  }
  if (!API_URL || !VAPID_PUBLIC) return 'Web Push mangler opsætning i GitHub og Cloudflare.'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'Tillad notifikationer for Stay i enhedens indstillinger.'

  try {
    const registration = await navigator.serviceWorker.ready
    const current = await registration.pushManager.getSubscription()
    const subscription = current || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(VAPID_PUBLIC),
    })
    await writePushSettings(settings)
    return await sendSubscription(subscription, settings)
  } catch (error) {
    return error instanceof Error ? error.message : 'Web Push kunne ikke aktiveres.'
  }
}

export async function updateStayPush(settings: PushSettings): Promise<string> {
  if (!API_URL || !VAPID_PUBLIC) return 'Web Push mangler opsætning i GitHub og Cloudflare.'
  try {
    await writePushSettings(settings)
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return 'Web Push er ikke aktiv på denne enhed.'
    return await sendSubscription(subscription, settings)
  } catch {
    return 'Web Push-indstillingerne kunne ikke opdateres.'
  }
}

export async function unsubscribeStayPush(): Promise<string> {
  if (!('serviceWorker' in navigator) || !API_URL) return ''
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return ''
    const token = await getFirebaseAuth()?.currentUser?.getIdToken()
    if (token) {
      await fetch(`${API_URL}/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => undefined)
    }
    await subscription.unsubscribe()
    return ''
  } catch {
    return 'Web Push kunne ikke slås helt fra. Kontrollér notifikationer i enhedens indstillinger.'
  }
}

async function sendSubscription(subscription: PushSubscription, settings: PushSettings): Promise<string> {
  const token = await getFirebaseAuth()?.currentUser?.getIdToken()
  if (!token) return 'Log ind igen for at aktivere Web Push.'
  const plan = settings.plan
  const response = await fetch(`${API_URL}/push/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      intervalMin: plan.intervalMin,
      count: plan.count,
      mode: plan.mode,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Copenhagen',
      daySchedule: settings.dayPlan
        .filter((block) => block.accepted)
        .map((block) => ({ id: block.id, title: block.title, text: block.text, time: block.time })),
    }),
  })
  const data = await response.json().catch(() => null) as { error?: string } | null
  return response.ok ? '' : data?.error || 'Cloudflare kunne ikke gemme Web Push-abonnementet.'
}

async function writePushSettings(settings: PushSettings): Promise<void> {
  const cache = await caches.open('stay-push-settings')
  await cache.put(PUSH_CONFIG_URL, new Response(JSON.stringify({
    explicit: settings.explicit,
    partnerTitle: settings.partnerTitle,
    category: settings.plan.category,
    categories: settings.plan.categories,
    taskBank: settings.taskBank,
    dayPlan: settings.dayPlan.filter((block) => block.accepted),
  }), { headers: { 'Content-Type': 'application/json' } }))
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}
