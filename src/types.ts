export type Role = 'domme' | 'slave'
export type PlayMode = 'oneway' | 'mutual'
export type CockPreset = 'none' | 'bbc' | 'bwc'
export type Figure = 'master' | 'mistress'
export type Look = 'clothed' | 'fetish' | 'nsfw'
export type ImagePose =
  | 'portrait'
  | 'kneel_harness'
  | 'lace_rear'
  | 'futa_harness'
  | 'gyn_empty'
  | 'gyn_stirrups'
  | 'gyn_plug'
  | 'gyn_gloves'
  | 'gyn_strap'
  | 'gyn_frue'
  | 'gyn_speculum'
  | 'gyn_sfw'
export type Body = 'slim' | 'athletic' | 'solid'
export type Skin = 'light' | 'olive' | 'brown' | 'dark'
export type Breasts = 'small' | 'medium' | 'large'
export type Penis = 'average' | 'large' | 'very_large'
export type HairColor = 'blonde' | 'brown' | 'black' | 'red' | 'dark' | 'grey'
export type HairLength = 'short' | 'shoulder' | 'long' | 'bun' | 'messy'
export type HairStyle = 'bun' | 'messy'
export type EyeColor = 'brown' | 'green' | 'blue' | 'grey'
export type Makeup = 'none' | 'soft' | 'heavy' | 'smudged'
export type FacialHair = 'none' | 'stubble' | 'beard'
export type AssSize = 'small' | 'round' | 'large'
export type HipSize = 'narrow' | 'soft' | 'wide'
export type PubicStyle = 'shaved' | 'trimmed' | 'natural'
export type ProfessionId =
  | 'none'
  | 'doctor'
  | 'nurse'
  | 'teacher'
  | 'secretary'
  | 'police'
  | 'lawyer'
  | 'boss'
  | 'bartender'
  | 'trainer'
  | 'flight'
  | 'maid'
  | 'mechanic'
  | 'firefighter'
  | 'soldier'
  | 'chef'
  | 'librarian'
  | 'photographer'
  | 'pilot'
  | 'paramedic'
  | 'milf'
export type Personality = 'warm' | 'cold' | 'tease' | 'strict'
export type Intensity = 'soft' | 'medium' | 'hard'
export type Phase = 'age' | 'login' | 'admin' | 'rules' | 'home' | 'setup' | 'pay' | 'session' | 'aftercare' | 'decoy'
export type PrivacyMode = 'private' | 'device'
export type NotificationStyle = 'discreet' | 'explicit'
export type UserAnatomy = 'penis' | 'vulva'
export type UserGender = 'woman' | 'man' | 'nonbinary' | 'unset'
export type Attraction = 'women' | 'men' | 'both' | 'switch'

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
  partnerName: string
  partnerImageUrl?: string
  privacyMode: PrivacyMode
  notificationStyle: NotificationStyle
  sceneId: string
  role: Role
  playMode: PlayMode
  figure: Figure
  userAnatomy: UserAnatomy
  userGender: UserGender
  attraction: Attraction
  partnerAge: number
  cockPreset: CockPreset
  likeWords: string
  banWords: string
  look: Look
  imagePose: ImagePose
  profession: ProfessionId
  body: Body
  skin: Skin
  breasts: Breasts
  penis: Penis
  hairColor: HairColor
  hairLength: HairLength
  hairStyles?: HairStyle[]
  eyes: EyeColor
  makeup: Makeup
  facialHair: FacialHair
  ass: AssSize
  hips: HipSize
  pubic: PubicStyle
  freckles: boolean
  tattoos: boolean
  wet: boolean
  lookWish: string
  personality: Personality
  customWish: string
  memoryNotes: string
  lastMemory: string
  nsfw: boolean
  intensity: Intensity
  fetishes: FetishId[]
  equipment: EquipmentId[]
  customEquipment: string
  fetishLabels?: string[]
  equipmentLabels?: string[]
  equipmentEntries?: Array<{ id: string; label: string }>
  catalogPrompt?: string
  spicyLexicon?: string
  spicyMinus?: string
  limits: Limits
  unlocked: FetishId[]
  plan: 'free' | 'solo' | 'plus'
  extraPacks: boolean
  lingerieUser: string[]
  lingeriePartner: string[]
  liveStatusText?: string
  workMode?: boolean
  orgasmLockText?: string
}

export interface Line {
  id: string
  from: 'ai' | 'you' | 'system'
  text: string
  imageUrl?: string
}
