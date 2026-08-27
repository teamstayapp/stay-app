/** Hårde forbud. Matcher også hvis brugeren skriver det midt i en scene. */
export const BLOCKED_PATTERNS: RegExp[] = [
  /\b(child|children|kid|kids|minor|minors|underage|under.?age|pedo|paedo|lolita|preteen|pre-teen|teen(?!age fantasy adult)|schoolboy|schoolgirl|school[- ]girl|school[- ]boy)\b/i,
  /\b(barn|børn|mindreårig|mindreårige|underage|pædo|loli|shota|skolepige|skoleelev|elev-lærer|lærer-elev)\b/i,
  /\b(age\s*play|abdl|ddl[g]e?|daddy\s*daughter|mommy\s*boy|mommy\s*girl|infantilism|adult\s*baby)\b/i,
  /\b(incest|sister\/brother|bror og søster|far og datter)\b/i,
  /\b(grooming|race\s*play|raceplay)\b/i,
  /\b(how to (choke|strangle|asphyxiat|waterboard|cut|brand|suffocat))/i,
]

export function isBlocked(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  return BLOCKED_PATTERNS.some((re) => re.test(t))
}

export const BLOCKED_REPLY =
  'Det emne er blokeret. Stay er kun voksne, samtykke og lovlig fiktion. Ingen mindreårige, ingen schoolgirl/barn-roller, ingen incest-pakker, ingen guides til at skade nogen. Vælg et andet spor.'

export const POLICY_TEXT = `Kun 18+. Kun samtykkende voksne.

Ikke i appen — nogensinde:
• seksuelt indhold med mindreårige, også fiktivt
• schoolgirl / lærer-elev / baby / age play som barn
• incest-scener
• race play og grooming
• brugsanvisning til kvælning, blod, ild, nåle, waterboarding

Safeword stopper scenen med det samme.`

export const POLICY_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Hvem appen er til',
    body: 'Stay er et værktøj til samtykkende voksne (18+). Scener er fiktion. Appen er ikke dating, ikke et marked for evidensvideoer, og ikke en guide til at skade nogen.',
  },
  {
    title: 'Forbudt — ingen undtagelser',
    body: 'Seksualiseret indhold med mindreårige, også fiktivt eller “det er voksne der leger barn”. Schoolgirl, lærer-elev som barn, ABDL/age play som baby, daddy/daughter, mommy/boy, incest. Grooming. Race play. Ikke-samtykkende billeder, skjult optagelse, afpresning.',
  },
  {
    title: 'Farligt som instruktion',
    body: 'Kvælning, asfyksi, blod, skæring, ild, nåle, branding, waterboarding og tilsvarende må ikke forklares som teknik. Hvis det overhovedet nævnes, er det kun som afvist eller som rent ord uden fremgangsmåde.',
  },
  {
    title: 'Tilladt',
    body: 'Voksen D/s, edge, JOI, CEI mellem voksne, milking/maskine/e-stim som legetøj, chastity som timer, humiliation slået til af brugeren, femdom, anal/prostate som fiktion, worship, voksen rolleleg (maid, military, petplay uden barnesprog). Fiktive voksne master/mistress-figurer, inkl. valgfri NSFW når brugeren slår Fræk til. Ikke kendisser. Ikke nogens rigtige foto gjort nøgent.',
  },
  {
    title: 'Samtykke i produktet',
    body: 'Safeword og stop slår AI og scene. Tungere pakker er slået fra indtil de vælges. Aftercare er ikke tilkøb. Brugeren kan altid forlade scenen.',
  },
  {
    title: 'Data',
    body: 'v1 gemmer scener lokalt. Ingen cloud-log over orgasmer eller CEI. Billeder og video i legen bliver på telefonen og sendes ikke til server eller andre brugere. Ingen kloning af rigtige personer.',
  },
]
