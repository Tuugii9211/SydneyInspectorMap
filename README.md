# Sydney Inspector Map

A crowd-sourced map of transport inspector sightings around Sydney (like PTV Alert for Melbourne). Web app built with React + Vite, Leaflet/OpenStreetMap for the map, and Firebase Firestore for live reports.

## Setup

```sh
npm install
cp .env.template .env.local   # then fill in your Firebase web app config
npm run dev                   # http://localhost:5173
```

`.env.local` is only needed for local development. The deployed site reads its Firebase config automatically from Firebase Hosting (`/__/firebase/init.json`). Locally without `.env.local`, the map still loads but reporting is disabled ("Offline mode").

Get the Firebase values from **Firebase console → Project settings → Your apps → Web app**. Location only works on `localhost` or HTTPS.

## Deploy

```sh
npm run deploy   # downloads transit lines if needed, builds to dist/, deploys hosting + Firestore rules
```

The scheduled cleanup function needs the Blaze plan (`firebase deploy --only functions`). On the free Spark plan, old reports are simply hidden after 60 minutes.

## Transit lines

`npm run lines` downloads the real Sydney Trains (T1–T9), Metro (M1) and Light Rail (L1–L4) routes and stations from OpenStreetMap into `public/transit-lines.json`. `npm run build` does this automatically the first time. Commit the file so builds don't depend on the download. Map data © OpenStreetMap contributors.

## Project structure

- `src/App.tsx` — app shell and report flow (browser geolocation → Firestore)
- `src/components/Map.tsx` — Leaflet map (CARTO light/dark tiles) with 🦄 report markers
- `src/components/TransitLines.tsx` — draws the T / M / L lines and stations
- `src/theme.ts` — light/dark mode (follows the device, toggle remembers the choice)
- `scripts/fetch-transit-lines.mjs` — downloads transit lines from OpenStreetMap
- `src/components/ReportButton.tsx` — report button + confirm dialog
- `src/services/reports.ts` — Firestore read/write (reports older than 60 min are hidden)
- `src/firebase.ts` — Firebase init (env vars, or Firebase Hosting's auto config)
- `src/data/transportLines.json` — fallback line used until `public/transit-lines.json` exists
- `functions/` — scheduled Cloud Function that deletes reports older than 60 min
- `firestore.rules` — Firestore security rules
