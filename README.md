# Sydney Inspector Map

A crowd-sourced map of transport inspector sightings around Sydney (like PTV Alert for Melbourne). Web app built with React + Vite, Leaflet/OpenStreetMap for the map, and Firebase Firestore for live reports.

## Setup

```sh
npm install
cp .env.template .env.local   # then fill in your Firebase web app config
npm run dev                   # http://localhost:5173
```

Without `.env.local` the map still loads, but the report button is disabled ("Offline mode").

Get the Firebase values from **Firebase console → Project settings → Your apps → Web app**. Location only works on `localhost` or HTTPS.

## Deploy

```sh
npm run deploy   # builds to dist/ and deploys to Firebase Hosting
firebase deploy --only firestore:rules,functions
```

## Project structure

- `src/App.tsx` — app shell and report flow (browser geolocation → Firestore)
- `src/components/Map.tsx` — Leaflet map with transport lines and live report markers
- `src/components/ReportButton.tsx` — report button + confirm dialog
- `src/services/reports.ts` — Firestore read/write (reports older than 60 min are hidden)
- `src/firebase.ts` — Firebase init from `VITE_FIREBASE_*` env vars
- `src/data/transportLines.json` — GeoJSON transport lines
- `functions/` — scheduled Cloud Function that deletes reports older than 60 min
- `firestore.rules` — Firestore security rules
