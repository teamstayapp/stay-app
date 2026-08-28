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
- [x] Brugerbilleder vises i chatten; billeder kan sendes til privat Venice-billedanalyse
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
- [x] Valg mellem diskrete og detaljerede/frække opgavebeskeder
- [x] “Giv mig en opgave”-knap baseret på scene, chat, grænser, intensitet og udstyr
- [x] Adminprompt pr. scene til opgaveknappen
- [x] AI-genereret partnerbillede fra scenens separate billedmodel
- [x] AI aflæser brugerbilleder med den aktuelle private vision-kompatible tekstmodel
- [x] Central forbrugstælling for chat, billedgenerering og billedanalyse
- [x] AI-modelstatistik med kald samt input- og outputtokens i admin
- [x] Adminredigerbare grænser pr. plan, som gælder straks i Workeren
- [x] Tilkøb og abonnement sendes til admin til manuel godkendelse

---

## Mangler før en rigtig test med AI

- [ ] Kode pushet til GitHub
- [x] GitHub Pages og Cloudflare Worker tændt
- [x] Firebase-kode klar (slår til med `.env.local`)
- [x] Firebase session-observer, e-mailbekræftelse og glemt adgangskode
- [x] Scenevalg med særskilte prompts og model pr. scene
- [x] Central Firestore-database til prompts og aktive scener
- [x] Firestore-regler: verificerede brugere læser, verificeret admin skriver
- [x] Uafhængigt valg af tekstmodel og billedmodel pr. scene
- [x] Cloudflare Worker-skitse (`worker/`)
- [x] Firebase-projekt + nøgler
- [x] Worker deployed + Venice-nøgle
- [x] Frontend + Worker-kode til chat via `venice-uncensored-role-play`
- [x] Worker deployed + testet med rigtig Venice-nøgle
- [ ] Opdateret Worker med opgavehensigt, billedgenerering og vision deployet
- [ ] Opdaterede Firestore-regler til forbrug og tilkøb udgivet
- [ ] Ny Worker med serverhåndhævede forbrugsgrænser deployet
- [ ] Rigtige mobil-pushbeskeder og tidsplanlægning i Cloudflare
- [x] Figur via image-API, tæl `imagesLeft` ned i den aktive profil
- [x] Centrale brugerrettigheder, forbrug og månedlige billedtilkøb i Firestore

---

## Mangler før betalende kunder

- [ ] Firestore er eneste sandhed for plan, saldo, pause, udløb og opsigelse
- [ ] Worker afviser pausede, udløbne og lukkede konti
- [ ] Central kundeliste med plan, sidste login, saldo og status
- [ ] Betaling (MobilePay / voksen-venlig processor)
- [ ] Webhook → plan / opsig / churn i admin
- [x] Glemt adgangskode
- [ ] Domain + `hej@…` til Gmail
- [ ] Vilkår, privatliv, 18+ på rigtigt domain
- [ ] Session-timeout, panikpinkode og valgfrit notifikationsniveau med advarsel
- [ ] Adskilte dev- og produktionsmiljøer

Den prioriterede rækkefølge og de bevidste fravalg står i
[ROADMAP.md](ROADMAP.md).

---

## Ønsker senere

Den fulde idébank ligger i [IDEER.md](IDEER.md).

- Panik-knap med pinkode for at komme tilbage
- Flere decoy-skærme (notes, vejr, “arbejde”)
- Maskine / e-stim / fuckmachine via Bluetooth (svært i PWA)
- Stemme / lyd
- Flere fetish-pakker som tilkøb
- Character-look gemt pr. bruger i skyen
- To URL’er: app og admin
- Appen på PC og telefon, samme konto
- Automatisk prisberegning pr. AI-model ud fra Venices aktuelle priser

---

## Ikke på listen (bevidst)

- App Store / Google Play som hovedkanal
- Ulovligt indhold, mindreårige, schoolgirl/barn, incest-pakke
- Race-play som navngiven pakke
- How-to på rigtig skade

---

## Tekniske noter

Klik-test: `npm install && npm run dev`  
AI-chat, billedgenerering og vision: Venice API, nøgle kun på server  
Billeder er det I tjener på; chat koster øre
