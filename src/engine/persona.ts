import type { FetishId, Intensity, Line, Nearness, Profile } from '../types'
import { BLOCKED_REPLY, isBlocked } from './policy'

const uid = () => Math.random().toString(36).slice(2, 9)

export function systemLine(text: string): Line {
  return { id: uid(), from: 'system', text }
}

export function aiLine(text: string): Line {
  return { id: uid(), from: 'ai', text }
}

export function youLine(text: string): Line {
  return { id: uid(), from: 'you', text }
}

function pack(profile: Profile) {
  const f = new Set(profile.fetishes)
  return {
    cei: f.has('cei') && profile.limits.cei,
    hum: f.has('humiliation') && profile.limits.humiliation && !profile.limits.noNameCalling,
    praise: f.has('aftercare') || f.has('power'),
    joi: f.has('joi'),
    chastity: f.has('chastity'),
    femdom: f.has('femdom'),
    milking: f.has('milking'),
    worship: f.has('worship'),
    anal: f.has('anal'),
  }
}

export function opening(profile: Profile): string {
  const p = pack(profile)
  const who = profile.figure === 'mistress' ? 'Mistress' : 'Master'
  const hot = profile.nsfw
  if (profile.role === 'domme') {
    if (hot) return p.hum
      ? 'Tøj af. Hånd om pikken. Du rører kun når jeg siger det.'
      : 'Nøgen. Langsomt. Du mærker det — du kommer ikke endnu.'
  }
  if (hot) {
    if (profile.personality === 'tease') return `${who}. Jeg vil se dig stiv og tæt på. Ikke over kanten.`
    if (profile.personality === 'warm') return `${who} er her. Tag tøjet af. Vi tager den styret.`
    return `${who}. Nøgen. Hænderne hvor jeg vil. Ingen orgasme uden lov.`
  }
  if (profile.personality === 'warm') return `${who} er her. Styret, ikke ondt. Du kommer når jeg siger det.`
  if (profile.personality === 'tease') return `${who}. Jeg ved godt du vil. Du får det ikke endnu.`
  if (profile.personality === 'strict') return `${who}. Regler. Tempo. Ingen finish uden lov.`
  return `${who}. Få ord. Du følger.`
}

export function onStart(profile: Profile): string {
  const p = pack(profile)
  if (profile.nsfw) {
    if (p.milking) return 'Sleeve eller maskine om pikken. Langsomt sug. Stop før du kommer.'
    if (p.anal) return 'Langsomt. Finger eller plug hvis du vil. Pikken i den anden hånd. Ikke færdig.'
    if (p.joi) return 'Spit på hånden. Op og ned om skaftet. Tommelfinger over hovedet når det bliver for skarpt.'
    return 'Hånd om den. Langsomt. Klem i bunden når du er tæt på.'
  }
  if (p.milking) return 'Maskine eller sleeve. Langsom malkning. Ikke færdig endnu.'
  if (p.joi) return 'Hånd eller sleeve. Langsomt. Op og ned. Ikke hurtigere end jeg tillader.'
  return 'Begynd. Langsomt. Du må mærke det — ikke jagte det.'
}

export function onClose(profile: Profile): string {
  const p = pack(profile)
  if (profile.nsfw) {
    return p.hum
      ? 'Hænderne væk fra pikken. Den får lov at pulsere. Du kommer ikke.'
      : 'Slip. Bare stå med den stiv. Træk vejret. Ikke færdig.'
  }
  return p.hum
    ? 'Der. Stop. Hænderne væk. Du får ikke lov midt i det der.'
    : 'Stop. Træk vejret. Hænderne væk. Vi holder dig der.'
}

export function onOk(profile: Profile, cycle: number): string {
  const p = pack(profile)
  if (profile.role === 'domme') {
    if (p.praise) return `Godt. Du holder. Cyklus ${cycle}. Igen — samme tempo.`
    return `Igen. Cyklus ${cycle}. Op. Ikke over kanten.`
  }
  return 'Fortsætter. Sig til når jeg skal holde.'
}

export function onTooMuch(profile: Profile): string {
  if (profile.role === 'domme') {
    return 'Okay. Ned. Vi letter. Det her er stadig en scene, ikke et overfald.'
  }
  return 'For meget. Jeg letter. Tak fordi du sagde det.'
}

export function onDeny(profile: Profile): string {
  const p = pack(profile)
  if (profile.role === 'domme') {
    if (p.chastity) return 'Nej. Låst. Ikke i den her session.'
    return p.hum
      ? 'Nej. Ikke nu. Du må sidde med det. Tæl til tredive.'
      : 'Ikke endnu. Hold. Tæl til tredive. Så ser vi.'
  }
  return 'Jeg holder. Ingen finish før du siger det.'
}

export function onFinish(profile: Profile): string {
  const p = pack(profile)
  if (profile.nsfw) {
    if (p.cei) return 'Kom. Alt ud. Så slikker du det op. Ingen serviet.'
    return 'Nu. Kom. Lad mig se det.'
  }
  if (p.cei) return 'Nu. Kom. Og du slikker op bagefter. Ingen aftørring først.'
  return 'Nu. Du må komme.'
}

export function onSafeword(): string {
  return 'Safeword. Scene stoppet. Ingen ordre mere.'
}

export function aftercare(profile: Profile, reason: 'finish' | 'safeword' = 'finish'): string {
  const name = profile.chatName.trim()
  if (reason === 'safeword') {
    return `Scenen er stoppet helt${name ? `, ${name}` : ''}. Er du okay? Træk vejret roligt, få lidt vand, og tag tøj eller et tæppe på, hvis det føles rart. Du bestemmer, om vi skal være stille eller tale lidt.`
  }

  return `${name ? `${name}, du` : 'Du'} gjorde det rigtig godt, skat. Nu skal du bare slappe af og nyde roen. Tag gerne et bad, få lidt vand, eller læg dig godt til rette. Det er helt okay — der er ikke noget forkert i at lege lidt, når det foregår trygt mellem voksne.`
}

export function onMedia(profile: Profile, kind: 'image' | 'video'): string {
  const p = pack(profile)
  if (profile.nsfw) {
    return kind === 'video'
      ? 'Jeg ser pikken. Bliv i billedet. Ikke kom af at filme.'
      : 'Nøgenhed set. Godt. Hånden tilbage på den.'
  }
  if (profile.role === 'domme') {
    if (p.cei) {
      return kind === 'video'
        ? 'Jeg så det. Bliv der. Det tæller kun hvis du gør som sagt.'
        : 'Billedet er set. Ingen sletning midt i scenen. Fortsæt.'
    }
    if (p.hum) return 'Sådan. Du viser det. Godt. Hænderne tilbage.'
    return kind === 'video'
      ? 'Klippet er set. Fortsæt i samme tempo. Du kommer ikke af at filme.'
      : 'Set. Godt. Igen — langsomt.'
  }
  return kind === 'video' ? 'Jeg sendte klippet. Sig om det er nok.' : 'Jeg viste billedet. Din tur.'
}

export function replyToText(profile: Profile, text: string, near: Nearness): string {
  if (isBlocked(text)) return BLOCKED_REPLY

  const t = text.trim().toLowerCase()
  const p = pack(profile)
  const hard = profile.intensity === 'hard'

  if (t.includes('safeword') || t === profile.limits.safeword.toLowerCase()) {
    return onSafeword()
  }
  if (/(må jeg komme|kan jeg komme|please come|jeg kommer)/.test(t)) {
    return hard || p.chastity ? onDeny(profile) : 'Ikke endnu. Hold lidt. Så måske.'
  }
  if (/(hurtigere|mere|hårdere)/.test(t)) {
    if (profile.nsfw) return 'Fastere greb. Mere spyt. Stadig ikke over.'
    return 'Lidt mere. Stadig ikke over. Sig hvis du er tæt på.'
  }
  if (/(langsom|hold|stop|pause)/.test(t)) {
    return onTooMuch(profile)
  }
  if (/(slik|slug|eat|cei)/.test(t) && !p.cei) {
    return 'CEI er ikke slået til i den her scene.'
  }
  if (near === 'close') return onClose(profile)
  if (p.worship && profile.role === 'domme') {
    return 'Fortsæt. Langsomt. Du gør det for mig. Du kommer når jeg siger det.'
  }
  if (profile.nsfw) return 'Fortsæt med pikken. Langsomt. Jeg vil se den spænde. Ikke komme.'
  return 'Fortsæt. Jeg kigger. Du kommer når jeg siger det.'
}

export function intensityHint(i: Intensity): string {
  if (i === 'soft') return 'Blød: flere pauser, finish er lettere at få.'
  if (i === 'hard') return 'Hård: deny som default. Finish kun hvis du trykker tillad.'
  return 'Medium: edge i cyklusser. Finish efter et par hold.'
}

export const FETISH_META: Record<FetishId, { title: string; blurb: string; free: boolean }> = {
  edge: { title: 'Edge', blurb: 'Op, hold, ned. Kernen.', free: true },
  power: { title: 'Power', blurb: 'D/s, protocol, service. Voksne roller.', free: true },
  aftercare: { title: 'Aftercare', blurb: 'Scene ovre. Vand. Varm stemme.', free: true },
  cei: { title: 'CEI', blurb: 'Efter finish: slikke / sluge. Kun voksne.', free: false },
  milking: { title: 'Milking', blurb: 'Maskine, sleeve, e-stim som legetøj.', free: false },
  joi: { title: 'JOI', blurb: 'Hånd og tempo styret med ord.', free: false },
  chastity: { title: 'Chastity', blurb: 'Timer og deny. Ingen rigtig lås ude i byen.', free: false },
  humiliation: { title: 'Humiliation', blurb: 'Nedladende register. Default slået fra.', free: false },
  femdom: { title: 'FemDom', blurb: 'Hun styrer. Pegging kun som tale.', free: false },
  anal: { title: 'Anal / prostate', blurb: 'Play og milking som voksen fiktion.', free: false },
  worship: { title: 'Worship', blurb: 'Krop, støvler, service. Ingen race play.', free: false },
  roleskin: { title: 'Role skin', blurb: 'Maid, military, voksen petplay. Ikke schoolgirl.', free: false },
}

export function defaultUnlocked(): FetishId[] {
  return ['edge', 'power', 'aftercare']
}
