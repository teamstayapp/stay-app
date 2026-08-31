# Web Push og “Til rådighed”

Appen kan sende de valgte opgaver som Web Push, også når selve Stay-vinduet er
lukket. Brugeren skal selv slå funktionen til. Den konkrete opgavetekst og valget
“diskret/fræk” gemmes kun lokalt på telefonen; Cloudflare gemmer abonnementet,
intervallet, antallet og tidspunktet for næste besked.

## 1. Lav VAPID-nøgler én gang

Kør lokalt:

```bash
npx web-push generate-vapid-keys
```

På Windows PowerShell kan scriptpolitikken blokere `npx.ps1`. Brug da denne
kommando i PowerShell:

```powershell
npx.cmd web-push generate-vapid-keys
```

Kommandoen skal køres i PowerShell/Terminal — ikke inde i Node-vinduet med
prompten `>`.

Gem både den offentlige og private nøgle. Den private nøgle må aldrig lægges i
GitHub eller i appens kildekode.

## 2. GitHub

Gå til **Settings → Secrets and variables → Actions → Variables** og opret:

- `VITE_VAPID_PUBLIC` = den offentlige VAPID-nøgle.

Workflow-filen sender allerede variablen videre til Vite-buildet.

## 3. Cloudflare Worker

Under **Settings → Variables and Secrets**:

- Secret `VAPID_PUBLIC` = den offentlige nøgle.
- Secret `VAPID_PRIVATE` = den private nøgle.
- Text `VAPID_SUBJECT` = `mailto:teamstayapp@gmail.com`.

Under **Bindings** oprettes en KV Namespace-binding:

- Variable name: `PUSH_SUBS`
- KV namespace: opret fx `stay-push-subscriptions`.

Under **Triggers → Cron Triggers** oprettes:

```text
*/5 * * * *
```

Det betyder, at Worker kontrollerer for forfaldne opgaver hvert femte minut.

Upload derefter den opdaterede `worker/stay-api-worker-manual.js`, eller deploy
Worker-mappen med Wrangler. Kontrollér `/health`; `features.webPush` skal være
`true`.

## 4. iPhone

Web Push på iPhone bruges fra Stay som installeret webapp på hjemmeskærmen.
Åbn Stay derfra, log ind, vælg opgaveplan, tryk **Til rådighed**, og tillad
notifikationer. Brugeren kan altid slå funktionen fra igen i chatten eller i
iPhones notifikationsindstillinger.

## Datasikkerhed

- Opgaveteksten sendes ikke fra Worker og gemmes ikke i KV.
- Worker sender et tomt, VAPID-godkendt push-signal.
- Service Workeren vælger lokalt en diskret eller konkret tekst.
- Døde abonnementer slettes automatisk, når push-tjenesten svarer 404 eller 410.
