import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { FetishId, Profile } from '../types'
import { getFirebaseDb } from './firebase'
import { FETISH_META } from './persona'

export const AI_MODELS = [
  { id: 'venice-uncensored-role-play', title: 'Venice Role Play' },
  { id: 'venice-uncensored-1-2', title: 'Venice Uncensored 1.2' },
] as const

export const IMAGE_MODELS = [
  { id: 'grok-imagine-image', title: 'Grok Imagine Image' },
  { id: 'lustify-v8', title: 'Lustify v8' },
  { id: 'venice-sd35', title: 'Venice SD 3.5' },
] as const

export interface ScenePreset {
  id: string
  order: number
  title: string
  blurb: string
  enabled: boolean
  textModel: string
  imageModel: string
  systemPrompt: string
  taskPrompt: string
  imagePrompt: string
  openingPrompt: string
  requiredFetish?: FetishId
}

const DEFAULT_TASK_PROMPT = 'Giv én konkret, kort og sikker opgave, som naturligt fortsætter den aktuelle samtale. Tilpas opgaven til scenen, intensiteten, brugerens grænser og det oplyste udstyr. Brug ikke udstyr, som ikke er angivet. Angiv et tydeligt mål og en foreslået varighed, men giv kun én opgave ad gangen.'

const baseScenes: Omit<ScenePreset, 'order' | 'taskPrompt'>[] = [
  {
    id: 'soft-care', title: 'Blød og omsorgsfuld', blurb: 'Rolig styring, tryghed og plads til pauser.',
    enabled: true, textModel: 'venice-uncensored-role-play', imageModel: 'grok-imagine-image',
    systemPrompt: 'Vær varm, rolig og omsorgsfuld. Tjek naturligt ind og respekter pauser uden at bryde rollen.',
    imagePrompt: 'Warm, intimate, soft lighting, calm expression, fictional adult character.',
    openingPrompt: 'Vi tager det roligt. Du bestemmer tempoet, og du kan altid sige stop.',
  },
  {
    id: 'strict-control', title: 'Streng og kontrollerende', blurb: 'Korte beskeder, klare regler og fast styring.',
    enabled: true, textModel: 'venice-uncensored-role-play', imageModel: 'grok-imagine-image',
    systemPrompt: 'Vær streng, præcis og kontrollerende med korte beskeder. Respekter altid safeword og valgte grænser.',
    imagePrompt: 'Confident fictional adult character, strong posture, dramatic controlled lighting.',
    openingPrompt: 'Fra nu af følger du mine beskeder. Kort, præcist og uden at skynde dig.',
  },
  {
    id: 'playful-challenge', title: 'Drilsk og udfordrende', blurb: 'Legende provokation og små udfordringer.',
    enabled: true, textModel: 'venice-uncensored-role-play', imageModel: 'grok-imagine-image',
    systemPrompt: 'Vær drilsk, legende og udfordrende. Brug humor og spænding, men respekter grænser og nej.',
    imagePrompt: 'Playful fictional adult character, teasing expression, cinematic colorful lighting.',
    openingPrompt: 'Lad os se, hvor god du er til at følge med, når jeg gør det lidt sværere.',
  },
  {
    id: 'edge-denial', title: 'Edge og denial', blurb: 'Opbygning, stop og kontrollerede cyklusser.',
    enabled: true, textModel: 'venice-uncensored-role-play', imageModel: 'venice-sd35',
    systemPrompt: 'Fokusér på edge, denial, tempo og kontrollerede cyklusser. Hold styr på brugerens aktuelle tilstand.',
    imagePrompt: 'Fictional adult character, intense eye contact, dark warm cinematic lighting.',
    openingPrompt: 'Vi bygger langsomt op. Du stopper, når jeg siger det, og fortæller mig, når du er tæt på.',
    requiredFetish: 'edge',
  },
  {
    id: 'free-chat', title: 'Fri samtale', blurb: 'Åben dialog inden for de valgte temaer og grænser.',
    enabled: true, textModel: 'venice-uncensored-1-2', imageModel: 'grok-imagine-image',
    systemPrompt: 'Før en naturlig og åben samtale. Følg brugerens retning uden at opfinde temaer, som ikke er valgt.',
    imagePrompt: 'Natural portrait of a fictional adult character, tasteful cinematic light.',
    openingPrompt: 'Hvad har du lyst til at udforske i dag?',
  },
]

const fetishPrompt: Record<FetishId, string> = {
  edge: 'Fokusér på kontrolleret opbygning, stop og gentagelser.',
  power: 'Fokusér på tydelige voksne roller, aftalte regler og service.',
  aftercare: 'Fokusér på ro, omsorg, nedtrapning og tryghed.',
  cei: 'Fokusér kun på det valgte CEI-tema mellem samtykkende voksne.',
  milking: 'Fokusér på det valgte milking-tema som voksen fiktion og undgå farlige instruktioner.',
  joi: 'Fokusér på verbal, voksen og samtykkende instruktion inden for brugerens grænser.',
  chastity: 'Fokusér på denial, timer og aftalt kontrol uden virkelige risikable situationer.',
  humiliation: 'Brug kun den valgte grad af voksen humiliation og respekter forbuddet mod øgenavne.',
  femdom: 'Fokusér på en voksen femdom-dynamik med tydelig kontrol og samtykke.',
  anal: 'Hold dig til det valgte voksne anal/prostate-tema uden farlige eller medicinske instruktioner.',
  worship: 'Fokusér på voksen worship, service og beundring.',
  roleskin: 'Brug kun tydeligt voksne rolletemaer og aldrig barnlige eller mindreårige roller.',
}

const extraScenes: Omit<ScenePreset, 'order' | 'taskPrompt'>[] = (Object.keys(FETISH_META) as FetishId[])
  .filter((id) => !['edge', 'aftercare'].includes(id))
  .map((id) => ({
    id: `fetish-${id}`, title: FETISH_META[id].title, blurb: FETISH_META[id].blurb,
    enabled: true, textModel: 'venice-uncensored-role-play', imageModel: 'venice-sd35',
    systemPrompt: fetishPrompt[id],
    imagePrompt: `Fictional adult character, ${FETISH_META[id].title} theme, cinematic portrait.`,
    openingPrompt: `Du har valgt ${FETISH_META[id].title}. Vi holder os til dine valgte grænser og dit safeword.`,
    requiredFetish: id,
  }))

export const DEFAULT_SCENES: ScenePreset[] = [...baseScenes, ...extraScenes]
  .map((scene, order) => ({ ...scene, taskPrompt: DEFAULT_TASK_PROMPT, order }))

function normalize(value: Partial<ScenePreset>, fallback: ScenePreset): ScenePreset {
  const imageModel = IMAGE_MODELS.some((model) => model.id === value.imageModel)
    ? value.imageModel!
    : fallback.imageModel
  return {
    ...fallback,
    ...value,
    id: fallback.id,
    order: typeof value.order === 'number' ? value.order : fallback.order,
    imageModel,
  }
}

export function observeScenes(callback: (scenes: ScenePreset[]) => void): () => void {
  const db = getFirebaseDb()
  if (!db) {
    callback(structuredClone(DEFAULT_SCENES))
    return () => undefined
  }
  return onSnapshot(
    collection(db, 'scenePresets'),
    (snapshot) => {
      if (snapshot.empty) {
        callback(structuredClone(DEFAULT_SCENES))
        return
      }
      const remote = new Map(snapshot.docs.map((item) => [item.id, item.data() as Partial<ScenePreset>]))
      callback(
        DEFAULT_SCENES.map((fallback) => normalize(remote.get(fallback.id) ?? {}, fallback))
          .sort((a, b) => a.order - b.order),
      )
    },
    () => callback(structuredClone(DEFAULT_SCENES)),
  )
}

export async function publishScenes(scenes: ScenePreset[]): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase/Firestore er ikke konfigureret.')
  await Promise.all(scenes.map((scene) => setDoc(doc(db, 'scenePresets', scene.id), scene)))
}

export function availableScenes(scenes: ScenePreset[], profile: Profile): ScenePreset[] {
  return scenes.filter((scene) => {
    if (!scene.enabled) return false
    if (!scene.requiredFetish) return true
    const unlocked = profile.unlocked.includes(scene.requiredFetish) || FETISH_META[scene.requiredFetish].free
    return unlocked && profile.fetishes.includes(scene.requiredFetish)
  })
}
