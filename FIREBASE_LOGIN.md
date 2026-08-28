# Stay — slå rigtigt login til

Koden understøtter Firebase Authentication med e-mail og adgangskode,
e-mailbekræftelse, nulstilling af adgangskode og vedvarende login.

## 1. Opret Firebase-projekt

1. Gå til `https://console.firebase.google.com/` og vælg **Add project**.
2. Kald projektet fx `stay-app`.
3. Google Analytics er ikke nødvendigt til login-testen.
4. Inde i projektet vælges web-ikonet `</>` og appnavnet `Stay Web`.
5. Kopiér værdierne fra `firebaseConfig`:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`

Firebase-konfigurationen til en webapp er ikke en hemmelig servernøgle. Adgang
skal senere beskyttes med Firebase Authentication og database-regler.

## 2. Slå e-mail-login til

1. Firebase → **Build → Authentication → Get started**.
2. Åbn **Sign-in method**.
3. Vælg **Email/Password**, slå den første mulighed til og gem.
4. Under **Settings → Authorized domains** tilføjes `teamstayapp.github.io`.
5. Under **Templates** kan afsendernavn og tekster til verifikation og
   nulstilling tilpasses.

## 3. Tilføj GitHub-variabler

GitHub → `teamstayapp/stay-app` → **Settings → Secrets and variables →
Actions → Variables**. Opret disse fire repository variables:

| Navn | Firebase-værdi |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Gå derefter til **Actions → GitHub Pages → Run workflow**. Når kørslen er grøn,
viser login-siden teksten **Firebase-login · e-mailbekræftelse**.

## 4. Opret Firestore til centrale prompts

1. Firebase → **Build → Firestore Database → Create database**.
2. Vælg production mode og en europæisk placering.
3. Åbn en terminal i projektmappen og kør:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules
```

Vælg det samme Firebase-projekt. Reglerne giver verificerede brugere læseadgang
til `scenePresets` og de centrale forbrugsgrænser, mens kun
`teamstayapp@gmail.com` må ændre dem. Brugeren kan kun læse egne rettigheder og
egne forbrugsposter. Workeren registrerer forbruget med brugerens
Firebase-session. Admin kan læse den samlede modelstatistik og godkende køb.
Hvis adminmailen ændres, skal den også ændres i `firestore.rules`.

Ved første login åbner admin fanen **Prompts** og trykker **Udgiv til alle**.
Det opretter standardscenerne centralt.

## Test

1. Vælg **Opret konto** i Stay.
2. Brug en rigtig e-mail, mindst 8 tegn i adgangskoden og bekræft 18+.
3. Åbn verifikationsmailen og tryk på linket.
4. Log ind i Stay.
5. Test **Glemt adgangskode?**.

Login, chatnavn, planrettigheder og AI-forbrug virker derefter på tværs af
enheder. Selve private chats og figurvalg gemmes fortsat kun efter brugerens
valgte privatlivstilstand.
