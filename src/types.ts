export type Role = 'domme' | 'slave'
export type Figure = 'master' | 'mistress'
export type Look = 'clothed' | 'fetish' | 'nsfw'
export type Body = 'slim' | 'athletic' | 'solid'
export type Skin = 'light' | 'olive' | 'brown' | 'dark'
export type Breasts = 'small' | 'medium' | 'large'
export type Penis = 'average' | 'large' | 'very_large'
export type Personality = 'warm' | 'cold' | 'tease' | 'strict'
export type Intensity = 'soft' | 'medium' | 'hard'
export type Phase = 'age' | 'login' | 'admin' | 'rules' | 'setup' | 'pay' | 'session' | 'aftercare' | 'decoy'
export type PrivacyMode = 'private' | 'device'
export type NotificationStyle = 'discreet' | 'explicit'
export type UserAnatomy = 'penis' | 'vulva'

export type FetishId = string

export type Nearness = 'ok' | 'close' | 'too_much'
export type EquipmentId = string

export interface Limits {
  safeword: string
  cei: boolean
  humiliation: boolean
  noNameCalling: boolean
}

export interface Profile {
  chatName: string
  partnerImageUrl?: string
  privacyMode: PrivacyMode
  notificationStyle: NotificationStyle
  sceneId: string
  role: Role
  figure: Figure
  userAnatomy: UserAnatomy
  look: Look
  body: Body
  skin: Skin
  breasts: Breasts
  penis: Penis
  personality: Personality
  customWish: string
  nsfw: boolean
  intensity: Intensity
  fetishes: FetishId[]
  equipment: EquipmentId[]
  customEquipment: string
  fetishLabels?: string[]
  equipmentLabels?: string[]
  equipmentEntries?: Array<{ id: string; label: string }>
  catalogPrompt?: string
  limits: Limits
  unlocked: FetishId[]
  plan: 'free' | 'solo' | 'plus'
  extraPacks: boolean
}

export interface Line {
  id: string
  from: 'ai' | 'you' | 'system'
  text: string
}
