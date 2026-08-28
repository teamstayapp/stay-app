import type { Line, Nearness, Profile } from '../types'
import { getFirebaseAuth } from './firebase'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '')

interface AskAiInput {
  profile: Profile
  near: Nearness
  cycle: number
  lines: Line[]
  text: string
  signal?: AbortSignal
}

export function aiIsConfigured(): boolean {
  return Boolean(API_URL)
}

export async function askAi({ profile, near, cycle, lines, text, signal }: AskAiInput): Promise<string> {
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
