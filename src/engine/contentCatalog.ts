import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import type { PlanId } from './plans'
import { getFirebaseDb } from './firebase'
import { DEFAULT_TASK_BANK, TASK_CATEGORIES } from './sessionStore'

const CATALOG_VERSION = 10

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

export interface TaskItem {
  id: string
  text: string
  enabled: boolean
}

export interface TaskGroup {
  id: string
  title: string
  enabled: boolean
  order: number
  tasks: TaskItem[]
}

export interface ContentCatalog {
  version: number
  equipment: ContentOption[]
  fetishes: ContentOption[]
  words: ContentOption[]
  wordsMinus: ContentOption[]
  taskGroups: TaskGroup[]
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
  ['e_stim', 'E-stim', 'Vibrator og maskine', 'solo', 'færdigt e-stim-legetøj; aldrig DIY eller stikkontakt'],
  ['vibrating_plug', 'Vibrator-plug', 'Vibrator og maskine', 'solo'],
  ['slim_plug', 'Tynd plug', 'Dildo og røv', 'solo'],
  ['thick_plug', 'Tyk plug', 'Dildo og røv', 'solo', 'tyk plug; kun hovedet først og stop ved smerte'],
  ['tail_plug', 'Hale-plug', 'Dildo og røv', 'solo'],
  ['collar', 'Halsbånd', 'Bondage light', 'solo'],
  ['dental_dam', 'Dental dam', 'Krop og sikring', 'plus', 'dental dam som neutral oral-sikring'],
  ['gloves', 'Handsker', 'Krop og sikring', 'plus'],
  ['towel', 'Håndklæde', 'Krop og sikring', 'plus'],
  ['bullet', 'Mini-vibrator', 'Vibrator og maskine', 'plus'],
  ['remote_vibe', 'Fjernbetjent vibrator', 'Vibrator og maskine', 'plus', 'fjernbetjent vibrator; kun privat eller helt skjult'],
  ['vibrating_egg', 'Vibrator-æg', 'Vibrator og maskine', 'plus'],
  ['suction_vibe', 'Sugevibrator', 'Vibrator og maskine', 'plus'],
  ['thrusting_toy', 'Stødende legetøj', 'Vibrator og maskine', 'plus'],
  ['fuckmachine', 'Sexmaskine', 'Vibrator og maskine', 'plus', 'færdig sexmaskine; ingen DIY'],
  ['cock_ring', 'Pikring', 'Pik og milking', 'plus'],
  ['vibrating_ring', 'Vibratorring', 'Pik og milking', 'plus'],
  ['stroker', 'Stroker', 'Pik og milking', 'plus'],
  ['pump', 'Pumpe', 'Pik og milking', 'plus', 'pumpe som færdigt voksenlegetøj; ingen medicinske løfter'],
  ['milking_sleeve', 'Milking-sleeve', 'Pik og milking', 'plus'],
  ['beads_shaft', 'Kugler til skaft', 'Pik og milking', 'plus'],
  ['anal_beads', 'Anal kugler', 'Dildo og røv', 'plus'],
  ['prostate', 'Prostata-legetøj', 'Dildo og røv', 'plus', 'prostata som voksen fiktion; ingen medicinske løfter'],
  ['double_dildo', 'Dobbelt dildo', 'Dildo og røv', 'plus'],
  ['nipple_clamps', 'Patterklemme', 'Patter og hud', 'plus', 'færdige vorteklemmer; korte intervaller; tag af ved følelsesløshed'],
  ['suction_cups', 'Sugekopper', 'Patter og hud', 'plus'],
  ['ice', 'Is', 'Patter og hud', 'plus', 'is udefra og kort; ikke inde i kroppen'],
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
  ['winged_plug', 'Vinget plug', 'Dildo og røv', 'solo', 'vinget plug til hverdag under tøj; stop ved smerte'],
  ['inflatable_plug', 'Oppustelig plug', 'Dildo og røv', 'plus', 'oppustelig plug som færdigt legetøj'],
  ['tunnel_plug', 'Tunnel-plug', 'Dildo og røv', 'plus'],
  ['string_harness', 'Snor-sele', 'Bondage light', 'plus'],
  ['stayups', 'Stay-ups', 'Lingeri', 'solo'],
  ['bodystocking', 'Bodystocking', 'Lingeri', 'plus'],
  ['lace_panties', 'Blonde-trusser', 'Lingeri', 'solo'],
  ['tie_panties', 'Snøre-trusser', 'Lingeri', 'plus'],
  ['nightgown', 'Natkjole', 'Lingeri', 'solo'],
  ['silicone_breasts', 'Silikonebryster', 'Lingeri', 'plus'],
  ['breast_clamps_estim', 'Brystklemmer e-stim', 'Patter og hud', 'plus', 'færdigt e-stim til brystvorter; aldrig DIY'],
  ['precum_condom', 'Precum-kondom', 'Krop og sikring', 'solo', 'kondom til at samle precum; sluge kun efter tilladelse'],
  ['nipple_pinch', 'Nive vorter', 'Fetish sexlegetøj', 'free', 'nive og rulle vorter med fingre; stop ved stikkende smerte'],
  ['tweezer_clamps', 'Pincet-klemmer', 'Fetish sexlegetøj', 'plus', 'justerbare vorteklemmer'],
  ['chain_clamps', 'Kæde-klemmer', 'Fetish sexlegetøj', 'plus', 'klemmer med kæde; let træk, ikke ryk'],
  ['vibrating_nipple', 'Vibrator til vorter', 'Fetish sexlegetøj', 'plus', 'lille vibrator på vorter'],
  ['exam_gloves', 'Latexhandsker', 'Læge / undersøgelse', 'free', 'handsker; klinisk berøring'],
  ['nitrile_gloves', 'Nitrilhandsker', 'Læge / undersøgelse', 'solo'],
  ['stethoscope', 'Stetoskop', 'Læge / undersøgelse', 'solo', 'stetoskop som rekvisit; ingen diagnose'],
  ['lube_clinical', 'Klinik-gelé', 'Læge / undersøgelse', 'free', 'sterilt look, almindelig glid'],
  ['flashlight', 'Penlight', 'Læge / undersøgelse', 'solo', 'lille lampe til inspicering i legen'],
  ['drape', 'Afdækning', 'Læge / undersøgelse', 'solo', 'klæde over skød; blottes når Frue siger'],
  ['stirrups', 'Benstøtter / stol', 'Læge / undersøgelse', 'plus', 'gynstol i fantasi'],
  ['speculum_toy', 'Spekulum (legetøj)', 'Læge / undersøgelse', 'plus', 'voksen legetøjs-spekulum; ingen medicinsk brug'],
  ['tongue_depressor', 'Spatel', 'Læge / undersøgelse', 'plus', 'åbn munden i legen'],
  ['cotton', 'Vat / gaze', 'Læge / undersøgelse', 'plus', 'klinisk rekvisit'],
  ['thermometer_play', 'Leg-termometer', 'Læge / undersøgelse', 'plus', 'kun udvortes rekvisit; ikke medicinsk brug'],
  ['reflex_hammer', 'Reflekshammer (leg)', 'Læge / undersøgelse', 'plus', 'let tap; ingen slå-guide'],
  ['clipboard', 'Journal / clipboard', 'Læge / undersøgelse', 'free', 'rapport: tændt, plug, precum'],
  ['name_badge', 'Navneskilt', 'Læge / undersøgelse', 'free', 'Frue eller lægetitel i voksenleg'],
  ['mask_medical', 'Mundbind', 'Læge / undersøgelse', 'solo', 'klinisk look'],
  ['apron_medical', 'Plastforklæde', 'Læge / undersøgelse', 'plus', 'klinisk look'],
  ['lube_warmer', 'Glid-varmer', 'Læge / undersøgelse', 'plus', 'varm gelé; ingen skoldning'],
  ['probe_toy', 'Blød probe', 'Læge / undersøgelse', 'plus', 'færdigt legetøj formet som probe'],
  ['gloves_long', 'Lange handsker', 'Læge / undersøgelse', 'plus', 'lange handsker til voksen undersøgelsesleg'],
  ['coat_open', 'Åben kittel', 'Udklædning', 'solo', 'hvid kittel over lingeri'],
  ['nurse_uniform', 'Sygeplejerske-uniform (voksen)', 'Udklædning', 'plus', 'voksen uniform; aldrig skole'],
]

const equipmentGroupOverrides: Record<string, string> = {
  lube: 'Alm. sexlegetøj', condom: 'Alm. sexlegetøj', precum_condom: 'Alm. sexlegetøj',
  vibrator: 'Alm. sexlegetøj', dildo: 'Alm. sexlegetøj', slim_plug: 'Alm. sexlegetøj',
  plug: 'Alm. sexlegetøj', winged_plug: 'Alm. sexlegetøj', wand: 'Alm. sexlegetøj',
  bullet: 'Alm. sexlegetøj', cock_ring: 'Alm. sexlegetøj', vibrating_ring: 'Alm. sexlegetøj',
  thong: 'Lingeri', thick_plug: 'Avanceret sexlegetøj', vibrating_plug: 'Avanceret sexlegetøj',
  inflatable_plug: 'Avanceret sexlegetøj', tunnel_plug: 'Avanceret sexlegetøj', tail_plug: 'Avanceret sexlegetøj',
  anal_beads: 'Avanceret sexlegetøj', prostate: 'Avanceret sexlegetøj', double_dildo: 'Avanceret sexlegetøj',
  strap_on: 'Avanceret sexlegetøj', sleeve: 'Avanceret sexlegetøj', stroker: 'Avanceret sexlegetøj',
  milking_sleeve: 'Avanceret sexlegetøj', pump: 'Avanceret sexlegetøj', beads_shaft: 'Avanceret sexlegetøj',
  remote_vibe: 'Avanceret sexlegetøj', vibrating_egg: 'Avanceret sexlegetøj', suction_vibe: 'Avanceret sexlegetøj',
  thrusting_toy: 'Avanceret sexlegetøj', fuckmachine: 'Avanceret sexlegetøj', e_stim: 'Avanceret sexlegetøj',
  breast_clamps_estim: 'Avanceret sexlegetøj', nipple_clamps: 'Fetish sexlegetøj', suction_cups: 'Fetish sexlegetøj',
  ice: 'Fetish sexlegetøj', feather: 'Fetish sexlegetøj', massage_oil: 'Fetish sexlegetøj',
  wax_low: 'Fetish sexlegetøj', soft_cuffs: 'Fetish sexlegetøj', blindfold: 'Fetish sexlegetøj',
  chastity: 'Fetish sexlegetøj', collar: 'Fetish sexlegetøj', choker: 'Lingeri', leash: 'Fetish sexlegetøj',
  gag_soft: 'Fetish sexlegetøj', rope_soft: 'Fetish sexlegetøj', tape: 'Fetish sexlegetøj',
  spreader: 'Fetish sexlegetøj', paddle: 'Fetish sexlegetøj', flogger_soft: 'Fetish sexlegetøj',
  crop: 'Fetish sexlegetøj', hood_soft: 'Fetish sexlegetøj', earplugs: 'Fetish sexlegetøj',
  string_harness: 'Fetish sexlegetøj', harness: 'Fetish sexlegetøj', paw_gloves: 'Fetish sexlegetøj',
  kneepads: 'Fetish sexlegetøj', bowl: 'Fetish sexlegetøj', worship_pillow: 'Fetish sexlegetøj',
  panties: 'Lingeri', lace_panties: 'Lingeri', tie_panties: 'Lingeri', cage_panties: 'Lingeri',
  bra: 'Lingeri', stayups: 'Lingeri', stockings: 'Lingeri', garter: 'Lingeri', bodystocking: 'Lingeri',
  babydoll: 'Lingeri', nightgown: 'Lingeri', corset: 'Lingeri', silicone_breasts: 'Lingeri', lipstick: 'Lingeri',
  sissy_dress: 'Udklædning', sissy_wig: 'Udklædning', maid_outfit: 'Udklædning', heels: 'Udklædning',
  latex_wear: 'Udklædning', leather_wear: 'Udklædning', gloves_fetish: 'Udklædning', jock: 'Udklædning',
}

const equipment = equipmentSeeds.map(([id, title, group, minimumPlan, prompt], order): ContentOption => ({
  id,
  title,
  group: equipmentGroupOverrides[id] || group,
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
  ['frue', 'titel Frue'],
  ['ja frue', 'svar ja Frue'],
  ['javel', 'kort lydighed'],
  ['precum', 'pre-cum / forskum'],
  ['dryp', 'drypper'],
  ['kondomfyld', 'det der er i kondomet'],
  ['slug', 'sluge kun efter lov'],
  ['vinget plug', 'plug med vinger'],
  ['snor', 'snor i sele'],
  ['reverse kegel', 'skub blidt ud'],
  ['kegel', 'knib'],
  ['åben røv', 'åben røv i legen'],
  ['fyldt', 'fyldt af plug'],
  ['e-stim', 'færdigt e-stim-legetøj'],
  ['pads', 'e-stim pads'],
  ['brystklemmer', 'klemmer på vorter'],
  ['selvsiddende', 'bliver siddende under tøj'],
  ['snøre-trusser', 'trusser med snøre'],
  ['silikonebryster', 'silikonebryster'],
  ['stuepige', 'voksen stuepige'],
  ['pligter', 'små pligter'],
  ['under tøjet', 'under arbejdstøj'],
  ['kolleger', 'andre på arbejde — diskret'],
  ['strap', 'strap-on'],
  ['tæt på', 'lige før orgasme'],
  ['ikke endnu', 'ingen udløsning endnu'],
  ['jeg er våd', 'Fruen beskriver sin fisse'],
  ['jeg knalder mig selv', 'Fruen leger med sig selv'],
  ['mine vorter er stive', 'Fruens brystvorter'],
['master', 'titel Master'],
['ja master', 'svar ja Master'],
['min pik', 'Masters pik'],
['mine venner', 'fiktive voksne venner'],
['tyk pik', 'tyk pik'],
['varm sperm', 'varm udløsning'],
['boxershorts', 'boxershorts over trusser'],
['ja mistress', 'svar ja Mistress'],
['min frue', 'titel'],
['min master', 'titel'],
['god dreng', 'ros til voksen mand'],
['god pige', 'ros til voksen kvinde'],
['lille pik', 'ydmyg kun hvis humiliation er slået til'],
['stiv pik', 'erigeret pik'],
['blød pik', 'blød efter eller før'],
['pulsende', 'puls i pik eller klit'],
['åre', 'årer på pikken'],
['hovedet', 'pikhovedet'],
['skaftet', 'pikkens skaft'],
['våd fisse', 'Fruen eller brugerens fisse'],
['dryppende', 'drypper'],
['saft', 'kropsvæske'],
['glidende', 'glat af glid'],
['stram', 'stram fisse eller røv'],
['åben mund', 'mund åben'],
['dyb', 'dybt i mund eller røv'],
['hurtigt', 'hurtige ryk'],
['blidt', 'blidt tempo'],
['rid', 'ride'],
['tag mig', 'brugeren beder om penetration'],
['fyld mig', 'fyld fisse eller røv'],
['kom i mig', 'udløsning i'],
['kom i munden', 'udløsning i munden'],
['kom i røven', 'udløsning i røven'],
['load', 'en omgang sperm'],
['sluge det', 'sluge efter lov'],
['slikke rent', 'slikke efter udløsning'],
['smage', 'smage precum eller sperm'],
['savle', 'savle'],
['gab', 'åben mund'],
['kvæle på pikken', 'dyb oral — ingen luft-how-to'],
['halsen', 'i halsen, voksen oral'],
['røvhul', 'anus som røv'],
['spred ballerne', 'spred baller'],
['ind i røven', 'anal i legen'],
['langsomt i røven', 'langsom anal'],
['plug ud', 'tag pluggen ud'],
['plug i', 'sæt plug i'],
['større plug', 'skift til større hvis det føles ok'],
['vingerne', 'vinger på plug'],
['snor mellem ballerne', 'harness-snor'],
['pads på pung', 'e-stim pads, færdigt legetøj'],
['ét hak op', 'e-stim ét trin'],
['ét hak ned', 'e-stim ned'],
['slukket', 'e-stim fra'],
['kondom på', 'sæt kondom på'],
['kondom af', 'tag kondom af'],
['fuldt kondom', 'kondomet er fyldt'],
['gem kondomet', 'gem til senere efter lov'],
['trusser op', 'trusser på'],
['trusser ned', 'trusser ned'],
['trusser til side', 'trusser trukket til siden'],
['bh af', 'bh af'],
['strømper på', 'strømper'],
['hæle på', 'hæle'],
['paryk på', 'paryk'],
['læbestift', 'læbestift'],
['på knæ', 'knæ'],
['hænderne på ryggen', 'hænderne bag'],
['hænderne væk', 'ingen berøring'],
['tæl', 'tæl ryk'],
['ti ryk', 'ti ryk'],
['stop', 'stop nu'],
['hold', 'hold kanten'],
['igen', 'en runde mere'],
['nægtet', 'ingen orgasme'],
['lov til at komme', 'tilladelse'],
['ikke lov', 'ingen tilladelse'],
['rapportér', 'giv status'],
['tændt', 'hvor tændt 1-10'],
['alene nu', 'ingen andre i rummet'],
['diskret', 'korte sætninger'],
['min fisse', 'Fruens fisse'],
['min røv', 'Fruens eller Masters røv i legen'],
['mine bryster', 'Fruens bryster'],
['stive vorter', 'stive brystvorter'],
['jeg rider dig', 'Fruen rider'],
['jeg tager din røv', 'Master eller strap'],
['sele-pik i dig', 'strap-on'],
['vennerne venter', 'fiktive voksne, kun hvis valgt'],
['du er min', 'ejerskab i legen'],
['min slave', 'titel i legen'],
['min dreng', 'voksen dreng som kælenavn'],
['min pige', 'voksen pige som kælenavn'],
  ['nive', 'nive og rulle vorter forsigtigt'],
  ['klemme vorter', 'voksen vorteleg med stop ved ubehag'],
  ['klemmer', 'færdige vorteklemmer'],
  ['e-stim på vorter', 'kun færdigt e-stim-legetøj på lavt niveau'],
  ['under silikonebrysterne', 'skjult og diskret under silikonebryster'],
  ['handsker', 'handsker i voksen klinikleg'],
  ['stolen', 'undersøgelsesstolen i kliniklegen'],
  ['tændt 1-10', 'kort status fra 1 til 10'],
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
  ['teen', 'forbudt'],
  ['ung pige', 'forbudt'],
  ['kvæl', 'ingen kvælnings-how-to'],
  ['DIY-strøm', 'ingen hjemmelavet strøm'],
  ['stikkontakt', 'ingen strøm-guide'],
  ['baby', 'forbudt'],
  ['little girl', 'forbudt'],
  ['skede', 'brug fisse'],
  ['kønslæber', 'brug læber efter kontekst'],
  ['sædleder', 'undgå medicinsk sprog'],
  ['tissemand', 'brug pik'],
  ['tissekone', 'brug fisse'],
  ['lem', 'brug pik'],
  ['underage', 'forbudt'],
  ['lolita', 'forbudt'],
  ['incest', 'forbudt'],
  ['raceplay', 'forbudt'],
  ['kvælning', 'ingen kvælnings-how-to'],
  ['asfyksi', 'forbudt'],
  ['strømstød hjemme', 'ingen hjemmelavet strøm'],
  ['ledning i stik', 'ingen strøm-guide'],
  ['diagnose', 'ingen rigtig diagnose'],
  ['rigtig behandling', 'ingen rigtig medicinsk behandling'],
].map(([title, prompt], order): ContentOption => ({
  id: `minus-${title}`,
  order, title, prompt, blurb: '', group: 'Minus', enabled: true, free: true, minimumPlan: 'free',
}))

const taskGroupTitles: Record<string, string> = {
  mix: 'Blandet', lingerie: 'Lingeri', edge: 'Edge', sissy: 'Sissy', protocol: 'Protocol',
  worship: 'Worship', estim: 'E-stim', cei: 'Kondom / CEI', work: 'Diskret ude',
  kegel: 'Kegel', reverse_kegel: 'Reverse kegel',
  prep: 'Klargøring', enema: 'Skyl', stretch: 'Udvidelse', clinic: 'Klinik',
  bbc_play: 'Den store', gloryhole: 'Hullet', layby: 'Rasteplads', woods: 'Skov',
}

const defaultTaskGroups: TaskGroup[] = TASK_CATEGORIES.map((id, order) => ({
  id,
  title: taskGroupTitles[id] || id,
  enabled: true,
  order,
  tasks: (id === 'mix' ? [] : DEFAULT_TASK_BANK[id] || []).map((text, index) => ({ id: `${id}-${index + 1}`, text, enabled: true })),
}))

export const DEFAULT_CONTENT_CATALOG: ContentCatalog = {
  version: CATALOG_VERSION,
  equipment,
  words: defaultWords,
  wordsMinus: defaultWordsMinus,
  taskGroups: defaultTaskGroups,
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
    { id: 'prep', title: 'Klargøring', blurb: 'Bad, lingeri og kondom. Klar til Frue.', prompt: 'Voksen klargøring med bad, lingeri og kondom. Én ordre ad gangen. Ingen skadeguide.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 20 },
    { id: 'enema', title: 'Skyl', blurb: 'Lavement som aftalt voksenleg.', prompt: 'Lavement som voksenleg. Kun det brugeren allerede kender. Stop ved smerte eller svie. Ingen opskrift.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 21 },
    { id: 'stretch', title: 'Udvidelse', blurb: 'Plug-trin, Kegel og lokal dagbog.', prompt: 'Anal udvidelse som træningsleg. Kun valgt udstyr. Stop ved smerte. Ingen medicinske råd.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 22 },
    { id: 'clinic', title: 'Klinik', blurb: 'Tydeligt voksen undersøgelsesleg.', prompt: 'Voksen klinik-rollespil. Undersøgelse, gel og plug-trin. Ingen rigtig diagnose.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 23 },
    { id: 'bbc_play', title: 'Den store', blurb: 'Voksen fantasi, hvor Frue styrer.', prompt: 'Voksen mørk mand med stor pik. Frue styrer. Ingen slurs eller race-ydmygelse.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 24 },
    { id: 'gloryhole', title: 'Hullet', blurb: 'Privat fantasi med valgt legetøj.', prompt: 'Gloryhole som privat scene med pude, væg eller aftalt voksen. Aldrig find fremmede.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 25 },
    { id: 'layby', title: 'Rasteplads', blurb: 'Diskret fantasi uden uvidende tilskuere.', prompt: 'Rasteplads som diskret fantasi i bil eller stue. Ingen sex foran uvidende.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 26 },
    { id: 'woods', title: 'Skov', blurb: 'Privat sted eller stuen som skov.', prompt: 'Skov-scene på privat sted eller som gulvleg. Kun valgt udstyr og tydeligt samtykke.', group: 'Frue', enabled: true, free: false, minimumPlan: 'plus', order: 27 },
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

function normalizeTaskGroups(value: unknown, fallback: TaskGroup[], mergeDefaults: boolean): TaskGroup[] {
  const incoming = Array.isArray(value) ? value : []
  const parsed: TaskGroup[] = incoming.flatMap((item, order) => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Partial<TaskGroup>
    const id = text(raw.id, '', 40).toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    const title = text(raw.title, '', 40)
    if (!id || !title) return []
    const tasks = Array.isArray(raw.tasks) ? raw.tasks.flatMap((task, index) => {
      if (!task || typeof task !== 'object') return []
      const row = task as Partial<TaskItem>
      const taskText = text(row.text, '', 180)
      if (!taskText) return []
      return [{ id: text(row.id, `t-${index}`, 60), text: taskText, enabled: row.enabled !== false }]
    }) : []
    return [{ id, title, enabled: raw.enabled !== false, order: typeof raw.order === 'number' ? raw.order : order, tasks }]
  })
  const fallbackById = new Map(fallback.map((item) => [item.id, item]))
  const parsedById = new Map(parsed.map((item) => [item.id, item]))
  const merged = mergeDefaults
    ? [...fallback.map((item) => parsedById.get(item.id) ?? item), ...parsed.filter((item) => !fallbackById.has(item.id))]
    : parsed
  return (merged.length ? merged : structuredClone(fallback))
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
    taskGroups: normalizeTaskGroups(raw.taskGroups, DEFAULT_CONTENT_CATALOG.taskGroups, migrate),
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
