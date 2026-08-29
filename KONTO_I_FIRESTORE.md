# Stay — central konto i Firestore

Plan, status, billedbonus og udløb ligger centralt i Firestore. `localStorage`
bruges kun til demo-login og private enhedsvalg; det giver ingen rettigheder i
den rigtige Firebase-app.

## Dokumenter

### `userProfiles/{uid}`

- `email`
- `chatName`
- `createdAt`
- `lastSeen`

Brugeren kan kun skrive sit eget chatnavn og opdatere sin egen senest-set-tid.
E-mailen skal svare til den verificerede Firebase-bruger.

### `userEntitlements/{uid}`

- `plan`: `free`, `solo` eller `plus`
- `status`: `active`, `paused`, `cancelled` eller `churned`
- `expiresAt`: tidspunkt eller `null`
- `extraPacks`
- `bonusPeriod`
- `bonusImageGenerations`
- `bonusImageAnalyses`

En ny verificeret bruger må kun oprette sin egen sikre standardkonto som
`free` + `active` uden bonus. Derefter kan kun admin ændre rettighederne.

## Billedsaldo

Der gemmes ikke længere et lokalt tal som sandhed. Tilbageværende billeder er:

`planens månedsgrænse + månedens billedbonus - månedens vellykkede genereringer`

Kun vellykkede billedkald registreres. Admin kan se den beregnede saldo og sætte
månedens ekstra billeder under **Admin → Kunder**.

## Pause og udløb

- **Pause, opsagt eller churned:** brugerappen viser en låst kontoskærm, og
  Workeren afviser chat, billedgenerering og billedanalyse.
- **Udløbet Solo/Plus:** samme blokering. Brugeren kan åbne Abonnement.
- **Free:** udløbsdato ignoreres, fordi gratisplanen ikke udløber.
- Adminmailen omgår blokeringen, så admin stadig kan teste og rette opsætningen.

## Før funktionen virker online

1. Upload den nye app til GitHub.
2. Udgiv den nye `firestore.rules` i Firebase.
3. Deploy den nye `worker/stay-api-worker-manual.js` i Cloudflare.
4. Log ind én gang med eksisterende konti. Manglende sikre Free-rettigheder
   oprettes automatisk.

