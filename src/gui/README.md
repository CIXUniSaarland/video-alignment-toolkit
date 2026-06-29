# VideoAlign — Web App (Frontend)

React (Create React App) GUI for the VideoAlign toolkit. Provides the Training, Analysis
(Align / Frame Retrieval / Anomaly), and Instructions pages. Talks to the [Flask backend](../server)
over HTTP + Socket.IO.

## Run

```bash
npm install      # first time only
npm start        # dev server on http://localhost:3000
```

The backend must be running on port **5001** (see [`../server`](../server)). In development the CRA
dev-server **proxies** API calls there (`"proxy"` in `package.json`), so the app uses same-origin
relative URLs and only port 3000 needs to be exposed/tunneled.

```bash
npm run build    # production bundle in build/
```

## Configuration

- `.env` — `REACT_APP_API_HOST` is empty by default (use the proxy). Set it to
  `http://localhost:5001` to call the backend directly instead.
- `package.json` → `"proxy": "http://127.0.0.1:5001"` — where the dev server forwards API calls.

## Structure

```
src/
├── App.js          # routes + home page
├── Page/           # shared layout (navbar, footer)
├── VA_API/         # Training pages
├── VA_AL/          # Analysis: align_vid, frame_retr, anomaly_det, ext_emb
├── VA_IT/          # Instructions (renders public/instructions/*.md)
└── util/           # video players, shared helpers
public/instructions/  # Markdown docs + screenshots shown in the app
```

## Requirements

Node.js ≥ 18 and npm.
