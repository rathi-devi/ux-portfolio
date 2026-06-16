# Portfolio — CLAUDE.md

Teknisk referanse for AI-assistenter som jobber med dette prosjektet.

---

## Prosjektoversikt

Minimalistisk UX/UI-portefølje for Rathi Devi Easwaran, hostet på GitHub Pages.
Ingen byggeverktøy, ingen rammeverk — ren HTML, CSS og Vanilla JS.

**Live side:** `https://<brukernavn>.github.io/<repo>/`

---

## Filstruktur

```
ux-portfolio/
├── index.html          # Eneste HTML-fil. All navigasjon skjer i JS.
├── style.css           # All CSS. CSS custom properties i :root.
├── app.js              # All logikk: i18n, prosjektkort, hash-router, Three.js-tre
├── projects.json       # Innholdskilden. Redigér her for å oppdatere siden.
├── translations.json   # Referansefil for oversettelser (ikke lastet av JS)
└── assets/             # Bilder legges her: assets/[prosjekt-id]/filnavn.jpg
```

---

## Datastruktur — projects.json

Hvert prosjekt støtter disse feltene. Alle tekstfelter kan være enten
en plain string eller et objekt `{ "no": "...", "en": "..." }`.

```jsonc
{
  "id":       "unik-id",           // brukes i URL: #project/unik-id
  "course":   "MCB201",            // vises som kursemerknad
  "title":    { "no": "...", "en": "..." },
  "tagline":  { "no": "...", "en": "..." }, // vises som mørk badge på kortet
  "category": "UX/UI & ...",
  "summary":  { "no": "...", "en": "..." }, // kortbeskrivelse på porteføljegrid
  "context":  { "no": "...", "en": "..." }, // første seksjon på case-siden
  "pivot":    { "no": "...", "en": "..." }, // tekst i pivot-seksjonen

  // Nummererte designvalg — vises uten bilder
  "design_choices": [
    {
      "title": { "no": "...", "en": "..." },
      "desc":  { "no": "...", "en": "..." }
    }
  ],

  // Detaljert case-studie-data
  "case": {
    "meta": {
      "year":     "2024",
      "role":     { "no": "...", "en": "..." },
      "team":     { "no": "...", "en": "..." },
      "duration": { "no": "...", "en": "..." },
      "tools":    ["Figma", "Maze"]
    },

    // Dobbeldiamanten — fire faser
    "process": [
      {
        "phase": "discover",         // discover | define | develop | deliver
        "label": { "no": "...", "en": "..." },
        "body":  { "no": "...", "en": "..." },
        "images": [
          {
            "src":         null,     // null = plassholder, "assets/..." = ekte bilde
            "placeholder": { "no": "...", "en": "..." },
            "caption":     { "no": "...", "en": "..." },
            "ratio":       "16/9"   // CSS aspect-ratio
          }
        ]
      }
    ],

    // Nummererte innsiktsfunn
    "insights": [
      {
        "number":  "01",
        "heading": { "no": "...", "en": "..." },
        "body":    { "no": "...", "en": "..." }
      }
    ],

    // Bilde til pivot-seksjonen (teksten kommer fra project.pivot)
    "pivot_image": {
      "src":         null,
      "placeholder": { "no": "...", "en": "..." },
      "caption":     { "no": "...", "en": "..." },
      "ratio":       "4/3"
    },

    // Hi-Fi-skjermer — vises i 4-kolonne grid
    "screens": [
      { "src": null, "placeholder": { "no": "...", "en": "..." }, "ratio": "9/16" }
    ],

    "outcome": { "no": "...", "en": "..." }
  }
}
```

---

## Internasjonalisering (i18n)

- Oversettelser for UI-strenger ligger **inlined** i `app.js` i `TRANSLATIONS`-objektet (ikke i `translations.json`).
- `translations.json` er en referansefil — oppdater begge hvis du endrer UI-tekst.
- Prosjekttekster oversettes ved å bruke `{ "no": "...", "en": "..." }`-objekter direkte i `projects.json`.
- Valgt språk lagres i `localStorage` under nøkkelen `lang`.
- `applyLanguage(lang)` oppdaterer alle `data-i18n`- og `data-i18n-html`-elementer i DOM-en.

---

## Hash-router

Navigasjon skjer via URL-hash — fungerer på GitHub Pages uten serverkonfigurasjon.

| URL-hash            | Hva skjer                              |
|---------------------|----------------------------------------|
| `#` (tom)           | Viser porteføljegrid og about-seksjon  |
| `#project/[id]`     | Viser case-studie-side for prosjektet  |

Relevante funksjoner i `app.js`:
- `initRouter()` — starter lytter på `hashchange`
- `handleRoute()` — parser hash og kaller riktig visningsfunksjon
- `showHome()` / `showCaseStudy(project)` — bytter mellom `#home-view` og `#case-view`

---

## Case-studie-side

Genereres dynamisk av `renderCaseStudy(project)` i `app.js`.
Seksjonsrekkefølge:

1. Tilbake-navigasjon + kurskode
2. Hero — tittel, tagline, meta-rad
3. Kontekst (`project.context`)
4. Prosess — Dobbeldiamanten (`case.process`, 4 faser)
5. Nøkkelfunn (`case.insights`)
6. Den strategiske pivoten (`project.pivot` + `case.pivot_image`)
7. Designvalg (`project.design_choices`)
8. Hi-Fi-skjermer (`case.screens`)
9. Resultat (`case.outcome`)

Bilder: sett `"src": null` for plassholder, `"src": "assets/[id]/fil.jpg"` for ekte bilde.

---

## Three.js-tre (bakgrunn)

- Én `<canvas id="tree-canvas">` bak alt innhold (`z-index: -2`).
- Ortografisk kamera — 1 unit = 1 CSS-piksel, origo i viewport-sentrum.
- Treet genereres proseduralt med `buildTree(projectCount)` — antall hovedgreiner = antall prosjekter.
- Per-vertex sinus-støy animerer hvert punkt basert på dybde (trunk: 0 px, tips: ~8 px).
- Vekst-animasjon ved sideinnlasting via `geometry.setDrawRange()`.
- Vertex-farger simulerer gjennomsiktighet: trunk er mørk `#1C1A17`, tipser blender mot bakgrunn `#F9F8F6`.

Relevante funksjoner: `initTree()`, `buildTree()`, `branch()`, `tick()`, `handleResize()`.

---

## Lokalt utviklingsmiljø

Siden bruker `fetch()` og kan ikke åpnes direkte som `file://`.

```bash
# Python
python3 -m http.server 3000

# Eller bruk Live Server-utvidelsen i VS Code
```

---

## Git-arbeidsflyt

```bash
# Ny feature
git checkout -b feature-navn

# Commit og merge når ferdig
git add .
git commit -m "Beskrivende melding"
git checkout main
git merge feature-navn
git push
git branch -d feature-navn
```

GitHub Pages publiserer automatisk fra `main`-branchen.
