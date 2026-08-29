# Stay — scenevalg, prompts og modeller

## Udstyr og temaer

Under **Admin → Indhold** kan admin ændre de felter, der vises i brugerens
opsætning:

- **Udstyr:** navn hos brugeren, gruppe, ordlyd sendt til AI, mindste plan og
  aktiv/inaktiv.
- **Temaer/fetish:** navn, kort beskrivelse, AI-instruktion, gratis/betalt og
  aktiv/inaktiv.
- Nye felter får et stabilt ID automatisk.
- **Deaktiver** skjuler feltet, men beholder opsætningen til senere.
- **Slet** fjerner feltet fra kataloget, når der trykkes **Gem og udgiv til alle**.

Udstyrets mindste plan kan være **Prøv**, **Solo** eller **Plus**. Workeren
kontrollerer planen fra `userEntitlements/{uid}` og filtrerer udstyr igen på
serveren. Et ændret browserfelt kan derfor ikke give Free/Solo adgang til
Plus-udstyr.

Kataloget ligger i Firestore som `contentCatalog/default`. Appen lytter live på
dokumentet, så der skal ikke bygges en ny ZIP for hver efterfølgende tekstændring.
Den første version med funktionen og de opdaterede Firestore-regler skal dog
uploades/deployes én gang.

AI-instruktionerne supplerer scenens systemprompt. De kan ikke fjerne Workerens
faste krav om voksne, samtykke og sikkerhed.

## Brugerflow

Brugeren vælger først en sceneprofil. Basisvalgene er:

- Blød og omsorgsfuld
- Streng og kontrollerende
- Drilsk og udfordrende
- Edge og denial
- Fri samtale

De eksisterende fetish-pakker bliver automatisk vist som ekstra scenevalg, når
pakken både er låst op og valgt i brugerens opsætning.

Appen sender kun scene-id, den valgte profil og samtalen til Cloudflare
Workeren. Workeren henter selv den centrale prompt og tekstmodel fra Firestore,
lægger de faste voksen-, samtykke- og sikkerhedsregler ovenpå og kalder AI'en.

Den endelige tekstprompt bliver sammensat for hver besked af:

- scenens bløde grundprompt fra admin
- NSFW-laget, når NSFW er slået til og Firestore-planen er Solo eller Plus
- Plus-laget, kun når NSFW er slået til og Firestore-planen er Plus
- rolle og valgt fiktiv figur
- stil, krop, hud og det relevante anatomivalg
- personlighed, intensitet og NSFW-valg
- valgfrit eget ønske til samtalestilen
- chatnavn, valgte temaer og udstyr til rådighed
- grænser, safeword og scenens aktuelle tilstand

Brugerens knapper ændrer derfor konteksten med det samme. De overskriver ikke
adminprompten; de lægges ovenpå som strukturerede valg. Billedprompt og
billedmodel administreres separat. Når billed-API'et kobles på, skal den
endelige billedprompt bygges af scenens `imagePrompt` plus de visuelle
profilvalg (figur, stil, krop, hud og anatomi).

Brugeren kan vælge **Blid**, **Kold**, **Drilsk** eller **Dominerende** som
grundstil. Hvis feltet **Eget ønske til samtalen** udfyldes, får teksten forrang
frem for grundstilen. Den behandles kun som en stilpræference og kan ikke
tilsidesætte de faste sikkerhedsregler.

## Lokal lagring og privat session

Brugeren vælger før scenestart mellem **Privat session** og **Gem på denne
enhed**. Privat session skriver ikke chat eller midlertidige billeder til
browserlageret. Lokal lagring bruger browserens enhedslager og giver brugeren
knapper til at fortsætte eller slette den gemte chat. Intet af dette gemmes i
Firestore. Beskeder sendes stadig til AI-tjenesten for at kunne blive besvaret.

## Admin

Admin åbner **Admin → Prompts**. Hver scene har tre fold-ud-lag:

- **Blød / SFW:** bruges altid som grundlag og er det eneste lag på Prøv.
- **Fræk / NSFW:** lægges ovenpå for Solo og Plus, når NSFW er slået til.
- **Plus:** lægges ovenpå de to andre kun for Plus + NSFW.

Hvert lag har sin egen startbesked, systemprompt, opgaveprompt og billedprompt.
Herudover kan hver scene:

- slås til eller fra
- omdøbes
- få ny kort beskrivelse
- få nye startbeskeder og prompts for alle tre lag
- vælge tekstmodel og billedmodel uafhængigt

De faste sikkerhedsregler ligger i Workeren og kan ikke redigeres fra panelet.
Workeren afviser modelnavne, der ikke står på den godkendte liste.

## Admin-login

Opret GitHub Actions-variablen `VITE_ADMIN_EMAIL` med den verificerede
Firebase-mail, der skal se adminpanelet, fx `teamstayapp@gmail.com`.

Knappen **Udgiv til alle** gemmer sceneindstillingerne i Firestore. Alle åbne
bruger-apps modtager ændringerne via live synkronisering. Firestore-reglerne
tillader kun den verificerede `teamstayapp@gmail.com` at skrive. Andre
verificerede brugere har kun læseadgang.

Tekst- og billedmodeller har hver sin godkendte liste. Workeren afviser et
vilkårligt tekstmodelnavn, selv hvis en bruger ændrer browserkoden.
