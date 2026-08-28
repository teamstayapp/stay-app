export type PlanId = 'free' | 'solo' | 'plus'
export type AddOnId = 'img50' | 'img150' | 'vision50' | 'vision200' | 'packs'

export interface Plan {
  id: PlanId
  title: string
  dkkMonth: number
  text: string
  images: number
  imageAnalyses: number
  packs: boolean
  nsfw: boolean
  blurb: string
}

export interface AddOn {
  id: AddOnId
  title: string
  dkk: number
  images?: number
  imageAnalyses?: number
  packs?: boolean
  blurb: string
}

/** Salgspris i DKK. Kost (Venice) er langt under — avance sidder i billeder. */
export const PLANS: Plan[] = [
  {
    id: 'free',
    title: 'Prøv',
    dkkMonth: 0,
    text: '50 beskeder / dag',
    images: 2,
    imageAnalyses: 5,
    packs: false,
    nsfw: false,
    blurb: 'Mærk appen. Ingen Fræk. To figurer.',
  },
  {
    id: 'solo',
    title: 'Solo',
    dkkMonth: 79,
    text: 'Åben chat',
    images: 25,
    imageAnalyses: 100,
    packs: false,
    nsfw: true,
    blurb: 'NSFW + edge. 25 figurer om måneden.',
  },
  {
    id: 'plus',
    title: 'Plus',
    dkkMonth: 149,
    text: 'Åben chat',
    images: 80,
    imageAnalyses: 300,
    packs: true,
    nsfw: true,
    blurb: 'Alle fetish-pakker. 80 figurer. Det I skal tjene på.',
  },
]

export const ADDONS: AddOn[] = [
  {
    id: 'img50',
    title: '+50 billeder',
    dkk: 49,
    images: 50,
    blurb: 'Løber du tør midt i måneden.',
  },
  {
    id: 'img150',
    title: '+150 billeder',
    dkk: 119,
    images: 150,
    blurb: 'Bedre stykkpris end +50.',
  },
  {
    id: 'vision50',
    title: '+50 billedanalyser',
    dkk: 19,
    imageAnalyses: 50,
    blurb: 'Til flere billeder sendt ind i chatten.',
  },
  {
    id: 'vision200',
    title: '+200 billedanalyser',
    dkk: 59,
    imageAnalyses: 200,
    blurb: 'Lavere pris pr. billedanalyse.',
  },
  {
    id: 'packs',
    title: 'Alle pakker',
    dkk: 39,
    packs: true,
    blurb: 'Kun hvis du sidder på Solo og vil have CEI m.m.',
  },
]

export function costHint(images: number) {
  const usd = images * 0.08
  const dkk = Math.round(usd * 6.8)
  return { usd, dkk }
}
