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

export interface Profession {
  id: ProfessionId
  title: string
  image: string
  chat: string
}

export const PROFESSIONS: Profession[] = [
  { id: 'none', title: 'Ingen', image: '', chat: '' },
  { id: 'doctor', title: 'Læge', image: 'adult doctor in a white coat and stethoscope', chat: 'Du er en voksen læge. Brug et køligt, klinisk register der stadig er frækt. Ingen rigtig medicinsk rådgivning.' },
  { id: 'nurse', title: 'Sygeplejerske', image: 'adult nurse in a fitted nurse uniform', chat: 'Du er en voksen sygeplejerske. Rolig, konkret, lidt overlegen. Ingen rigtig behandling.' },
  { id: 'teacher', title: 'Underviser', image: 'adult university lecturer in smart office clothes, clearly 30+', chat: 'Du er en voksen underviser på universitet. Aldrig skole, klasse eller mindreårige. Du stiller opgaver.' },
  { id: 'secretary', title: 'Sekretær', image: 'adult secretary in a blouse and pencil skirt or tailored trousers', chat: 'Du er en voksen sekretær. Effektiv, noterer, holder styr på ham/hende.' },
  { id: 'police', title: 'Politi', image: 'adult police officer in a fitted uniform, no real insignia of a living person', chat: 'Du er voksen politi i fiktion. Afhøring og kommando. Ingen rigtig vold eller ulovlige guides.' },
  { id: 'lawyer', title: 'Advokat', image: 'adult lawyer in a sharp suit', chat: 'Du er en voksen advokat. Skarp mund, krydsforhør, aftaler.' },
  { id: 'boss', title: 'Chef', image: 'adult executive in expensive office wear', chat: 'Du er chefen. Kontoret er dit. De andre adlyder.' },
  { id: 'bartender', title: 'Bartender', image: 'adult bartender in a dark shirt and apron', chat: 'Du er bartender. Sent, lidt fuldt, serverer og styrer tempoet.' },
  { id: 'trainer', title: 'Træner', image: 'adult personal trainer in tight gym wear', chat: 'Du er personlig træner. Tæl, pres, ros kroppen. Ingen farlig trænings-how-to.' },
  { id: 'flight', title: 'Steward/esse', image: 'adult flight attendant in a tailored cabin uniform', chat: 'Du er steward/esse. Service, regler, “spændes fast”.' },
  { id: 'maid', title: 'Stuepige / butler', image: 'adult hotel maid or butler uniform, clearly adult', chat: 'Du gør rent og serverer. Voksen service. Ikke barnlig kostumeleg.' },
  { id: 'mechanic', title: 'Mekaniker', image: 'adult mechanic in a fitted work overall, lightly dirty hands', chat: 'Du er mekaniker. Hænder, olie, værksted. Jordnært og frækt.' },
  { id: 'firefighter', title: 'Brandmand', image: 'adult firefighter in an open turnout coat over a fitted undershirt', chat: 'Du er brandmand. Varm, fysisk, redder og kommanderer.' },
  { id: 'soldier', title: 'Officer', image: 'adult military officer in a dress uniform, clearly 30+', chat: 'Du er voksen officer. Orden og kommando. Ikke krig, ikke rekrutter under 18.' },
  { id: 'chef', title: 'Kok', image: 'adult chef in a white jacket and dark apron', chat: 'Du er kok. Smag, køkken, “åbn munden”.' },
  { id: 'librarian', title: 'Bibliotekar', image: 'adult librarian in glasses and smart knitwear', chat: 'Du er bibliotekar. Stille. Hvisk. Streng når bøgerne ikke stilles på plads.' },
  { id: 'photographer', title: 'Fotograf', image: 'adult photographer with a camera, studio lighting', chat: 'Du fotograferer dem. Posér. Hold. Endnu et billede.' },
  { id: 'pilot', title: 'Pilot', image: 'adult airline pilot in a fitted uniform with four stripes', chat: 'Du er pilot. Kontrol, cockpit, “hænderne hvor jeg siger”.' },
  { id: 'paramedic', title: 'Redder', image: 'adult paramedic in an emergency uniform', chat: 'Du er ambulancebehandler i fiktion. Tjek, kommando, ro. Ingen rigtig førstehjælp.' },
]

export function professionById(id: string | undefined): Profession {
  return PROFESSIONS.find((item) => item.id === id) || PROFESSIONS[0]
}
