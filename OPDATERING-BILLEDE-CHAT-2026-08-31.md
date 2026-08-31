# Opdatering: AI-billeder, chat og hårvalg

## Det er ændret

- AI-billeder hentes som rå billeddata fra Venice og kontrolleres, før de sendes til appen.
- Hvis den valgte billedmodel fejler, prøver Worker automatisk `venice-sd35`.
- Hårfarve og hårlængde er enkeltvalg, mens **Opsat** og **Pjusket** kan kombineres med længden.
- Chatten har fået mere plads. Noter, lyd, tilgængelighed, safeword og målere ligger i **Menu**.
- Tryk på partnerbilledet eller et billede i chatten for fuld skærm. Tryk igen for normal visning.
- **Flere handlinger → Billede i chat** laver et nyt partnerbillede direkte i samtalen.
- Fri chat svarer først på brugerens spørgsmål og laver ikke automatisk hver besked om til en opgave.
- Efter **Giv mig en ordre** vises den aktuelle opgave med **Opgave udført** og **Send foto**.
- Nye billedposer: **På knæ i sele**, **Blonder bagfra** og **Futa / sele**.
- Nye opgavekategorier: **E-stim**, **Kondom / CEI** og **Diskret ude**.
- Opgavetekster kan redigeres og gendannes under **Opgaver i løbet af dagen**. De gemmes lokalt pr. konto og bruges i Web Push.

## Sådan lægges opdateringen ud

1. Upload hele indholdet af denne mappe til GitHub-repositoriet og kør GitHub Pages-workflowet.
2. Åbn Cloudflare Worker `stay-api` → **Edit code**.
3. Erstat Worker-koden med hele indholdet af `worker/stay-api-worker-manual.js`.
4. Tryk **Deploy**.
5. Firebase skal ikke ændres til denne opdatering.

Eksisterende VAPID-secrets, `PUSH_SUBS`-binding og Cron beholdes uændret.
