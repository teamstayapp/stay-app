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
  { id: 'mouth', view: 'front', label: 'Mund', x: 43, y: 6.5, w: 14, h: 4.5 },
  { id: 'neck', view: 'front', label: 'Hals', x: 42, y: 12, w: 16, h: 4.5 },
  { id: 'chest', view: 'front', label: 'Bryster', x: 33, y: 20, w: 34, h: 10 },
  { id: 'belly', view: 'front', label: 'Mave', x: 38, y: 32, w: 24, h: 8 },
  { id: 'groin', view: 'front', label: 'Pik / fisse', x: 41, y: 42, w: 18, h: 8 },
  { id: 'hand', view: 'front', label: 'Hånd', x: 6, y: 40, w: 16, h: 10 },
  { id: 'thigh', view: 'front', label: 'Lår', x: 32, y: 52, w: 36, h: 20 },
  { id: 'neck', view: 'back', label: 'Nakke', x: 40, y: 10, w: 20, h: 6 },
  { id: 'ass', view: 'back', label: 'Røv', x: 36, y: 39, w: 28, h: 12 },
  { id: 'thigh', view: 'back', label: 'Lår', x: 32, y: 53, w: 36, h: 20 },
]

export function bodyMapSrc(figure: 'master' | 'mistress', view: BodyView): string {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}bodies/${figure}-${view}.png`
}

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
    mouth: 'Jeg åbner munden. To fingre ind. Sut. Se på mig mens du gør det.',
    neck: 'Kys halsen. Bid let. Ikke pres, ingen kvælning — bare munden på huden.',
    chest: figure === 'master'
      ? 'Fingrene over brystet. Klem vorterne. Jeg trækker dig tættere.'
      : 'Klem om brysterne. Vorterne er hårde. Slik hvis du vil. Jeg bestemmer tempoet.',
    belly: `Maven spændes. Glid ned. Stop lige over ${anatomy} og vent.`,
    groin: figure === 'master'
      ? 'Hånd om pikken. Langsomt op og ned. Tommel over hovedet. Du kommer ikke endnu.'
      : 'Fingre på fissen. Cirkler om klitten. To fingre indenfor hvis jeg siger det. Våd. Ikke færdig.',
    thigh: `Hånden op ad inderlåret. Så tæt på ${anatomy} at du kan mærke varmen. Stop dér.`,
    hand: 'Jeg tager din hånd og fører den hen hvor jeg vil have den. Nu.',
    ass: analSelected
      ? 'Klem om røven. En finger langsomt, kun så langt vi har aftalt.'
      : 'Klem om røven. Du må røre — ikke analt videre i den her scene.',
  }
  return direct[zone]
}
