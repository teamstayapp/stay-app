# Stay — idéer og næste trin

Her samles gode idéer, også når de endnu ikke er planlagt. Flyt en idé til
`STATUS.md`, når vi beslutter at bygge den.

Den besluttede rækkefølge og vurdering ligger i [ROADMAP.md](ROADMAP.md).

## Høj prioritet

- Rigtige pushbeskeder på mobilen. Diskret tekst er standard, men brugeren kan
  aktivt vælge detaljeret/fræk låseskærmstekst efter advarsel og forhåndsvisning.
- Planlægning af en opgavepåmindelse, men kun efter brugerens tydelige accept.
- Automatisk betalings-webhook, så godkendte køb ikke skal behandles manuelt.
- Suppler dags-/månedsgrænser med en kort burst-grænse mod mange samtidige kald.
- Testside i admin, hvor tekstmodel, billedmodel og vision kan afprøves uden at
  starte en brugerscene.
- Tydelig fejlvisning i admin for Venice-fejl, manglende kredit og afviste modeller.
- Kompakt lokal scene-state, så AI'en husker fase, nærhed, cyklus, grænser og
  safeword-hændelser uden at gemme hele chatten i skyen.
- Hosted checkout + valideret webhook til Firestore.
- Session-timeout og pinkode tilbage fra panikskærmen.

## Chat og AI-partner

- Brugeren kan bede om en ny variant af samme partnerbillede.
- Bevar figurens ansigt og udseende på tværs af nye billeder.
- Valgfrit navn til AI-partneren.
- AI kan stille korte opfølgende spørgsmål før en opgave, hvis vigtig information
  om grænser eller udstyr mangler.
- Valg af korte, normale eller længere AI-svar.
- Adminstyret tempo pr. scene: tjek-ind, hold, pres eller slip.
- Personlig cooldown efter en afsluttet scene med varm ros, ro, egenomsorg og
  tryg bekræftelse; særskilt neutral sikkerheds-check efter safeword.
- Stemme til AI-partneren og valgfri oplæsning af beskeder.
- Analyse af korte videoklip, hvis privatliv og pris kan forsvares.

## Privatliv

- Vis tydeligt før upload, at et brugerbillede sendes til Venice til analyse.
- En særskilt knap til at slette partnerbilledet med det samme.
- Automatisk oprydning af privat session ved logout, lukning og inaktivitet.
- Mulighed for at eksportere eller slette alle lokale data.
- Sanitiseret supportlog for billedfejl uden den rå private prompt.

## Produkt og administration

- Betaling og abonnement via en voksen-venlig betalingsløsning.
- To adresser eller tydeligt adskilte indgange til brugerapp og admin.
- Automatisk beregning af modelpris i kroner ud fra Venices løbende priser.
- Flere aktive scene- og temapakker, styret centralt fra admin.
- Enkel kontooversigt før chat: plan, beskeder i dag, billeder og NSFW-status.
- To minutters onboarding; avancerede figurvalg flyttes til Tilpas efter første svar.
- Live health-linje og prompt-diff i admin.

## Senere

- Flere diskrete panikskærme og valgfri pinkode for at vende tilbage.
- Styring af kompatibelt udstyr via Bluetooth, hvor browser og sikkerhed tillader det.
- Installation som PWA med bedre offline-status og opdateringsbesked.

## Frue-ønsker — konkrete features

Forslag fra en dominant partner-oplevelse. Ikke planlagt endnu. Byg kun efter
samtykke, safeword og diskretionsvalg.

### 1. Hurtig statusrapport

Knapper i chatten, så brugeren kan sende status uden lang tekst:

- Tændt 1–10
- Aktiv plug / intet i
- E-stim-niveau
- Precum: nej / lidt / meget
- Sted: alene / arbejde / andre i nærheden

Statusen sendes med til AI-prompten og vises kompakt i session-state.

### 2. Udløsningslås

Partneren kan sætte tilladelse for sessionen eller dagen:

- Ikke tilladt
- Edge X gange, så stop
- Tilladt på et tidspunkt / efter opgaver
- Valgfri aftercare-regel, f.eks. sluge, hvis brugeren selv har slået det til

Appen tæller dage uden orgasme lokalt. Klimaks-knappen respekterer låsen, medmindre
brugeren bruger safeword eller slår lockout fra.

### 3. Plug-dagbog

Lokal log pr. session:

- Hvilken plug
- Start- og sluttid
- Sov med den: ja/nej
- Kommentar: behagelig / for stor / gled ud
- Forslag til næste størrelse

Ingen medicinsk rådgivning. Kun træningslog, som AI kan læse som kontekst.

### 4. Arbejds-mode som standard for notifikationer

Når sted = arbejde, eller når brugeren slår arbejds-mode til:

- Kun generiske notifikationer
- Ingen nøgenbilleder på låseskærm
- Kortere opgaver og tjek-ind i stedet for lange beskrivelser
- Panik-knap synlig i chat-header

Detaljeret/fræk låseskærmstekst må aldrig slås til automatisk.

### 5. Weekend- eller heldagsplan

En plan med 3–6 tidsblokke i stedet for én enkelt opgave, f.eks.:

- Morgen: vinget plug + lingeri
- Middag: tjek-ind og Kegels
- Eftermiddag: større plug, hvis brugeren er alene
- Aften: edge / eventuel tilladelse

Hver blok kræver accept. Brugeren kan udskyde eller stoppe uden straf i koden.

### 6. Partnerens egen lyst synlig

AI-partneren må med jævne mellemrum beskrive sin egen tilstand, ikke kun give ordrer:

- At hun er våd / tændt
- At hun leger med sig selv
- At hun har noget i numsen, hvis scenen tillader det

Styres af et promptfelt pr. scene, så det sker af sig selv og ikke kun når
brugeren spørger. Respekter SFW-laget, når NSFW er slået fra.
