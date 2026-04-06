# NL Recon 2026 — Live Sync Dossier

## What this is

A single-file travel dossier with a sync layer.

- **editor.html** — full interactive dossier (open on tablet). Fill in notes, add photos, press "Push Update" to sync.
- **index.html** — read-only viewer (share with someone back home). Enter PIN `1701` to unlock. Auto-polls every 60 seconds for updates.
- **worker/** — Cloudflare Worker backend (KV store for state).

---

## First-time setup

### 1. Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### 2. Create the KV namespace

```bash
cd worker
wrangler kv:namespace create NL_RECON_KV
```

Copy the `id` printed in the output and paste it into `wrangler.toml`, replacing `PLACEHOLDER_KV_NAMESPACE_ID`.

### 3. Deploy the Worker

```bash
wrangler deploy
```

Your Worker will be live at `https://nl-recon-2026.<your-subdomain>.workers.dev`.

---

## Domain routing (M6 step-by-step)

> **Ezra: tell me which parked domain you want to use** (e.g. `example.com`).
> The API will be served from `api.recklesspeach.com`.

Once you know your domain:

1. Open the **Cloudflare dashboard** → **Workers & Pages** → select `nl-recon-2026`.
2. Click the **Triggers** tab.
3. Click **Add Custom Domain**.
4. Enter: `api.recklesspeach.com` → click **Save**.
5. Cloudflare will issue a certificate and route traffic automatically (takes ~1 min).
6. Verify it works:

   ```bash
   curl "https://api.recklesspeach.com/api/state?pin=1701"
   ```

   You should get `{"editorId":"nl-recon-2026","pushedAt":null,...}`.

7. Update `YOURDOMAIN` constant in **editor.html** and **index.html**:
   - Search for `recklesspeach.com` and replace with your actual domain.
   - Also update the `ALLOWED_ORIGINS` array in `worker/index.js`.
   - Re-deploy the worker: `wrangler deploy`.

---

## How to use

### Editor (tablet / field)

- Open `editor.html` in a browser (or host on GitHub Pages).
- Fill in verdicts, vibe sliders, checkboxes, notes, rent prices.
- Add photos using the "+ Add photos" buttons.
- Tap **⬆ Push Update** to sync everything to the server.
- Photos can be deleted with the **✕** button on each thumbnail.

### Viewer (partner / remote)

- Open `index.html` (or the GitHub Pages URL).
- Enter PIN: **1701**
- See the latest pushed state. The page auto-refreshes every 60 seconds.

---

## Security notes

- Write key `recon2026push` is hardcoded in the Worker and editor — this is intentional for a private trip tool.
- PIN `1701` is validated server-side (Worker returns 401 on wrong PIN).
- KV namespace is scoped to your Cloudflare account.

---

## Repo structure

```text
nl-recon-2026/
├── index.html          ← viewer (read-only)
├── editor.html         ← editor (full interactivity)
├── worker/
│   ├── index.js        ← Cloudflare Worker
│   └── wrangler.toml   ← Wrangler config
└── README.md
```
