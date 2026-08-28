# Stay — status

Opdateres løbende. Sidst: 28. aug 2026.

Appnavn: **Stay**  
Mail: teamstayapp@gmail.com  
GitHub: teamstayapp / stay-app (privat)  
Firma på kvittering: må hedde noget andet end Stay.

---

## Hvor vi er

- [x] 18+ og regelside
- [x] Firebase-login / opret med localStorage-fallback
- [x] Admin-panel (PC): kunder, plan, pause, opsig, churn
- [x] Rolle, figur, krop, personlighed
- [x] NSFW til/fra
- [x] Edge-loop med skabelon-replikkker
- [x] Lokalt vis billede/video (ingen upload)
- [x] Priser mock: 0 / 79 / 149 kr + tillæg
- [x] PWA-filer
- [x] GitHub Pages-workflow
- [x] Login-layout ala portal (email, kode, log ind)
- [x] Panik / diskret skærm
- [x] Mobil chatvisning med beskedbobler og partnerbillede-felt
- [x] Chatnavn gemt pr. bruger og sendt med til AI
- [x] Udstyrsvalg + eget felt sendt med til AI-prompten
- [x] Privat session eller lokal lagring valgt pr. bruger
- [x] Gendan/slet lokalt gemt chat og lokale billedfiler
- [x] Samtalestil: blid, kold, drilsk, dominerende eller eget ønske

---

## Mangler før en rigtig test med AI

- [ ] Kode pushet til GitHub
- [ ] Pages eller Cloudflare tændt
- [x] Firebase-kode klar (slår til med `.env.local`)
- [x] Firebase session-observer, e-mailbekræftelse og glemt adgangskode
- [x] Scenevalg med særskilte prompts og model pr. scene
- [x] Central Firestore-database til prompts og aktive scener
- [x] Firestore-regler: verificerede brugere læser, verificeret admin skriver
- [x] Uafhængigt valg af tekstmodel og billedmodel pr. scene
- [x] Cloudflare Worker-skitse (`worker/`)
- [ ] Firebase-projekt + nøgler
- [ ] Worker deployed + Venice-nøgle
- [x] Frontend + Worker-kode til chat via `venice-uncensored-role-play`
- [ ] Worker deployed + testet med rigtig Venice-nøgle
- [ ] Figur via image-API, tæl `imagesLeft` ned
- [ ] Rigtig database til brugere (login på tværs af enheder)

---

## Mangler før betalende kunder

- [ ] Betaling (MobilePay / voksen-venlig processor)
- [ ] Webhook → plan / opsig / churn i admin
- [ ] Glemt adgangskode
- [ ] Domain + `hej@…` til Gmail
- [ ] Vilkår, privatliv, 18+ på rigtigt domain

---

## Ønsker senere

- Panik-knap med pinkode for at komme tilbage
- Flere decoy-skærme (notes, vejr, “arbejde”)
- Maskine / e-stim / fuckmachine via Bluetooth (svært i PWA)
- Stemme / lyd
- Flere fetish-pakker som tilkøb
- Character-look gemt pr. bruger i skyen
- To URL’er: app og admin
- Appen på PC og telefon, samme konto

---

## Ikke på listen (bevidst)

- App Store / Google Play som hovedkanal
- Ulovligt indhold, mindreårige, schoolgirl/barn, incest-pakke
- Race-play som navngiven pakke
- How-to på rigtig skade

---

## Tekniske noter

Klik-test: `npm install && npm run dev`  
AI-chat: Venice API, nøgle kun på server  
Billeder er det I tjener på; chat koster øre
