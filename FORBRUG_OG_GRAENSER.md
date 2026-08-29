# Stay — AI-forbrug, grænser og tilkøb

## Det registreres

Stay gemmer ikke chatteksten i forbrugsstatistikken. Der registreres kun:

- antal chatkald pr. dag og måned
- antal genererede billeder pr. måned
- antal analyserede brugerbilleder pr. måned
- anvendt AI-model, antal kald og rapporterede input-/outputtokens
- Firebase-bruger-id og e-mail, så admin kan finde kontoen

## Standardgrænser

| Plan | Chat pr. dag | Genererede billeder/md. | Billedanalyser/md. |
| --- | ---: | ---: | ---: |
| Prøv | 50 | 2 | 5 |
| Solo | 500 | 25 | 100 |
| Plus | 1.000 | 80 | 300 |

Admin kan ændre tallene under **Admin → AI-forbrug → Centrale grænser**.
Ændringen gemmes i `usageConfig/default` i Firestore og bruges straks af
Cloudflare Workeren.

## Håndhævelse

Workeren læser brugerens centrale plan, kontostatus, udløb, bonus og aktuelle
forbrug, før den kontakter Venice. Pause/lukning/udløb returnerer status 403;
opbrugt kvote returnerer status 429. I begge tilfælde udføres der ikke et
betalingspligtigt AI-kald. Chat nulstilles efter UTC-dato. Billedgenerering og
billedanalyse nulstilles ved en ny UTC-måned.

Admin-kontoen bruger Plus-grænserne. Andre brugere starter på Prøv, indtil en
plan er godkendt i `userEntitlements`.

## Tilkøb

Brugeren vælger en plan eller et tilkøb under **Abonnement**. Indtil en rigtig
betalings-webhook er koblet på, oprettes en afventende post i
`purchaseRequests`. Admin åbner **AI-forbrug**, kontrollerer betalingen og
trykker **Godkend** eller **Afvis**.

Ved godkendelse:

- en plan ændrer brugerens centrale plan
- billed- og analysetilkøb lægges til den aktuelle måneds kvote
- temapakken låser de ekstra pakker op

## Udgiv ændringen

1. Upload hele GitHub-pakken og vent på en grøn GitHub Pages-kørsel.
2. Firebase → Firestore Database → **Rules**: indsæt hele `firestore.rules` og
   tryk **Publish**.
3. Cloudflare → `stay-api` → **Edit code**: erstat hele koden med
   `worker/stay-api-worker-manual.js` og tryk **Deploy**.
4. Åbn Workerens `/health`. Svaret skal vise `"usageLimits":true` og
   `"accountAccess":true`.
5. Log ind som admin → **AI-forbrug** → kontrollér standardgrænserne og tryk
   **Gem grænser**.

Der skal ikke oprettes nye Cloudflare-nøgler eller databaser til denne version;
forbruget ligger i den eksisterende Firestore-database.
