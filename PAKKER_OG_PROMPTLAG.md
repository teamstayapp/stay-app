# Stay — prompt- og udstyrspakker

## Lagene

| Central plan | NSFW-valg | Aktive promptlag |
| --- | --- | --- |
| Prøv | Fra eller til | Blød / SFW |
| Solo | Fra | Blød / SFW |
| Solo | Til | Blød / SFW + Fræk / NSFW |
| Plus | Fra | Blød / SFW |
| Plus | Til | Blød / SFW + Fræk / NSFW + Plus |

Planen kommer fra `userEntitlements/{uid}`. Workeren overskriver
browserprofilens plan før hvert AI-kald. Plus-laget gælder for tekst, opgaver og
billedprompt.

Startbeskeden vælges i appen efter den observerede Firestore-plan. De
efterfølgende AI-svar og alle kvotebelagte kald kontrolleres server-side.

## Udstyr

`contentCatalog/default` har `version: 2`. Hvert udstyrsfelt indeholder:

- stabilt ID
- navn hos brugeren
- gruppe
- AI-ordlyd
- aktiv/inaktiv
- mindste plan: `free`, `solo` eller `plus`

Free kan som standard vælge glidecreme, kondom, vibrator og dildo. Solo får
desuden kerneudstyr, wand, færdigt e-stim, plug-varianter og halsbånd. Plus får
hele kataloget. Workeren henter det samme centrale katalog før chat- og
analyse-kaldet og håndhæver admins mindste plan server-side. Hvis kataloget
midlertidigt ikke kan hentes, bruges en konservativ indbygget fallbackliste.
Nye egne udstyrsfelter er Plus som standard.

Eget udstyr sendes ikke videre på Free. På Solo og Plus behandles det som en
kort beskrivelse, aldrig som en instruktion.

## Fast sikkerhed

De redigerbare prompts kan ikke fjerne Workerens faste krav:

- tydeligt voksne og samtykkende fiktive roller
- safeword, stop, pause og ubehag stopper scenen
- ingen mindreårige/ageplay, incest, grooming, raceplay eller ikke-samtykke
- ingen praktiske instruktioner til kvælning, blod, skæring, ild, nåle,
  branding eller anden farlig skade
- e-stim kun som færdigt legetøj; ingen DIY eller strømvejledning
- reb, manchetter, bid, spreader og hætte kun som aftalt voksenfantasi uden
  farlig binding eller åndedrætsbegrænsning

## Udgivelse

Efter upload/deploy:

1. **Admin → Prompts → Gendan standard → Udgiv til alle**
2. **Admin → Indhold → Gem og udgiv til alle**
3. Test Free, Solo og Plus med NSFW både fra og til.
