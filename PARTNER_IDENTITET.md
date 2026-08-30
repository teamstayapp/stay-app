# Stay — ensartet AI-partner på billeder

## Sådan bruger brugeren funktionen

1. Skriv et navn til AI-partneren på startsiden eller under **Tilpas alle valg**.
2. Opret billeder, indtil det ønskede udseende vises.
3. Tryk **Brug som fast udseende**.
4. Tryk **Ny positur – samme partner** for at skabe en ny komposition med det
   låste billede som visuel reference.
5. Vælg senere et af de fire faste billeder uden nyt billedforbrug.

**Brug originalen** går tilbage til referencebilledet. **Brug som nyt fast
udseende** udskifter referencen. **Lav helt ny partner** kræver bekræftelse og
starter en ny identitet.

## Hvad der gemmes

- **Privat session:** Partnernavnet kan ligge på kontoprofilen, men selve
  referencebilledet og positurerne ligger kun i den aktive session og ryddes,
  når den forlades.
- **Gem på denne enhed:** Referencebilledet og op til fire faste billeder gemmes
  lokalt i IndexedDB. De uploades ikke til Firestore.
- Alle tidligere genererede billeder kan fortsat ligge i det lokale galleri med
  højst 12 billeder.

## AI og forbrug

- Det første billede bruger scenens valgte tekst-til-billede-model.
- Nye positurer bruger `qwen-edit-uncensored` gennem `POST /image/pose` med det
  faste billede som input.
- Begge typer bruger én billedgenerering og registreres centralt i Firestore
  efter et vellykket resultat.
- Valg af et allerede fast billede er lokalt og gratis.
- Et mislykket kald erstatter ikke det eksisterende billede.

En billedmodel kan stadig ændre små detaljer. Referencebaseret redigering giver
langt bedre kontinuitet end den tidligere løsning med en tilfældig seed for hver
generation, men er ikke biometrisk identitetsgaranti.

## Det skal udgives

1. Upload hele GitHub-pakken og vent på grøn GitHub Pages.
2. Udgiv den medfølgende `firestore.rules` i Firebase.
3. Erstat Worker-koden med `worker/stay-api-worker-manual.js` og tryk Deploy.
4. Kontrollér `/health`; `consistentPartnerPoses` skal være `true`.
