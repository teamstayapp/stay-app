# Interaktiv partnerkrop

Kropsfunktionen åbnes med **Rør krop** øverst i den aktive chat. Brugeren kan
skifte mellem forfra og bagfra og trykke på en markeret zone. Funktionen bruger
et fast kropskort, som følger den valgte figur: Master eller Mistress. Det gør
trykzonerne stabile, selv om det genererede partnerbillede varierer.

De fire kort ligger i `public/bodies/` som Master/Mistress forfra og bagfra.
Det genererede partnerbillede vises fortsat i chatkortet og i opsætningen.

## Zoner

- Forfra: mund, hals, bryst, mave, skød, lår og hånd
- Bagfra: nakke, bagdel og lår

Koordinaterne ligger i `src/engine/bodyZones.ts` og er tilpasset de faste kort.

## AI-flow

Et tryk opretter en synlig brugerlinje i chatten og sender `intent: "touch"`
samt et valideret `touchZone` til Cloudflare Workeren. Workeren bygger svaret
med den aktuelle:

- Firestore-plan og kontostatus
- scene og tre promptlag
- NSFW-indstilling, personlighed og intensitet
- valgte temaer og udstyr
- nærhed, cyklus og safeword

Touch tæller som én almindelig chatbesked i brugerens daglige grænse. Der
oprettes ingen ekstra Firestore-dokumenter. Handlingen følger samme lokale eller
private lagring som resten af sessionen.

## Faste grænser

- Workeren accepterer kun de kendte zone-id'er.
- Free kan ikke få NSFW via et kropsklik.
- Hals/nakke må aldrig blive til tryk, kvælning eller åndedrætsbegrænsning.
- Bagdel må ikke blive til anal penetration, medmindre analtemaet er valgt.
- Safeword, **For meget**, **Finish** og panikskærmen lukker kropsvisningen.
- De eksisterende forbud mod mindreårige, ikke-samtykke og farlig skade gælder
  altid efter alle redigerbare prompts.

## Udgivelse

Kropskortændringen uploades til GitHub Pages. Den kræver ingen ny Worker,
Firebase-felter, hemmelige nøgler eller Cloudflare-variabler.
