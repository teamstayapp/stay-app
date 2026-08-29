# Interaktiv partnerkrop

Kropsfunktionen åbnes med **Rør krop** øverst i den aktive chat. Brugeren kan
skifte mellem forfra og bagfra og trykke på en markeret zone. Hvis der er
oprettet et AI-partnerbillede, bruges det som baggrund; ellers vises en neutral
silhuet.

## Zoner

- Forfra: mund, hals, bryst, mave, skød, lår og hånd
- Bagfra: nakke, bagdel og lår

Koordinaterne ligger i `src/engine/bodyZones.ts` og kan justeres, hvis et fast
billedformat senere gør placeringen mere præcis.

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

Frontendændringen uploades til GitHub Pages. Den medfølgende
`worker/stay-api-worker-manual.js` skal bagefter erstatte den eksisterende kode
i Cloudflare Worker-editoren og deployes. Der kræves ingen nye Firebase-felter,
hemmelige nøgler eller Cloudflare-variabler.
