import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { FetishId, Profile } from '../types'
import { getFirebaseDb } from './firebase'
import { FETISH_META } from './persona'
import { DEFAULT_CONTENT_CATALOG, type ContentCatalog } from './contentCatalog'

export const AI_MODELS = [
  { id: 'venice-uncensored-role-play', title: 'Venice Role Play' },
  { id: 'venice-uncensored-1-2', title: 'Venice Uncensored 1.2' },
  { id: 'venice-uncensored', title: 'Venice Uncensored' },
  { id: 'gemma-4-uncensored', title: 'Gemma 4 Uncensored' },
  { id: 'llama-3.3-70b', title: 'Llama 3.3 70B' },
] as const

export const IMAGE_MODELS = [
  { id: 'grok-imagine-image', title: 'Grok Imagine Image' },
  { id: 'lustify-v8', title: 'Lustify v8' },
  { id: 'lustify-v7', title: 'Lustify v7' },
  { id: 'lustify-sdxl', title: 'Lustify SDXL' },
  { id: 'venice-sd35', title: 'Venice SD 3.5' },
  { id: 'wai-Illustrious', title: 'Anime (WAI)' },
  { id: 'chroma', title: 'Chroma' },
] as const

export const VISION_MODELS = [
  { id: 'mistral-31-24b', title: 'Venice Medium (vision)' },
  { id: 'qwen3-vl-235b-a22b', title: 'Qwen VL 235B' },
  { id: 'venice-uncensored-role-play', title: 'Role Play (hvis den tager billeder)' },
] as const

export interface ScenePreset {
  id: string
  order: number
  title: string
  blurb: string
  enabled: boolean
  textModel: string
  imageModel: string
  visionModel: string
  systemPrompt: string
  nsfwSystemPrompt: string
  plusSystemPrompt: string
  taskPrompt: string
  nsfwTaskPrompt: string
  plusTaskPrompt: string
  imagePrompt: string
  nsfwImagePrompt: string
  plusImagePrompt: string
  openingPrompt: string
  nsfwOpeningPrompt: string
  plusOpeningPrompt: string
  requiredFetish?: FetishId
}

const DEFAULT_TASK_PROMPT = 'Giv én konkret, kort og sikker opgave, som naturligt fortsætter den aktuelle samtale. Tilpas opgaven til scenen, intensiteten, brugerens grænser og det oplyste udstyr. Brug ikke udstyr, som ikke er angivet. Angiv et tydeligt mål og en foreslået varighed, men giv kun én opgave ad gangen.'
