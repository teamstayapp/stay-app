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

export type FetishId =
  | 'edge'
  | 'power'
  | 'aftercare'
  | 'cei'
  | 'milking'
  | 'joi'
  | 'chastity'
  | 'humiliation'
  | 'femdom'
  | 'anal'
  | 'worship'
  | 'roleskin'

export type Nearness = 'ok' | 'close' | 'too_much'
export type EquipmentId =
  | 'lube'
  | 'vibrator'
  | 'sleeve'
  | 'dildo'
  | 'plug'
  | 'strap_on'
  | 'soft_cuffs'
  | 'blindfold'
  | 'chastity'

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
  sceneId: string
  role: Role
  figure: Figure
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
  limits: Limits
  unlocked: FetishId[]
  plan: 'free' | 'solo' | 'plus'
  imagesLeft: number
  extraPacks: boolean
}

export interface Line {
  id: string
  from: 'ai' | 'you' | 'system'
  text: string
}
