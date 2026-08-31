import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { PlanId } from './plans'
import { getFirebaseDb } from './firebase'

const CATALOG_VERSION = 5

export interface ContentOption {
  id: string
  order: number
  title: string
  blurb: string
  prompt: string
  group: string
  enabled: boolean
  free: boolean
  minimumPlan: PlanId
}

export interface ContentCatalog {
  version: number
  equipment: ContentOption[]
  fetishes: ContentOption[]
  words: ContentOption[]
  wordsMinus: ContentOption[]
}

type EquipmentSeed = [id: string, title: string, group: string, minimumPlan: PlanId, prompt?: string]

const equipmentSeeds: EquipmentSeed[] = [
  ['lube', 'Glidecreme', 'Kerne', 'free'],
  ['condom', 'Kondom', 'Krop og sikring', 'free', 'kondom; neutralt og uden skam'],
  ['vibrator', 'Vibrator', 'Vibrator og maskine', 'free'],
  ['dildo', 'Dildo', 'Dildo og røv', 'free'],
  ['sleeve', 'Sleeve', 'Pik og milking', 'solo'],
  ['plug', 'Plug', 'Dildo og røv', 'solo'],
  ['strap_on', 'Strap-on', 'Dildo og røv', 'solo'],
  ['soft_cuffs', 'Bløde manchetter', 'Bondage light', 'solo', 'bløde, aftalte manchetter; ingen farlig binding-how-to'],
  ['blindfold', 'Bind for øjnene', 'Bondage light', 'solo'],
  ['chastity', 'Bur til pikken', 'Bondage light', 'solo', 'kyskhedsbur som aftalt voksenleg; ingen rigtig lås ude i byen'],
  ['wand', 'Tryllestav / wand', 'Vibrator og maskine', 'solo'],
  ['e_stim', 'E-stim', 'Vibrator og maskine', 'solo', 'færdigt e-stim-legetøj; aldrig DIY eller strøm-guide'],
  ['vibrating_plug', 'Vibrator-plug', 'Vibrator og maskine', 'solo'],
  ['slim_plug', 'Tynd plug', 'Dildo og røv', 'solo'],
  ['thick_plug', 'Tyk plug', 'Dildo og røv', 'solo'],
  ['tail_plug', 'Hale-plug', 'Dildo og røv', 'solo'],
  ['collar', 'Halsbånd', 'Bondage light', 'solo'],
  ['dental_dam', 'Dental dam', 'Krop og sikring', 'plus', 'dental dam som neutral oral-sikring'],
  ['gloves', 'Handsker', 'Krop og sikring', 'plus'],
  ['towel', 'Håndklæde', 'Krop og sikring', 'plus'],
  ['bullet', 'Mini-vibrator', 'Vibrator og maskine', 'plus'],
  ['remote_vibe', 'Fjernbetjent vibrator', 'Vibrator og maskine', 'plus'],
  ['vibrating_egg', 'Vibrator-æg', 'Vibrator og maskine', 'plus'],
  ['suction_vibe', 'Sugevibrator', 'Vibrator og maskine', 'plus'],
  ['thrusting_toy', 'Stødende legetøj', 'Vibrator og maskine', 'plus'],
  ['fuckmachine', 'Sexmaskine', 'Vibrator og maskine', 'plus'],
  ['cock_ring', 'Pikring', 'Pik og milking', 'plus'],
  ['vibrating_ring', 'Vibratorring', 'Pik og milking', 'plus'],
  ['stroker', 'Stroker', 'Pik og milking', 'plus'],
  ['pump', 'Pumpe', 'Pik og milking', 'plus', 'pumpe som færdigt voksenlegetøj; ingen medicinske løfter'],
  ['milking_sleeve', 'Milking-sleeve', 'Pik og milking', 'plus'],
  ['beads_shaft', 'Kugler til skaft', 'Pik og milking', 'plus'],
  ['anal_beads', 'Anal kugler', 'Dildo og røv', 'plus'],
  ['prostate', 'Prostata / røv', 'Dildo og røv', 'plus'],
  ['double_dildo', 'Dobbelt dildo', 'Dildo og røv', 'plus'],
  ['nipple_clamps', 'Patterklemme', 'Patter og hud', 'plus'],
  ['suction_cups', 'Sugekopper', 'Patter og hud', 'plus'],
  ['ice', 'Is', 'Patter og hud', 'plus'],
  ['feather', 'Fjer / kilder', 'Patter og hud', 'plus'],
  ['massage_oil', 'Massageolie', 'Patter og hud', 'plus'],
  ['wax_low', 'Lavtemperatur-voks', 'Patter og hud', 'plus', 'mærkevare-lavtemperatur-voks; ingen ild-guide'],
  ['leash', 'Snor', 'Bondage light', 'plus'],
  ['gag_soft', 'Blød bid', 'Bondage light', 'plus', 'blød, aftalt bid; ingen farlig binding-how-to'],
  ['rope_soft', 'Blødt reb', 'Bondage light', 'plus', 'blødt, aftalt reb i fantasi; ingen farlig binding-how-to'],
  ['tape', 'Bondage-tape', 'Bondage light', 'plus'],
  ['spreader', 'Spredestang', 'Bondage light', 'plus', 'aftalt spredestang i fantasi; ingen farlig binding-how-to'],
  ['paddle', 'Paddle', 'Bondage light', 'plus'],
  ['flogger_soft', 'Blød flogger', 'Bondage light', 'plus'],
  ['crop', 'Ridepisk (let)', 'Bondage light', 'plus'],
  ['hood_soft', 'Blød hætte', 'Bondage light', 'plus', 'blød hætte; aldrig åndedrætsbegrænsning'],
  ['earplugs', 'Ørepropper', 'Bondage light', 'plus'],
  ['harness', 'Sele / harness', 'Tøj og fetish', 'plus'],
  ['stockings', 'Strømper', 'Tøj og fetish', 'plus'],
  ['heels', 'Høje hæle', 'Tøj og fetish', 'plus'],
  ['latex_wear', 'Latex', 'Tøj og fetish', 'plus'],
  ['leather_wear', 'Læder', 'Tøj og fetish', 'plus'],
  ['gloves_fetish', 'Fetish-handsker', 'Tøj og fetish', 'plus'],
  ['maid_outfit', 'Maid-outfit (voksen)', 'Tøj og fetish', 'plus', 'maid-outfit på en tydeligt voksen figur; aldrig schoolgirl'],
  ['jock', 'Jockstrap', 'Tøj og fetish', 'plus'],
  ['panties', 'Trusser', 'Tøj og fetish', 'plus'],
  ['lipstick', 'Læbestift', 'Tøj og fetish', 'plus'],
  ['thong', 'G-streng', 'Lingeri', 'free'],
  ['bra', 'BH', 'Lingeri', 'free'],
  ['babydoll', 'Babydoll', 'Lingeri', 'solo'],
  ['corset', 'Korset', 'Lingeri', 'solo'],
  ['garter', 'Hofteholder', 'Lingeri', 'solo'],
  ['cage_panties', 'Åbne trusser', 'Lingeri', 'plus'],
  ['sissy_dress', 'Sissy-kjole', 'Sissy', 'plus', 'voksen sissy-kjole, 25+'],
  ['sissy_wig', 'Paryk', 'Sissy', 'plus'],
  ['choker', 'Choker', 'Lingeri', 'solo'],
  ['paw_gloves', 'Pote-handsker', 'Pet og worship', 'plus', 'voksen petplay uden barnesprog'],
  ['kneepads', 'Knæbeskyttere', 'Pet og worship', 'plus'],
  ['bowl', 'Skål', 'Pet og worship', 'plus', 'voksen petplay uden barnesprog'],
  ['worship_pillow', 'Knælepude', 'Pet og worship', 'plus'],
]

const equipment = equipmentSeeds.map(([id, title, group, minimumPlan, prompt], order): ContentOption => ({
  id,
  title,
  group,
  minimumPlan,
  prompt: prompt || title.toLowerCase(),
  blurb: '',
  enabled: true,
  free: minimumPlan === 'free',
  order,
}))

const defaultWords: ContentOption[] = [
  ['pik', 'penis'],
  ['kuk', 'pik — brug helst pik'],
  ['stiv', 'erektion'],
  ['skaft', 'pikskaft'],
  ['hoved', 'pikhoved'],
  ['pung', 'pung'],
  ['kugler', 'testikler'],
  ['pre-cum', 'forhudsvæske'],
  ['sæd', 'udløsning'],
  ['sperm', 'sæd'],
  ['sprøjt', 'udløsning fra pik'],
  ['komme', 'orgasme'],
  ['udløsning', 'orgasme med sæd'],
  ['tømme', 'komme færdigt'],
  ['fisse', 'vagina/vulva'],
  ['kusse', 'fisse'],
  ['klit', 'klitoris'],
  ['skede', 'inderst i fissen — brug helst fisse'],
  ['læber', 'kønslæber'],
  ['våd', 'ophidset fisse'],
  ['dryppe', 'våd og lækkende'],
  ['glat', 'barberet skød'],
  ['busk', 'kønshår'],
  ['skød', 'mellem benene'],
  ['hul', 'fisse eller røv efter kontekst'],
  ['bryster', 'bryster'],
  ['patter', 'bryster, frækt'],
  ['vorter', 'brystvorter'],
  ['hårde vorter', 'stive brystvorter'],
  ['udspændt', 'stramme bryster eller røv'],
  ['røv', 'bagdel/anus-område'],
  ['baller', 'baller'],
  ['sprække', 'rille ved røv eller fisse'],
  ['navle', 'navle'],
  ['lår', 'lår'],
  ['inderlår', 'inderlår'],
  ['hofter', 'hofter'],
  ['hals', 'hals'],
  ['nakke', 'nakke'],
  ['mund', 'mund'],
  ['læberne', 'mundlæber'],
  ['tunge', 'tunge'],
  ['svælg', 'svælg'],
  ['savl', 'spyt der løber'],
  ['spyt', 'spyt'],
  ['kys', 'kys'],
  ['bid', 'let bid'],
  ['sutte', 'suge'],
  ['slikke', 'oral'],
  ['slikkeri', 'oralleg'],
  ['blowjob', 'oral på pik'],
  ['rimming', 'slikke røv'],
  ['fingre', 'fingre i fisse eller røv'],
  ['to fingre', 'to fingre indenfor'],
  ['knep', 'samleje'],
  ['kneppe', 'samleje'],
  ['ride', 'sidde og knæppe'],
  ['doggy', 'bagfra'],
  ['missionær', 'ansigt til ansigt'],
  ['dybt', 'dybt ind'],
  ['stød', 'stød med pik eller legetøj'],
  ['ryk', 'håndryk på pik'],
  ['tempo', 'fart'],
  ['langsomt', 'langsomt tempo'],
  ['hårdt', 'hårdere tempo — stadig aftalt'],
  ['edge', 'holde lige før orgasme'],
  ['denial', 'nægtes at komme'],
  ['ruined', 'ødelagt orgasme, tages af kanten'],
  ['cyklus', 'en edge-runde'],
  ['tæt', 'lige før orgasme'],
  ['puls', 'pulserende pik eller klit'],
  ['klemme', 'klemme om pik, bryst eller røv'],
  ['stramme', 'muskler der strammer'],
  ['knip', 'knip i fisse eller røv'],
  ['åben', 'spred eller åbn munden'],
  ['spred', 'spred ben eller baller'],
  ['knæ', 'på knæ'],
  ['titulér', 'sig Mistress eller Master'],
  ['lydig', 'gør som der bliver sagt'],
  ['vent', 'hænderne stille'],
  ['lov', 'tilladelse til at røre eller komme'],
  ['ros', 'god pige / god dreng'],
  ['skat', 'kælenavn'],
  ['lille sissy', 'voksen sissy-kælenavn'],
  ['trusser', 'trusser'],
  ['g-streng', 'g-streng'],
  ['bh', 'bh'],
  ['strømper', 'strømper'],
  ['hofteholder', 'hofteholder'],
  ['korset', 'korset'],
  ['paryk', 'paryk'],
  ['choker', 'choker'],
  ['hæle', 'høje hæle'],
  ['plug', 'buttplug'],
  ['dildo', 'dildo'],
  ['vibrator', 'vibrator'],
  ['strap-on', 'sele med dildo'],
  ['sele-pik', 'strap-on som “pik”'],
  ['kondom', 'kondom'],
  ['glid', 'glidecreme'],
  ['varm', 'varm hud'],
  ['kold', 'koldt stetoskop eller is, kun let'],
  ['sved', 'svedig hud'],
  ['støn', 'støn'],
  ['jamre', 'lyde tæt på'],
  ['tigger', 'bede om at måtte komme'],
  ['inspicer', 'se på tøj og krop'],
  ['tilbed', 'kys og slik der der peges'],
  ['fødder', 'fødder'],
  ['tæer', 'tæer'],
  ['vrist', 'vrist'],
  ['milking', 'malke pikken'],
  ['sleeve', 'sleeve om pikken'],
  ['bur', 'kyskhed i legen'],
  ['protocol', 'knæ, titel, vent'],
  ['brat', 'fræk mund der testes'],
].map(([title, prompt], order): ContentOption => ({
  id: title.replace(/[^a-zA-Z0-9æøåÆØÅ_-]+/g, '-').slice(0, 40) || `ord-${order}`,
  order, title, prompt, blurb: '', group: 'Dansk', enabled: true, free: true, minimumPlan: 'free',
}))

const defaultWordsMinus: ContentOption[] = [
  ['kuk', 'brug pik i stedet'],
  ['mule', 'klodset — brug mund eller læber'],
  ['flænse', 'brug ikke'],
  ['flænser', 'brug ikke'],
  ['penis', 'brug pik'],
  ['vagina', 'brug fisse'],
  ['vulva', 'brug fisse'],
  ['anus', 'brug røv'],
  ['brystkasse', 'brug bryster'],
  ['patter', 'brug bryster hvis brugeren har minus på patter — ellers ok i plus'],
  ['luder', 'kun ved humiliation og aldrig som standard'],
  ['so', 'kun ved humiliation'],
  ['hore', 'kun ved humiliation'],
  ['barnligt', 'aldrig barnligt sprog'],
  ['skolebarn', 'forbudt'],
].map(([title, prompt], order): ContentOption => ({
  id: `minus-${title}`,
  order, title, prompt, blurb: '', group: 'Minus', enabled: true, free: true, minimumPlan: 'free',
}))

export const DEFAULT_CONTENT_CATALOG: ContentCatalog = {
  version: CATALOG_VERSION,
  equipment,
  words: defaultWords,
  wordsMinus: defaultWordsMinus,
  fetishes: [
    { id: 'edge', title: 'Kant', blurb: 'Op, hold, nægt. Kernen.', prompt: 'Fokusér på kontrolleret opbygning, stop og gentagelser.', group: 'Kerne', enabled: true, free: true, minimumPlan: 'free', order: 0 },
    { id: 'power', title: 'Styring', blurb: 'Du. Nu. Service. Voksne roller.', prompt: 'Fokusér på tydelige voksne roller, aftalte regler og service.', group: 'Kerne', enabled: true, free: true, minimumPlan: 'free', order: 1 },
    { id: 'aftercare', title: 'Efter', blurb: 'Scenen ovre. Vand. Varm mund.', prompt: 'Fokusér på ro, omsorg, nedtrapning og tryghed.', group: 'Kerne', enabled: true, free: true, minimumPlan: 'free', order: 2 },
    { id: 'cei', title: 'Slik det op', blurb: 'Efter du kom: slik / sluge. Kun voksne.', prompt: 'Fokusér kun på det valgte CEI-tema mellem samtykkende voksne.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 3 },
    { id: 'milking', title: 'Malkning', blurb: 'Sleeve, maskine, e-stim. Tøm pikken.', prompt: 'Fokusér på det valgte milking-tema som voksen fiktion og undgå farlige instruktioner.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 4 },
    { id: 'joi', title: 'Hånd-kommando', blurb: 'Jeg styrer din hånd med ord.', prompt: 'Fokusér på verbal, voksen og samtykkende instruktion inden for brugerens grænser.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 5 },
    { id: 'chastity', title: 'Bur', blurb: 'Pikken låst i legen. Ingen rigtig lås ude.', prompt: 'Fokusér på denial, timer og aftalt kontrol uden virkelige risikable situationer.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 6 },
    { id: 'humiliation', title: 'Ydmyg', blurb: 'Pinligt og frækt. Slået fra som standard.', prompt: 'Brug kun den valgte grad af voksen humiliation og respekter forbuddet mod øgenavne.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 7 },
    { id: 'femdom', title: 'Hun styrer', blurb: 'Hendes fisse, hendes tempo. Strap som tale.', prompt: 'Fokusér på en voksen femdom-dynamik med tydelig kontrol og samtykke.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 8 },
    { id: 'anal', title: 'Røv', blurb: 'Plug, fingre, prostata. Som voksen fiktion.', prompt: 'Hold dig til det valgte voksne anal/prostate-tema uden farlige eller medicinske instruktioner.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 9 },
    { id: 'brat', title: 'Brat', blurb: 'Fræk mund. Du udfordrer. Partneren tæmmer.', prompt: 'Brugeren er brat: fræk, tester grænser. Du tæmmer med ordrer, ikke vold. Kort og skarp.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 13 },
    { id: 'protocol', title: 'Protocol', blurb: 'Knæ. Titel. Vent.', prompt: 'Høj protocol: knæ, titulér, vent på lov. Få ord.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 14 },
    { id: 'worship', title: 'Tilbed', blurb: 'Krop, hæle, slik. Ingen raceplay.', prompt: 'Fokusér på voksen worship, service og beundring.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 10 },
    { id: 'roleskin', title: 'Kostume', blurb: 'Maid, uniform, voksen pet. Ikke skole.', prompt: 'Brug kun tydeligt voksne rolletemaer og aldrig barnlige eller mindreårige roller.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 11 },
    { id: 'sissy', title: 'Sissy', blurb: 'Lingeri, kjole, makeup. Voksen sissy-leg.', prompt: 'Voksen sissy-leg. Lingeri, ros, ydmyghed kun hvis slået til. Aldrig barnligt.', group: 'Ekstra', enabled: true, free: false, minimumPlan: 'plus', order: 12 },
  ],
}

const PLAN_RANK: Record<PlanId, number> = { free: 0, solo: 1, plus: 2 }

export function planCanUseContent(plan: PlanId, item: ContentOption): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[item.minimumPlan]
}

function text(value: unknown, fallback = '', max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : fallback
}

function plan(value: unknown, fallback: PlanId): PlanId {
  return value === 'free' || value === 'solo' || value === 'plus' ? value : fallback
}

function normalizeOptions(value: unknown, fallback: ContentOption[], mergeDefaults = false): ContentOption[] {
  const source = Array.isArray(value) ? value : []
  const fallbackById = new Map(fallback.map((item) => [item.id, item]))
  const normalized = source.flatMap((raw, index): ContentOption[] => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Partial<ContentOption>
    const id = text(item.id, '', 80).replace(/[^a-zA-Z0-9_-]/g, '-')
    const title = text(item.title, '', 80)
    if (!id || !title) return []
    const base = fallbackById.get(id)
    const minimumPlan = plan(item.minimumPlan, base?.minimumPlan ?? (item.free === true ? 'free' : 'plus'))
    return [{
      id,
      title,
      blurb: text(item.blurb, base?.blurb ?? '', 180),
      prompt: text(item.prompt, base?.prompt ?? title, 600),
      group: text(item.group, base?.group ?? 'Andet', 80),
      enabled: item.enabled !== false,
      free: minimumPlan === 'free',
      minimumPlan,
      order: typeof item.order === 'number' ? item.order : base?.order ?? index,
    }]
  })
  const remoteById = new Map(normalized.map((item) => [item.id, item]))
  const merged = mergeDefaults
    ? [...fallback.map((item) => remoteById.get(item.id) ?? item), ...normalized.filter((item) => !fallbackById.has(item.id))]
    : normalized
  const ids = new Set<string>()
  return (merged.length ? merged : structuredClone(fallback))
    .filter((item) => !ids.has(item.id) && ids.add(item.id))
    .sort((a, b) => a.order - b.order)
    .map((item, order) => ({ ...item, order }))
}

function normalizeCatalog(value: unknown): ContentCatalog {
  if (!value || typeof value !== 'object') return structuredClone(DEFAULT_CONTENT_CATALOG)
  const raw = value as Partial<ContentCatalog>
  const migrate = typeof raw.version !== 'number' || raw.version < CATALOG_VERSION
  return {
    version: CATALOG_VERSION,
    equipment: normalizeOptions(raw.equipment, DEFAULT_CONTENT_CATALOG.equipment, migrate),
    fetishes: normalizeOptions(raw.fetishes, DEFAULT_CONTENT_CATALOG.fetishes, migrate),
    words: normalizeOptions(raw.words, DEFAULT_CONTENT_CATALOG.words, migrate),
    wordsMinus: normalizeOptions(raw.wordsMinus, DEFAULT_CONTENT_CATALOG.wordsMinus, migrate),
  }
}

export function observeContentCatalog(callback: (catalog: ContentCatalog) => void): () => void {
  const db = getFirebaseDb()
  if (!db) {
    callback(structuredClone(DEFAULT_CONTENT_CATALOG))
    return () => undefined
  }
  return onSnapshot(
    doc(db, 'contentCatalog', 'default'),
    (snapshot) => callback(snapshot.exists() ? normalizeCatalog(snapshot.data()) : structuredClone(DEFAULT_CONTENT_CATALOG)),
    () => callback(structuredClone(DEFAULT_CONTENT_CATALOG)),
  )
}

export async function publishContentCatalog(catalog: ContentCatalog): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error('Firebase/Firestore er ikke konfigureret.')
  await setDoc(doc(db, 'contentCatalog', 'default'), normalizeCatalog(catalog))
}

export function newContentOption(kind: 'equipment' | 'fetish' | 'word', order: number): ContentOption {
  return {
    id: `custom-${kind}-${Date.now().toString(36)}`,
    order,
    title: kind === 'equipment' ? 'Nyt udstyr' : 'Nyt tema',
    blurb: '',
    prompt: '',
    group: 'Andet',
    enabled: true,
    free: false,
    minimumPlan: 'plus',
  }
}
