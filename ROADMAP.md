# Stay — prioriteret roadmap

Opdateret 28. aug. 2026. Roadmapet skelner mellem det, der allerede virker,
det der er delvist bygget, og det der skal være på plads før rigtige kunder.

## Allerede på plads

- Rigtig Venice-tekstchat gennem Cloudflare Worker.
- Separat tekst-, billed- og visionmodel, som admin kan vælge.
- Centrale dags-/månedsgrænser og forbrugstal i Firestore.
- Worker-tjek af plan og kvote før AI-kald.
- Billedsaldo trækkes først efter et vellykket billedkald.
- Synligt resterende forbrug og mulighed for manuelt godkendte tilkøb.
- Lokal/private chats, lokal gendannelse, scene, nærhed, cyklus og safeword.
- Korte AI-svar som udgangspunkt og en enkel aftercare-skærm.
- Panikskærm, rigtigt AI-forsøg og synlig daglig beskedgrænse.

## P0 — før rigtige kunder

### 1. Firestore er eneste sandhed om kontoen

- Flyt plan, billedsaldo, kontostatus, pause, opsigelse og udløbsdato helt væk
  fra `localStorage`.
- Workeren skal afvise AI-kald fra en pauset, udløbet eller lukket konto.
- Kundekortet i admin skal vise den samme centrale konto: plan, sidste login,
  saldo, udløb og opsigelsesstatus.
- Behold kun private præferencer og lokalt valgte chats på enheden.

### 2. Betaling og rettigheder

- Hosted checkout hos en voksen-venlig processor.
- Webhook validerer betalingen og opdaterer Firestore; browseren må aldrig selv
  kunne tildele Plus eller ekstra billeder.
- Tilkøb af +50/+150 billeder direkte i scenen uden at forlade chatten.
- Manuelt admin-godkendte køb beholdes kun som test- og supportløsning.

### 3. Juridisk grundlag på det rigtige domæne

- Vilkår, privatliv, refund/fortrydelse, kontakt og tydelig 18+ adgang.
- Diskret, men korrekt, firmanavn og fakturatekst.
- Processorvalg og den endelige refundtekst skal kontrolleres før lancering.

### 4. Privatliv på en delt telefon

- Session-timeout med valg mellem lås og diskret skærm.
- Panikknap skifter straks titel, favicon og visning; pinkode kræves for retur.
- Notifikationer er generiske som standard. Brugeren kan aktivt vælge erotisk
  eller detaljeret tekst på låseskærmen efter en tydelig privatlivsadvarsel og
  en forhåndsvisning af, hvordan beskeden vil se ud.
- Valget kan altid ændres tilbage til **Diskret**, og appen må ikke slå den
  detaljerede visning til automatisk.
- Automatisk oprydning af private sessioner ved logout og timeout.

### 5. Sikker drift

- Kort burst-rate-limit pr. bruger/IP oven på de nuværende dags-/månedsgrænser.
- `stay-api-dev` og `stay-api` med hver sin Firebase-konfiguration og Venice-nøgle.
- Produktion accepterer kun produktionsdomænet. Localhost tillades kun i dev.
- Test pause, udløb, kvote, webhook-gentagelser og mislykkede AI-kald.

## P1 — første oplevelse og kerneprodukt

### 1. To minutters onboarding

- Vis først plan, beskeder tilbage i dag, billeder tilbage og NSFW-status.
- Vælg kun scene, rolle og AI-partnerens stil før første svar.
- Flyt krop, hud, anatomi, tøj, udstyr og øvrige detaljer til **Tilpas** efter
  første replik.
- Prøven bruger en rigtig AI-scene, ikke kun skabelonsvar.

### 2. Kompakt scenetilstand

- Gem en lille lokal scene-state: fase, nærhed, cyklus, sessionens grænser,
  safeword-hændelse og seneste mål.
- Send den kompakte tilstand sammen med de seneste beskeder, så AI'en ikke
  starter scenen forfra.
- Tilstanden indeholder ikke hele chatten og gemmes ikke i skyen, når brugeren
  har valgt privat session.

### 3. Tempo og aftercare

- Admin vælger tempo pr. scene: **tjek-ind**, **hold**, **pres** eller **slip**.
- Tempoet bliver et kort struktureret promptfelt, ikke endnu en lang prompt.
- Efter en afsluttet hed scene går AI-partneren over i en rolig cooldown. Den
  taler varmt og bekræftende, for eksempel at brugeren gjorde det godt, nu må
  slappe af og nyde roen, eventuelt tage et bad, og at der ikke er noget forkert
  i tryg leg mellem voksne.
- Cooldown må gerne være personlig og kærlig, men må ikke fortsætte presset eller
  straks starte en ny opgave.
- Efter safeword bruges først en mere neutral sikkerheds-check: scenen stopper,
  AI'en spørger roligt om brugeren er okay og foreslår vand, varme/tøj og pause.
  Derefter kan brugeren vælge at gemme eller slette sessionen.
- Admin får et særskilt redigerbart cooldown-/aftercare-promptfelt pr. scene.

### 4. Billeder med tydelig værdi

- Brug et cover og 3–4 godkendte stillbilleder pr. scene som hurtig/fallback
  oplevelse; behold generatoren som betalt funktion.
- Vis kvoten før generering og træk kun saldo ved succes.
- Gem fejl-id, model, scene-id og en sanitiseret promptbeskrivelse til support.
  Gem ikke brugerens rå private eller seksuelle prompttekst.

## P2 — admin og drift

- Én live health-linje: Worker-status, Venice-forbindelse/kredit når API'et kan
  levere det, fejlrate, kald og billeder i dag.
- Prompt-diff før **Udgiv til alle**, med mulighed for at annullere.
- Admin-testside til tekst, billeder og vision uden en brugerscene.
- Fejlvisning for manglende kredit, forkert model, kvote og timeout.
- Overvåg faktisk modelpris og margin uden at gemme privat chatindhold.

## Bevidste valg og fravalg

| Forslag | Beslutning |
|---|---|
| Kun statiske partnerbilleder | Brug som hurtig start/fallback, ikke som erstatning for generatoren. |
| Gem hele billedprompten til support | Nej. Gem kun sanitiseret metadata og fejl-id. |
| Fræk tekst i pushnotifikation | Ja, hvis brugeren selv vælger det efter advarsel og forhåndsvisning. Standard er Diskret. |
| Valgfrit kedeligt PWA-navn | Senere som separat diskret installation/build; installeret manifestnavn kan ikke skiftes sikkert live. |
| Localhost i produktions-CORS | Nej; kun i dev-miljøet. |
| TTS/stemme | Senere, når kerneøkonomi og privatliv er bevist. |
| Bluetooth/e-stim | Ikke nu; PWA-begrænsninger og sikkerhedsansvar er for store. |
| Flere fetish-pakker | Efter at kerne-scenerne er stabile og målt. |
| Separat admin-URL | Senere, men før et større adminteam eller bred kundelancering. |

## Foreslået rækkefølge

1. Central konto, pause/udløb og Worker-blokering.
2. Forenklet onboarding og kontooversigt før chat.
3. Session-timeout, panikpinkode og brugerens valgte notifikationsniveau.
4. Hosted checkout, webhook og køb midt i scenen.
5. Kompakt scene-state, tempo og rigtig aftercare.
6. Dev/prod, burst-rate-limit og drifts-/adminværktøjer.
