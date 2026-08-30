# Stay — ændringslog

Denne fil følger med hver GitHub-pakke. Nyeste ændringer står øverst.

## 30. august 2026 — iPhone-safe-area, partnergalleri og lyd

- Toppen af både almindelige sider og chatten tager nu højde for iPhones
  statuslinje og Dynamic Island via `safe-area-inset-top`.
- Den eksisterende viewport- og PWA-opsætning er kontrolleret og bruger allerede
  `viewport-fit=cover` samt sort, gennemsigtig iOS-statuslinje.
- De seneste partnerbilleder vises som et vandret galleri under det store
  partnerbillede og kan vælges igen uden ny billedgenerering.
- Ved enhedslagring gemmes højst 12 billeder pr. bruger i IndexedDB. Store
  billeddata lægges ikke i `localStorage`.
- I privat tilstand gemmes galleriet ikke permanent, og billeder fra den private
  session ryddes, når sessionen forlades.
- Partnerens status reagerer ved høj varme, og ved 100 starter en ny cyklus.
- Tilføjet frivillig “Lyd til/fra” i chatten. Lyd er slået fra som standard og
  klargøres ved brugerens tryk, så det også virker med iPhones lydbegrænsninger.
- Tidligere timere, 18+-tekster, Cloudflare Worker og eksisterende billeder er
  bevaret.

## 29. august 2026 — UI-, sprog-, fræk- og leg-pakker samlet

- De fire seneste pakker er samlet i én app- og Worker-version.
- Billedanalyse bruger nu den særskilte visionmodel `mistral-31-24b`, mens
  admin fortsat kan vælge en anden understøttet visionmodel pr. scene.
- Partnerbilleder bestilles som lodrette helfigurbilleder fra hoved til fødder,
  og den store scenevisning viser hele billedet med `contain`.
- Tilføjet dagens ordre, favorit-scene på enheden, edge-ur, “10 ryk”,
  “En gang til” og “Hold mig”.
- Tilføjet hårvalget Pjusket samt valg af lingeri for bruger og partner.
- Tilføjet voksen MILF-rolle og voksen sissy-tema. Skolepige-/skolerollen fra
  indsendte kladder er ikke med; den eksisterende universitetsunderviser er
  bevaret.
- Lingerivalg sendes både til chatprompten og partnerens billedprompt.
- Indholdskataloget er hævet til version 3, så de nye felter flettes ind i et
  eksisterende Firestore-katalog uden at slette admins egne felter.
- Cloudflare-manualfilen er regenereret fra samme Worker-kilde.

## 29. august 2026 — panikknap kan åbne valgfri iPhone-app

- Panikindstillingerne har fået “Valgfri app via Genveje”.
- Brugeren opretter en Apple Genvej med handlingen “Åbn app”, vælger en vilkårlig
  app og skriver genvejens navn i Stay.
- Panikknappen skjuler straks Stay, gemmer den aktive scene ved valgt
  enhedslagring og starter derefter den valgte genvej/app.
- Der er en direkte knap til at åbne Apples Genveje-editor samt en kort
  tretrinsvejledning i appen.

## 29. august 2026 — bedre automatisk loginudfyldning

- Den tidligere brugers e-mail vises ikke længere som en særskilt tekst på
  loginforsiden.
- En vellykket loginadresse huskes lokalt og sættes direkte ind i e-mailfeltet
  næste gang, uden at adgangskoden gemmes af Stay.
- Loginformularen bruger nu de korrekte feltnavne og browsermarkeringer til
  Safari/iPhone, Android og adgangskodeadministratorer.
- Adgangskoden kan fortsat udfyldes af telefonens sikre adgangskodefunktion;
  Stay gemmer aldrig adgangskoden til automatisk udfyldning.

## 29. august 2026 — foldeliste, adminmenu og valgfri panikdestination

- Udstyrslisten i opsætningen kan nu åbnes og lukkes med ét tryk og viser antal
  valgte felter, mens den er foldet sammen.
- Admin har fået en mobilvenlig sidemenu med Overblik, Kunder, AI & prompts,
  Priser & grænser, Indhold og Indstillinger.
- Sidemenuen kan åbnes og lukkes fra alle adminområder, lukkes med Escape eller
  ved tryk uden for menuen og fremhæver det aktive område.
- Panikknappen kan indstilles til Stay-noter, vejr, kalender eller et selvvalgt
  app-/web-link.
- Ved lokal enhedslagring gemmer panikknappen den aktive scene direkte, før den
  skifter væk. Private sessioner gemmes fortsat ikke.
- Stay skjules straks som “Noter”, mens et eksternt app-link åbnes. Usikre
  `javascript:`, `data:` og `file:`-links afvises.

## 29. august 2026 — faste kropskort til berøring

- **Rør krop** bruger nu et fast kropskort i stedet for et varierende
  AI-partnerbillede, så trykzonerne sidder mere præcist.
- Der er særskilte kort til Master og Mistress, både forfra og bagfra.
- Mund, hals/nakke, bryst, mave, skød, hånd, lår og bagdel er tilpasset de nye
  kort, mens AI-reaktioner, planer, NSFW, temaer og safeword er uændrede.
- Det genererede 2:3-partnerbillede vises fortsat stort i opsætningen og som
  partnerens billede i chatten.

## 29. august 2026 — større helfigurbilleder

- Partnerbilleder genereres nu lodret i 2:3-format via Venices native billed-API.
- Billedprompten kræver én tydeligt voksen figur fra hoved til fødder og modvirker
  nærbilleder, beskæring, sorte felter og utydelig belysning.
- Hvert nyt billede får en tilfældig seed, så gentagne tryk giver en reel variation.
- Appens partnerfelt er gjort markant større og bruger `contain`, så hele billedet
  vises uden yderligere beskæring.
- Den interaktive kropsvisning er også større og følger det lodrette 2:3-format.
- Tomme, beskadigede eller næsten sorte billedsvar afvises i appen; et allerede
  fungerende partnerbillede bliver derfor stående.

## 28. august 2026 — Tæt på, Jeg kommer og billedfavorit

- Brugeren kan vælge penis eller vulva som egen anatomi uden, at appen antager
  brugerens køn.
- **Tæt på** og **Jeg kommer** er nu særskilte AI-handlinger, som bruger den
  valgte anatomi, aktuelle scene, plan og aktive promptlag.
- **Aftercare** er gjort til en separat knap, så brugeren selv vælger overgangen
  efter klimakssvaret.
- Free tvinges server-side til et varmt, ikke-eksplicit svar, selv hvis en
  ændret browser forsøger at sende NSFW.
- Ukendte anatomiværdier normaliseres server-side og kan ikke bruges som
  prompt-injektion.
- Et oprettet AI-partnerbillede kan gemmes som favorit i IndexedDB på brugerens
  egen enhed, genbruges gratis eller slettes igen.
- Favoritten følger ikke med til andre telefoner og bruger ingen ekstra
  billedgenerering ved genbrug.

## 28. august 2026 — interaktiv kropsberøring

- Tilføjet **Rør krop** direkte i chatten med forfra- og bagfra-visning.
- Trykbare zoner: mund, hals/nakke, bryst, mave, skød, lår, hånd og bagdel.
- Partnerens oprettede AI-billede bruges som baggrund; uden et billede vises en
  diskret silhuet.
- Hvert tryk sendes som en særskilt `touch`-handling til AI’en sammen med den
  aktuelle scene, plan, NSFW-valg, temaer, udstyr og safeword.
- Ukendte zoner afvises server-side. Free holdes SFW, og bagdel udvikles ikke
  til anal handling, medmindre det relevante tema er valgt.
- Hals/nakke har en fast Worker-regel mod tryk, kvælning og begrænset
  vejrtrækning.
- Panikknap, safeword, “For meget” og “Finish” lukker kropsvisningen straks.
- Kropsklik gemmes eller slettes som resten af chatten efter brugerens valgte
  privatlivstilstand.

## 28. august 2026 — spicy-, Plus- og udstyrspakker

- Flettet de nye promptpakker ind som tre centrale lag pr. scene:
  Blød/SFW, Fræk/NSFW og Plus.
- Hvert lag har separat startbesked, systemprompt, opgaveprompt og billedprompt.
- Workeren henter lagene fra Firestore og afgør adgang ud fra den centrale
  Firestore-plan; Plus-teksten kan ikke slås til via browseren.
- Free får kun det bløde lag. Solo kan få NSFW-laget. Plus kan få begge ekstra
  lag, når brugeren selv har slået NSFW til.
- Udstyrskataloget er udvidet med sikring, vibratorer, maskiner, milking,
  anal/prostata, hud, let bondage, fetish-tøj og voksen pet/worship.
- Admin kan vælge mindste plan pr. udstyr samt redigere gruppe, navn og
  AI-ordlyd.
- Workeren håndhæver udstyrsadgangen igen server-side og sender højst 24 valgte
  stykker udstyr videre til prompten.
- E-stim, reb, hætte, voks og lignende har faste sikkerhedsnoter; farlige
  how-to-instruktioner er stadig blokeret af Workeren.
- Gamle `contentCatalog/default`-dokumenter migreres til katalogversion 3 og
  beholder eksisterende redigeringer og egne felter.

## 28. august 2026 — Firestore er kontoens sandhed

- Flyttet rigtig plan, kontostatus, billedbonus og udløb til
  `userEntitlements/{uid}` i Firestore.
- Nye verificerede brugere opretter automatisk en låst Free-standardkonto;
  efter oprettelsen kan kun admin ændre rettigheder.
- Admins kundeliste læser `userProfiles` og `userEntitlements` centralt i stedet
  for browserens lokale kundeliste.
- Admin kan ændre plan, ekstra billedsaldo, udløbsdato, pause, opsigelse, churn
  og reaktivering.
- Billedsaldo beregnes af planens kvote + månedens bonus - vellykket forbrug.
- Brugerappen låses straks ved pause, lukning eller udløbet betalingsplan.
- Workeren kontrollerer samme status før hvert tekst-, billed- og visionkald og
  kontakter ikke Venice ved blokering.
- Free-planens NSFW-valg håndhæves også server-side.
- Godkendelse af en manuel betalingsplan aktiverer kontoen og giver 30 dages
  udløb; en eksisterende fremtidig periode forlænges med 30 dage.
- Tilføjet `KONTO_I_FIRESTORE.md` med datamodel og installationsrækkefølge.

## 28. august 2026 — redigerbart udstyr og temaer

- Tilføjet **Admin → Indhold** med opret, redigér, aktiv/deaktivér og slet.
- Udstyr har særskilt navn hos brugeren og ordlyd sendt til AI.
- Temaer har navn, kort beskrivelse, AI-instruktion samt gratis/betalt-status.
- Indholdet gemmes centralt i Firestore-dokumentet `contentCatalog/default` og
  opdateres live hos alle indloggede brugere.
- Deaktiverede og slettede felter filtreres fra, før en ny scene starter.
- Firestore-reglerne er udvidet, så verificerede brugere kan læse kataloget,
  mens kun `teamstayapp@gmail.com` kan ændre det.
- Cloudflare Worker-prompten modtager de aktuelle adminredigerede navne og
  temainstruktioner; de faste sikkerhedsregler ligger fortsat bagefter.

## 28. august 2026 — prioriteret kundeready-roadmap

- Sorteret konto, betaling, edge-loop, billeder, diskretion, onboarding, admin
  og drift i P0/P1/P2.
- Markerede hvilke forslag der allerede er lavet eller kun delvist lavet.
- Besluttet ikke at gemme rå private billedprompts. Diskrete notifikationer er
  standard, men brugeren kan aktivt vælge detaljeret låseskærmstekst.
- Præciseret aftercare som en varm cooldown efter en afsluttet scene og som en
  særskilt neutral sikkerheds-check efter safeword.
- Implementeret advarsel og forhåndsvisning, når brugeren vælger fræk/detaljeret
  tekst på låseskærmen.
- Implementeret personlig cooldown efter normal afslutning og særskilt roligt
  sikkerheds-check efter safeword.
- Dokumenteret rækkefølgen frem mod rigtige kunder i `ROADMAP.md`.

## 28. august 2026 — AI-forbrug, grænser og tilkøb

- Tilføjet central daglig tælling af chatbeskeder.
- Tilføjet central månedlig tælling af billedgenerering og billedanalyse.
- Cloudflare Workeren stopper AI-kaldet, før Venice kontaktes, når grænsen er nået.
- Admin kan ændre alle tre grænser særskilt for Prøv, Solo og Plus.
- Admin kan se månedlige kald pr. AI-model samt input- og outputtokens.
- Brugeren kan se resterende chat, billeder og billedanalyser.
- Planer og tilkøb oprettes som bestillinger til manuel admingodkendelse.
- Tilføjet +50/+200 billedanalyser som særskilte tilkøb.
- Godkendte billedtilkøb gælder i den aktuelle måned.
- Firestore-reglerne er udvidet til forbrugsdata, rettigheder og køb.

## 28. august 2026 — AI-billeder og billedanalyse

- Tilføjet knappen **Skab AI-partner** i figurens opsætning.
- Partnerbilledet bygges af scene, figur, stil, krop, hud og øvrige udseendevalg.
- Billedgenereringsmodellen vælges særskilt fra tekstmodellen i admin.
- Tilføjet Worker-endpointet `POST /image/generate`.
- Tilføjet vision-analyse af billeder valgt med **+** i chatten.
- Billedanalysen får den aktuelle scene, profil og seneste chat som kontekst.
- Tilføjet Worker-endpointet `POST /vision`.
- Gamle anonymiserede Qwen-billedvalg erstattet af private modeller, så de passer
  til Venice-nøglen med **Private models only**.
- Videos vises fortsat lokalt, men analyseres endnu ikke af AI.

## 28. august 2026 — opgaver og beskedstil

- Tilføjet valget **Diskret** eller **Detaljeret/fræk** opgavebesked.
- Valget gemmes pr. bruger på enheden.
- Tilføjet knappen **Giv mig en opgave** i chatten.
- Opgaven dannes ud fra scenen, den aktuelle samtale, intensitet, grænser og det
  udstyr, brugeren har oplyst.
- Admin kan redigere en særskilt opgaveprompt for hver scene.
- Tekstmodel og billedmodel kan vælges uafhængigt pr. scene.

## Tidligere grundfunktioner

- Firebase-login, 18+-bekræftelse og regler.
- Central promptstyring via Firestore og adminside.
- Privat session eller lagring på egen enhed.
- Chatnavn, udstyrsvalg, samtalestil og eget ønske indgår i AI-prompten.
- Mobil chatvisning, panikskærm, safeword og lokale sessioner.
