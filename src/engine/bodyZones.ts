export type BodyView = 'front' | 'back'
export type BodyZoneId =
  | 'mouth'
  | 'neck'
  | 'chest'
  | 'belly'
  | 'groin'
  | 'thigh'
  | 'hand'
  | 'ass'

export interface BodyZone {
  id: BodyZoneId
  view: BodyView
  label: string
  x: number
  y: number
  w: number
  h: number
}

export const BODY_ZONES: BodyZone[] = [
  { id: 'mouth', view: 'front', label: 'Mund', x: 38, y: 14, w: 24, h: 10 },
  { id: 'neck', view: 'front', label: 'Hals', x: 40, y: 24, w: 20, h: 8 },
  { id: 'chest', view: 'front', label: 'Bryst', x: 28, y: 32, w: 44, h: 16 },
  { id: 'belly', view: 'front', label: 'Mave', x: 34, y: 48, w: 32, h: 12 },
  { id: 'groin', view: 'front', label: 'Skød', x: 36, y: 62, w: 28, h: 14 },
  { id: 'thigh', view: 'front', label: 'Lår', x: 28, y: 76, w: 44, h: 16 },
  { id: 'hand', view: 'front', label: 'Hånd', x: 6, y: 48, w: 18, h: 14 },
  { id: 'neck', view: 'back', label: 'Nakke', x: 38, y: 16, w: 24, h: 10 },
  { id: 'ass', view: 'back', label: 'Bagdel', x: 30, y: 52, w: 40, h: 18 },
  { id: 'thigh', view: 'back', label: 'Lår', x: 28, y: 72, w: 44, h: 18 },
]

export function touchUserLine(zone: BodyZone): string {
  return `*rører ved din ${zone.label.toLowerCase()}*`
}

export function localTouchReply(
  zone: BodyZoneId,
  figure: 'master' | 'mistress',
  nsfw: boolean,
  analSelected: boolean,
): string {
  if (!nsfw) {
    const soft: Record<BodyZoneId, string> = {
      mouth: 'Jeg møder din hånd med et blødt kys. Bliv lige dér.',
      neck: 'Jeg løfter hagen en smule og lader din hånd blive ved halsen.',
      chest: 'Jeg lægger min hånd over din på brystet. Roligt.',
      belly: 'Maven spændes let under din hånd. Langsomt.',
      groin: 'Jeg fanger din hånd over tøjet. Du får lov at mærke, ikke mere endnu.',
      thigh: 'Jeg lader din hånd hvile på låret og ser på dig.',
      hand: 'Mine fingre lukker om dine. Jeg holder dig et øjeblik.',
      ass: 'Jeg læner mig ind i din hånd, men tøjet bliver på.',
    }
    return soft[zone]
  }

  const anatomy = figure === 'master' ? 'pikken' : 'fissen'
  const direct: Record<BodyZoneId, string> = {
    mouth: 'Jeg åbner munden mod dine fingre og holder dit blik.',
    neck: 'Jeg løfter hagen. Kys halsen, men intet pres og ingen kvælning.',
    chest: figure === 'master'
      ? 'Jeg lægger hånden over din på brystkassen og trækker dig tættere.'
      : 'Jeg presser brystet roligt mod din hånd og lader dig mærke reaktionen.',
    belly: `Maven spændes under din hånd. Du må bevæge dig langsomt ned mod ${anatomy}, men vent på min tilladelse.`,
    groin: `Jeg fanger din hånd ved ${anatomy} og bestemmer tempoet. Langsomt.`,
    thigh: `Jeg lader hånden glide op ad inderlåret, tæt på ${anatomy}, og stopper dér.`,
    hand: 'Jeg vender hånden og fletter fingrene ind i dine. Jeg styrer næste bevægelse.',
    ass: analSelected
      ? 'Jeg læner mig ind i din hånd og lader dig blive ved bagdelen. Langsomt og kun så langt, som vi har aftalt.'
      : 'Jeg læner mig ind i din hånd. Du må røre bagdelen, men vi går ikke analt videre.',
  }
  return direct[zone]
}
