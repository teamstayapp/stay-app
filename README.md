# Stay

Se [STATUS.md](STATUS.md) for fremdrift og mangler, [CHANGELOG.md](CHANGELOG.md)
for leverede ændringer, [ROADMAP.md](ROADMAP.md) for den besluttede rækkefølge
og [IDEER.md](IDEER.md) for idéer til senere.

18+ solo edge-PWA. Egen side — ikke App Store.

Efter login åbner appen på en kort konto-/startside med plan, resterende
AI-forbrug og hurtig start. Den komplette opsætning er stadig tilgængelig via
**Tilpas partner og scene mere**.

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
og modelvalg. Samme dokument beskriver også de centrale udstyrs- og temafelter
under **Admin → Indhold**.

Se [FORBRUG_OG_GRAENSER.md](FORBRUG_OG_GRAENSER.md) for AI-forbrug,
abonnementsgrænser og manuelle tilkøb.

Se [KONTO_I_FIRESTORE.md](KONTO_I_FIRESTORE.md) for central plan, billedsaldo,
pause, udløb og Worker-blokering.

Se [KROPSFUNKTION.md](KROPSFUNKTION.md) for den interaktive partnerkrop,
AI-flowet og de faste sikkerhedsgrænser.

Se [KLIMAKS_OG_FAVORIT.md](KLIMAKS_OG_FAVORIT.md) for **Tæt på**,
**Jeg kommer**, brugerens anatomivalg og lokal billedfavorit.

Se [PARTNER_IDENTITET.md](PARTNER_IDENTITET.md) for partnernavn, fast
referencebillede, **Ny positur – samme partner** og de fire gratis genvalg.

Se [WEB_PUSH_OPSAETNING.md](WEB_PUSH_OPSAETNING.md) for VAPID, Cloudflare KV,
Cron Trigger og opgaver via “Til rådighed”, også når appen er lukket.

## Konto

Login bruger Firebase Authentication. Plan, status, udløb, billedbonus,
chatnavn og centrale scene-prompts ligger i Firestore. Private eller lokalt
gemte chats håndteres på brugerens enhed.

- Opret / log ind efter 18+
- Adminmail styres med `VITE_ADMIN_EMAIL`
- Admin: centrale kunder, plan, billedsaldo, udløb, pause, opsig og churn

## Priser (husk)

| Plan | kr/md | Chat | Billeder | Analyser | NSFW | Pakker |
|---|---:|---:|---:|---:|---|---|
| Prøv | 0 | 50/dag | 2/md | 5/md | nej | kerne |
| Solo | 79 | 500/dag | 25/md | 100/md | ja | kerne |
| Plus | 149 | 1.000/dag | 80/md | 300/md | ja | alle |

Tillæg: +50 billeder 49 kr · +150 billeder 119 kr · +50 analyser 19 kr ·
+200 analyser 59 kr · alle pakker 39 kr (på Solo).

Avance sidder i billedloftet. Venice-chat er øre. Kost pr. billede ca. 0,05–0,10 USD.

Betaling: egen side, voksen-venlig processor / MobilePay — ikke App Store IAP.

## AI

- Chat: Venice `venice-uncensored-role-play` (eller `venice-uncensored-1-2`)
- Figurer: separat privat Venice-billedmodel valgt af admin pr. scene
- Brugerbilleder: privat vision-analyse gennem Cloudflare Workeren
- Opgaver: egen adminprompt pr. scene og den aktuelle chat som kontekst
- Kropsberøring: validerede forfra/bagfra-zoner med en særskilt AI-hensigt
- Klimaks: særskilte Tæt på/Jeg kommer-hensigter med servervalideret anatomi
- Partnerfavorit: ét genereret billede kan genbruges lokalt uden nyt AI-kald
- Partneridentitet: et referencebillede bruges til nye positurer via privat
  billedredigering; op til fire godkendte billeder kan genvælges gratis
- Nøgle kun på server

## Regler

Kun voksne. Ingen schoolgirl/barn, incest-pakke, race-play-pakke, how-to på skade.
NSFW-knap slår nøgen sprog/figur til.
