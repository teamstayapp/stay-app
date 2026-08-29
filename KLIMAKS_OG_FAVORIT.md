# Tæt på, Jeg kommer og lokal billedfavorit

## Brugerens anatomi

I opsætningen kan brugeren vælge **Penis** eller **Vulva** under **Din krop i
chatten**. Valget bruges kun, når AI’en formulerer direkte kropssvar. Det bruges
ikke til at antage køn, navn eller rolle.

Værdien sendes som `userAnatomy` og valideres igen i Cloudflare Workeren. Alt
andet end `penis` eller `vulva` bliver behandlet som standardværdien og kan
derfor ikke bruges som prompt-injektion.

## Tæt på og Jeg kommer

- **Tæt på** sender `intent: "close"` og fortæller AI’en, at brugeren er tæt på
  orgasme. Svaret følger scene, tempo, plan og valgte promptlag.
- **Jeg kommer** sender `intent: "climax"` og beder om én kort reaktion, uden
  at starte nye eller hårdere temaer.
- **Aftercare** er en separat handling, som brugeren selv trykker på bagefter.
- Begge AI-kald tæller som almindelige chatbeskeder i den daglige grænse.
- Free får altid et ikke-eksplicit svar, fordi Workeren overskriver browserens
  NSFW-værdi med Firestore-planen.

## Lokal billedfavorit

Et oprettet partnerbillede kan gemmes som én favorit pr. bruger og enhed.
Favoritten ligger i browserens IndexedDB sammen med bruger-id og figurtype.

- **Gem som favorit** eller **Erstat favorit** gemmer det viste billede.
- **Brug favorit** skifter tilbage uden at kalde billedmodellen.
- **Slet favorit** fjerner kun den gemte favorit; det aktuelle sessionsbillede
  bliver stående indtil sessionen forlades.
- Favoritten synkroniseres ikke til Firestore og vises derfor ikke automatisk
  på en anden telefon.
- Genbrug reducerer ikke billedsaldoen. Kun en vellykket ny generering gør.

Der kræves ingen nye Firebase-felter eller Cloudflare-variabler. Frontenden og
den opdaterede `worker/stay-api-worker-manual.js` skal begge udgives.
