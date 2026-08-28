# Stay — ændringslog

Denne fil følger med hver GitHub-pakke. Nyeste ændringer står øverst.

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
