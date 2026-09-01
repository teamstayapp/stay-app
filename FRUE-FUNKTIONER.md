# Frue-funktioner

Denne opdatering samler Frue-status, udløsningslås, arbejds-mode, heldagsplan,
plug-dagbog og nye Plus-prompts i den eksisterende Stay-app.

## I appen

- **Opsætning → Frue** indeholder arbejds-mode, udløsningslås, heldagsplan og
  plug-dagbog.
- **Chat → Status** indeholder hurtig status for tænding, fire plugstørrelser,
  trusser, precum, sted og e-stim. Panelet er lukket som standard, så
  chatvinduet beholder pladsen.
- **Natte-lås** blokerer klimaks mellem kl. 22 og 08 og kræver morgenrapport.
- Heldagsplanen indeholder nu morgen, formiddag, middag, eftermiddag, aften,
  nat og søndag.
- **Aktuel opgave → Ikke fuldført** afslutter opgaven og lader AI-partneren
  reagere uden at gætte på årsagen.

Frue-status og plug-dagbog gemmes kun på enheden. Safeword, stop, minuslisten og
brugerens øvrige grænser har altid forrang.

## Efter upload

1. Upload hele appens indhold til GitHub og kør GitHub Pages-buildet.
2. Erstat Cloudflare Worker-koden med `worker/stay-api-worker-manual.js` og
   deploy den.
3. I Admin vælges **Gendan standard** og **Udgiv** for både scener og indhold,
   så katalog version 9, Master-scenerne og de nye Plus-prompts bliver centrale.
4. Firebase-konfigurationen skal ikke ændres.
