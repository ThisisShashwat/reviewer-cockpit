# reviewer cockpit

local review dashboard for hack club horizons submissions.

## setup

1. install dependencies:
```bash
npm install
```

2. copy the env file and set your keys:
```bash
cp .env.example .env
```

- `VITE_GITHUB_TOKEN`: github personal access token to prevent api rate limits
- `HACKCLUB_AI_API_KEY`: api key for hack club ai proxy queries

## running locally

run both frontend and backend:
```bash
npm run dev:all
```

or run them separately:

- frontend (vite): `npm run dev`
- backend (express): `npm run server`

frontend runs on `http://localhost:5173` and backend runs on `http://localhost:3001`.

## notes

- local verdict and review state is saved under `data/`.
- automated backups are saved in `data/permanent_backups/`.
