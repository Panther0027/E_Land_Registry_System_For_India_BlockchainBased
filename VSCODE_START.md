# Start Bhumi from VS Code

## Option A — Local development (recommended for coding)

Open **two terminals** in VS Code: `Terminal` → `New Terminal` (or `` Ctrl+` ``).

### Terminal 1 — API (port 5000)

```powershell
cd d:\Project\ELandRegistryBloackchainBasedSystem\bhumi\server
npm install
npm run dev
```

Wait until you see: `Server running on port 5000`

### Terminal 2 — Web app (port 5173)

```powershell
cd d:\Project\ELandRegistryBloackchainBasedSystem\bhumi\client
npm install
npm run dev
```

Open in browser: **http://localhost:5173**

### Import 10,000 properties (once, after MongoDB Atlas IP is whitelisted)

```powershell
cd d:\Project\ELandRegistryBloackchainBasedSystem\bhumi\server
npm run setup:primary
```

Login: `pantheraleo870@gmail.com` (password in `bhumi/.env`)

---

## Option B — Docker production (MongoDB inside Docker)

Requires **Docker Desktop** installed and running.

```powershell
cd d:\Project\ELandRegistryBloackchainBasedSystem\bhumi
copy .env.production.example .env
# Edit .env — set JWT_SECRET, REGISTRY_PRIMARY_* (already in .env if merged)

docker compose -f docker-compose.prod.yml up -d --build
```

Open: **http://localhost** (port 80)

Stop:

```powershell
docker compose -f docker-compose.prod.yml down
```

---

## VS Code tasks (optional)

Use **Terminal → Run Task** if tasks are configured, or run the commands above manually.

---

## Health checks

| Service | URL |
|---------|-----|
| API | http://localhost:5000/api/health |
| Frontend (dev) | http://localhost:5173 |
| Frontend (Docker) | http://localhost |
