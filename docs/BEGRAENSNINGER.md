# Begrænsninger og nødvendige skridt før brug med virkelige persondata

## Hvad demonstrationen ikke er

- **Ingen adgangskontrol.** Der er ingen login, roller eller enhedsafgrænsning. Alle med linket ser alt.
- **Ingen sikker opbevaring.** Data ligger i applikationens JavaScript og kan læses af alle, der åbner siden.
- **Ingen backend, database eller auditlog.** SQL-skemaet i `db/schema.sql` beskriver en fremtidig løsning og kører ikke på GitHub Pages.
- **Ingen redigering af grunddata.** Risikobehandling og handlinger er demonstrationsdata; brugerens valg ændrer dem ikke.
- **Ingen integrationer** til HR-system, ressourceplan eller kalendere.

## Metodiske begrænsninger

- Vægte, tærskler og normaliseringer er faglige prototype-antagelser – ikke kalibrerede eller validerede.
- Scoren beskriver sårbarhed, ikke årsagssammenhænge, og bør ikke bruges som præstationsmål for enkeltpersoner eller ledere.
- Mange input er menneskelige vurderinger. Ensartede vurderingsprocesser er en forudsætning for sammenlignelige tal.
- Kapacitet måles i årsværk uden kompetenceniveau. Kultur måles kun som praksis og infrastruktur.
- Ændringer under 3 point bør ikke tolkes som reelle ændringer.
- Scenarier bygger på eksplicitte antagelser (fx at én person bidrager med ét årsværk til én kapabilitet).

## Skridt før brug med virkelige persondata

1. **Formål og retsgrundlag.** Fastlæg formål, retsgrundlag (GDPR art. 6) og eventuelle særlige kategorier (som skal undgås). Gennemfør en konsekvensanalyse (DPIA).
2. **Dataminimering.** Begræns personoplysninger til rolle, ansættelsesperiode, dokumenteret evidens og daterede vurderinger. Ingen alder, helbred, private forhold, beskedindhold eller adfærdsdata.
3. **Gennemsigtighed.** Informér medarbejderne, inddrag medarbejderrepræsentanter, og beskriv, hvordan vurderinger kan indsigtes og korrigeres.
4. **Sikkerhed.** Implementér login (SSO + MFA), rollebaseret adgang med enhedsafgrænsning, Row Level Security, kryptering i transit og hvile, nøglehåndtering og append-only auditlog – også for eksport.
5. **Datakvalitet og ejerskab.** Udpeg ejere og opdateringsrytme for hver datakilde og retningslinjer for, hvem der må afgive vurderinger.
6. **Modelstyring.** Kalibrér mod virkelige forløb, versionér alle ændringer, og lad en uafhængig part gennemgå modellen.
7. **Opbevaring og sletning.** Fastsæt slettefrister, og gem historik aggregeret, hvor personhenførbarhed ikke er nødvendig.
8. **Leverandører og hosting.** Databehandleraftaler, EU-hosting og backup med gendannelsestest.
