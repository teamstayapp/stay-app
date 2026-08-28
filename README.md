# Stay

Se [STATUS.md](STATUS.md) for fremdrift, huller og ønsker.

18+ solo edge-PWA. Egen side — ikke App Store.

```bash
npm install
npm run dev
```

## GitHub + kør appen derfra

GitHub gemmer koden. GitHub Pages viser frontenden.

1. Opret et **privat** repo med navnet `stay-app`.
2. I mappen:

```bash
git init
git add .
git commit -m "Stay MVP"
git branch -M main
git remote add origin https://github.com/teamstayapp/stay-app.git
git push -u origin main
```

3. GitHub → Settings → Pages → Source: **GitHub Actions**.
4. Når workflow’en er grøn: `https://teamstayapp.github.io/stay-app/`

Ingen Venice-nøgle i repoet. Pages er klik-testen.

Se [AI_OPSAETNING.md](AI_OPSAETNING.md) for at udgive Worker og slå rigtig
Venice-chat til uden at lægge API-nøglen i browseren.

Se [FIREBASE_LOGIN.md](FIREBASE_LOGIN.md) for rigtigt login, e-mailbekræftelse
og nulstilling af adgangskode.

Se [PROMPT_ADMIN.md](PROMPT_ADMIN.md) for scenevalg, adminredigering af prompts
og modelvalg.

## Konto (MVP)

Brugere ligger i `localStorage`. Senere: rigtig backend + hashed kode.

- Opret / log ind efter 18+
- Demo-admin: `admin@stay.local` / `admin`
- Admin: kunder, plan, pause, opsig, churn

## Priser (husk)

| Plan | kr/md | Chat | Billeder | NSFW | Pakker |
|---|---|---|---|---|---|
| Prøv | 0 | 20 msg/dag | 2 | nej | kerne |
| Solo | 79 | åben | 25 | ja | kerne |
| Plus | 149 | åben | 80 | ja | alle |

Tillæg: +50 billeder 49 kr · +150 billeder 119 kr · alle pakker 39 kr (på Solo).

Avance sidder i billedloftet. Venice-chat er øre. Kost pr. billede ca. 0,05–0,10 USD.

Betaling: egen side, voksen-venlig processor / MobilePay — ikke App Store IAP.

## AI

- Chat: Venice `venice-uncensored-role-play` (eller `venice-uncensored-1-2`)
- Figurer: test Hunyuan/Flux/Seedream hos Venice; ellers spicy image-API
- Nøgle kun på server

## Regler

Kun voksne. Ingen schoolgirl/barn, incest-pakke, race-play-pakke, how-to på skade.
NSFW-knap slår nøgen sprog/figur til.
