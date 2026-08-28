import type { Line, Nearness, Profile } from '../types'
import { getFirebaseAuth } from './firebase'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '')

interface AskAiInput {
  profile: Profile
  near: Nearness
  cycle: number
  lines: Line[]
  text: string
  intent?: 'chat' | 'task'
  signal?: AbortSignal
}

interface GeneratePartnerImageInput {
  profile: Profile
  signal?: AbortSignal
}

interface AnalyzeImageInput extends AskAiInput {
  file: File
}

export function aiIsConfigured(): boolean {
  return Boolean(API_URL)
}

export async function askAi({ profile, near, cycle, lines, text, intent = 'chat', signal }: AskAiInput): Promise<string> {
  if (!API_URL) throw new Error('AI er ikke konfigureret endnu')

  const messages = lines
    .filter((line) => line.from !== 'system')
    .slice(-16)
    .map((line) => ({
      role: line.from === 'ai' ? ('assistant' as const) : ('user' as const),
      content: line.text,
    }))

  messages.push({ role: 'user', content: text })
  const token = await getFirebaseAuth()?.currentUser?.getIdToken()

  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
    body: JSON.stringify({
      profile: {
        chatName: profile.chatName,
        role: profile.role,
        figure: profile.figure,
        look: profile.look,
        body: profile.body,
        skin: profile.skin,
        breasts: profile.breasts,
        penis: profile.penis,
        personality: profile.personality,
        customWish: profile.customWish,
        intensity: profile.intensity,
        nsfw: profile.nsfw,
        fetishes: profile.fetishes,
        equipment: profile.equipment,
        customEquipment: profile.customEquipment,
        limits: profile.limits,
      },
      state: { near, cycle },
      sceneId: profile.sceneId,
      intent,
      messages,
    }),
  })

  const data = (await response.json().catch(() => ({}))) as { reply?: unknown; error?: unknown }
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `AI-fejl (${response.status})`)
  }
  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('AI svarede uden tekst')
  }
  return data.reply.trim()
}

export async function generatePartnerImage({ profile, signal }: GeneratePartnerImageInput): Promise<string> {
  if (!API_URL) throw new Error('Billed-AI er ikke konfigureret endnu')
  const token = await getFirebaseAuth()?.currentUser?.getIdToken()
  const response = await fetch(`${API_URL}/image/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
    body: JSON.stringify({
      sceneId: profile.sceneId,
      profile: imageProfile(profile),
    }),
  })
  const data = (await response.json().catch(() => ({}))) as { imageUrl?: unknown; error?: unknown }
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Billedfejl (${response.status})`)
  }
  if (typeof data.imageUrl !== 'string' || !data.imageUrl.startsWith('data:image/')) {
    throw new Error('Billedmodellen svarede uden et billede')
  }
  return data.imageUrl
}

export async function analyzeImage({
  profile,
  near,
  cycle,
  lines,
  text,
  file,
  signal,
}: AnalyzeImageInput): Promise<string> {
  if (!API_URL) throw new Error('Billedanalyse er ikke konfigureret endnu')
  const imageDataUrl = await prepareImageDataUrl(file)
  const token = await getFirebaseAuth()?.currentUser?.getIdToken()
  const messages = lines
    .filter((line) => line.from !== 'system')
    .slice(-10)
    .map((line) => ({
      role: line.from === 'ai' ? ('assistant' as const) : ('user' as const),
      content: line.text,
    }))
  const response = await fetch(`${API_URL}/vision`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
    body: JSON.stringify({
      sceneId: profile.sceneId,
      profile: imageProfile(profile),
      state: { near, cycle },
      messages,
      prompt: text,
      imageDataUrl,
    }),
  })
  const data = (await response.json().catch(() => ({}))) as { reply?: unknown; error?: unknown }
  if (!response.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Billedanalyse-fejl (${response.status})`)
  }
  if (typeof data.reply !== 'string' || !data.reply.trim()) {
    throw new Error('AI kunne ikke aflæse billedet')
  }
  return data.reply.trim()
}

function imageProfile(profile: Profile) {
  return {
    chatName: profile.chatName,
    role: profile.role,
    figure: profile.figure,
    look: profile.look,
    body: profile.body,
    skin: profile.skin,
    breasts: profile.breasts,
    penis: profile.penis,
    personality: profile.personality,
    customWish: profile.customWish,
    intensity: profile.intensity,
    nsfw: profile.nsfw,
    fetishes: profile.fetishes,
    equipment: profile.equipment,
    customEquipment: profile.customEquipment,
    limits: profile.limits,
  }
}

async function prepareImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Vælg et billede')
  if (file.size > 20 * 1024 * 1024) throw new Error('Billedet må højst fylde 20 MB')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await loadImage(objectUrl)
    const maxSide = 1_600
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Telefonen kunne ikke klargøre billedet')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Billedet kunne ikke åbnes'))
    image.src = url
  })
}
