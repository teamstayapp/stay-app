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

Bemærk: Repositoryet kan være privat, men en GitHub Pages-side kan afhængigt af
GitHub-planen være offentlig. Der er ingen hemmelige nøgler i pakken.
