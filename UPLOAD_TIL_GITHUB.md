# Upload Stay til GitHub

## 1. Opret repository

1. Log ind på GitHub som `teamstayapp`.
2. Vælg **Create new repository**.
3. Skriv `stay-app` som navn.
4. Vælg **Private**.
5. Sæt ikke flueben ved README, `.gitignore` eller license.
6. Tryk **Create repository**.

## 2. Upload filerne

1. Pak `stay-app-github-ready.zip` ud på en computer.
2. Åbn det tomme repository på GitHub.
3. Vælg **uploading an existing file** eller **Add file → Upload files**.
4. Træk hele indholdet af mappen `stay-app` ind på siden. Upload selve
   indholdet, så `package.json` ligger direkte i repositoryets topniveau.
5. Kontrollér, at også `.github`, `.gitignore` og `.env.example` kommer med.
6. Skriv `Stay MVP` i commit-feltet og vælg **Commit changes**.

## 3. Slå GitHub Pages til

1. Åbn **Settings → Pages** i repositoryet.
2. Under **Build and deployment** vælg **GitHub Actions** som source.
3. Åbn fanen **Actions** og vent på, at workflowet **GitHub Pages** bliver grønt.
4. Appen bliver derefter tilgængelig på:
   `https://teamstayapp.github.io/stay-app/`

## 4. Udgiv de nye prompt- og udstyrspakker

1. Upload først hele den nye apppakke til GitHub og vent på en grøn Pages-kørsel.
2. Kopiér `worker/stay-api-worker-manual.js` ind i Cloudflare Worker-editoren
   og deploy.
3. Log ind som admin i Stay.
4. Åbn **Admin → Prompts**, tryk **Gendan standard** og derefter
   **Udgiv til alle**.
5. Åbn **Admin → Indhold**. De nye katalogfelter vises automatisk sammen med
   eksisterende redigeringer. Tryk **Gem og udgiv til alle** for at gemme
   katalogversion 2 centralt.
6. Test én Free-, Solo- og Plus-konto. Plus-laget må kun kunne ses på
   Plus + NSFW.

## 5. Test kropsfunktionen

1. Start en scene og tryk **Rør krop** øverst i chatten.
2. Kontrollér både **Forfra** og **Bagfra**, og tryk på mindst to zoner.
3. Kontrollér, at trykket vises som en brugerhandling, og at AI-partneren svarer
   på den valgte zone i stedet for med et gammelt standardsvar.
4. Test Free med NSFW-valg: svaret skal stadig være SFW og udenpå tøjet.
5. Tryk på hals/nakke: svaret må ikke instruere i tryk eller kvælning.
6. Tryk **Noter**, safeword eller **For meget**: kropsvisningen skal lukke.

## 6. Test Tæt på, Jeg kommer og favorit

1. Vælg først **Penis** eller **Vulva** under **Din krop i chatten**.
2. Start en scene og tryk **Tæt på**. AI-svaret skal passe til valget og den
   aktive scenes stil.
3. Tryk **Jeg kommer**. Svaret skal være et nyt AI-svar; **Aftercare** ligger
   fortsat som en separat knap.
4. Free skal få et varmt, ikke-eksplicit svar, også hvis NSFW tidligere har
   været valgt.
5. Opret et partnerbillede, tryk **Gem som favorit**, lav eventuelt et andet
   billede og tryk **Brug favorit**. Genbrug må ikke reducere billedsaldoen.
6. Favoritten ligger kun på den aktuelle enhed. Test **Slet favorit** separat.

Bemærk: Repositoryet kan være privat, men en GitHub Pages-side kan afhængigt af
GitHub-planen være offentlig. Der er ingen hemmelige nøgler i pakken.
