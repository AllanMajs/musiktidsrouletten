# Musiktidsrouletten

Et statisk, dansk musikhjul med 50 sange fra 1960–2009. Åbn `index.html` direkte eller servér filen via GitHub Pages. Ingen build eller afhængigheder er nødvendige for selve spillet.

## Hjul og resultat

Farvefelter, etiketter og resultat bruger samme rækkefølge i `decades` og samme feltbredde på 72°. Felterne tegnes med en CSS conic-gradient, med start klokken 12 og urets retning. Pilen står stille klokken 12; resultatet er derfor feltet ved **den negative hjulrotation**, normaliseret til 0–360°.

Hvert årti har 20 % chance. Hjulet lander inde i feltet, mindst 20 % af feltbredden fra kanterne. Sangen vælges fra det faktisk landede årti. Afslutning følger `transitionend` med en engangsbeskyttet timer som reserve. Gentagne tryk under en drejning ignoreres, og rotationen normaliseres mellem runder.

## Sangkontrol, 1. november 2026

Alle 50 valgte video-id'er er kontrolleret mod YouTubes oEmbed-metadata. Original videotitel, kanal og URL er gemt i [docs/video-metadata.json](docs/video-metadata.json), så koblingerne kan gennemgås uden at stole på appens sangtitler.

`year` angiver sangens oprindelige udgivelse/indspilning, ikke datoen for upload, remaster eller en senere liveoptræden. Årtiet beregnes ud fra dette årstal. Listen valideres ved opstart for ugyldige id'er, dubletter, manglende sange og forkerte årtier.

Konkrete rettelser omfatter:

- “Hey Jude” brugte Frank Sinatras “Fly Me to the Moon”; nu bruges Beatles-videoen.
- “Waterloo” og “The Reflex” brugte Totos “Africa”; alle tre har nu deres egne korrekte videoer.
- “Hey Ya!” brugte “Despacito”; hele 00'er-listen er kontrolleret og rettet.
- Den dobbelte “Bohemian Rhapsody” er kun i 70'erne. “Space Oddity” er flyttet til 60'erne, “Billie Jean” er kun i 80'erne, og “The Final Countdown” er flyttet fra 90'erne til 80'erne.
- De to ledige pladser i 70'erne er udfyldt med “Don't Stop 'Til You Get Enough” (1979) og “Let It Be” (1970). Der er fortsat 50 unikke sange, fordelt 10/10/11/9/10 på de fem årtier. Årtiernes vinderchance er fortsat ens.
- “I'm a Believer” er tydeligt mærket som liveversion. “Apologize” krediterer Timbaland ft. OneRepublic, svarende til den valgte video.

Metadata bekræfter videoens identitet og tilgængelighed på kontroldatoen; det er ikke en garanti for afspilning eller fremtidig tilgængelighed. YouTube kan begrænse indlejring, regioner eller rettigheder. Appen viser derfor altid et direkte link til samme video og vejledning ved afspilningsproblemer.

## Mobil og tilgængelighed

Hjulet skalerer til skærmbredden. Drejeknappen har ingen nedarvet topmargin og bliver i centrum. Overskrifter og videopanelet skalerer også. Videoen afspilles inline efter et tryk i afspilleren; appen afhænger ikke af automatisk lydafspilning. Der er tastaturfokus, tilgængelige navne, fokusflytning mellem skærmene og understøttelse af reduceret bevægelse. “Spin igen” fjerner videoens kilde og stopper afspilningen.

## Test

Node.js 20 eller nyere:

```sh
npm test
```

Tester katalog, kendte fejl, alle vinkler fra −3600° til 3600° i trin på 0,5°, sektorgrænser og afvisning af ugyldige katalogdata. Kræver ingen installation eller netadgang.

Browserkontrol:

```sh
npm install
npx playwright install chromium
npm run test:browser
```

Tester 320, 375, 390, 768 og 1280 px, hjulets og knappens geometri, alle fem resultater, gentagne drejninger, sammenhæng mellem videotitel/id/link, fokus, nulstilling, reduceret bevægelse, en rigtig CSS-overgang og reserveafslutning uden `transitionend`. Eksterne YouTube-frames erstattes af en lokal testside; testene verificerer ikke lyd/video hos YouTube. Med `SCREENSHOT_DIR` kan der gemmes skærmbilleder i en eksisterende mappe. `CHROMIUM_PATH` kan vælge en allerede installeret Chromium-binærfil.
