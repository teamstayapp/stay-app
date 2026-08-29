# Stay — slå rigtig AI-chat og billeder til

Koden er klar til Venice AI via en Cloudflare Worker. Venice-nøglen må aldrig
skrives i GitHub-koden eller i en `VITE_`-variabel.

## Det skal bruges

- En Venice-konto med kredit og en API-nøgle
- En Cloudflare-konto
- Node.js installeret på computeren

## 1. Udgiv Cloudflare Worker

Åbn Terminal/PowerShell i projektmappen og kør:

```bash
npx wrangler login
npx wrangler secret put VENICE_API_KEY --config worker/wrangler.toml
npx wrangler secret put FIREBASE_PROJECT_ID --config worker/wrangler.toml
npx wrangler deploy --config worker/wrangler.toml
```

Ved første `secret put` indsættes Venice API-nøglen. Ved den næste indsættes
Firebase-projektets `projectId`. Værdierne kommer ikke i GitHub.

Gem Worker-adressen fra sidste kommando. Den ligner:

```text
https://stay-api.<dit-navn>.workers.dev
```

Kontrollér opsætningen ved at åbne:

```text
https://stay-api.<dit-navn>.workers.dev/health
```

Svaret skal indeholde `"ok":true` og `"venice":true`.

## 2. Giv GitHub Pages Worker-adressen

1. Åbn `teamstayapp/stay-app` på GitHub.
2. Gå til **Settings → Secrets and variables → Actions → Variables**.
3. Opret en repository variable med navnet `VITE_API_URL`.
4. Indsæt Worker-adressen som værdi, uden `/chat` til sidst.
5. Gå til **Actions → GitHub Pages → Run workflow**.

Efter en grøn kørsel viser chatten teksten **AI-chat aktiv** nederst i scenen.

## Billedfunktionerne

Den samme Cloudflare Worker indeholder nu også:

- `POST /image/generate` til et AI-genereret partnerportræt
- `POST /vision` til analyse af et billede, som brugeren vælger i chatten
- serverkontrol af daglige/månedlige grænser før hvert Venice-kald
- registrering af kald og tokens pr. AI-model i Firestore

Admin vælger billedgenereringsmodellen særskilt for hver scene. Standardlisten
indeholder kun private billedmodeller, som virker med en Venice-nøgle sat til
**Private models only**. Tekstmodellerne i appen understøtter også vision.

Hvis Workeren indsættes manuelt i Cloudflare, bruges hele filen
`worker/stay-api-worker-manual.js`, hvorefter der trykkes **Deploy**.

Forbrugskontrollen kræver også de nyeste regler fra `firestore.rules`. Udgiv
dem i Firebase, før den nye Worker testes. Se [FORBRUG_OG_GRAENSER.md](FORBRUG_OG_GRAENSER.md).

## Sikkerhed før offentlig test

Workeren begrænser størrelse og historik, validerer Firebase-sessionen, tjekker
central plan/status/udløb og skjuler Venice-nøglen. CORS er begrænset til
`https://teamstayapp.github.io`. Før bred offentlig lancering mangler der stadig
en kort burst-rate-limit pr. bruger/IP oven på dags- og månedsgrænserne.
