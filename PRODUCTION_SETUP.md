# Production setup — real data (10,000 properties)

## Requirements

| Requirement | Version / notes |
|-------------|-----------------|
| **Docker Desktop** | 4.x+ (Windows/Mac) or Docker Engine on Linux |
| **RAM** | 4 GB minimum (8 GB recommended for MongoDB + import) |
| **Disk** | ~2 GB free |
| **Ports** | `80` (web), `5000` (API optional), `27017` (MongoDB internal) |
| **MongoDB** | Included in Docker Compose |
| **Git** | To clone the repository |

Optional for full blockchain/IPFS:

- Alchemy/Infura **Sepolia RPC URL**
- Wallet **PRIVATE_KEY** + deployed **CONTRACT_ADDRESS**
- **Pinata** API keys (otherwise mock IPFS hashes are used)

---

## Step 1 — Clone & configure

```bash
git clone https://github.com/Panther0027/E_Land_Registry_System_For_India_BlockchainBased.git
cd E_Land_Registry_System_For_India_BlockchainBased
cp .env.production.example .env
```

Edit `.env` and set **your real credentials**:

```env
REGISTRY_PRIMARY_EMAIL=you@gmail.com
REGISTRY_PRIMARY_PASSWORD=YourPass@123
REGISTRY_PRIMARY_FULL_NAME=Your Name
REGISTRY_PRIMARY_PHONE=9876543210
REGISTRY_PRIMARY_AADHAAR=789012345674
ENABLE_DEMO_MODE=false
JWT_SECRET=your-long-random-secret
```

---

## Step 2 — Run Docker

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First start imports **10,000 properties** from `data/land_registry_dataset_10000.xlsx` (5–15 minutes).

Watch logs:

```bash
docker compose -f docker-compose.prod.yml logs -f server
```

---

## Step 3 — Login

| Role | Email | Password |
|------|-------|----------|
| **You (all properties)** | Your `REGISTRY_PRIMARY_EMAIL` | Your `REGISTRY_PRIMARY_PASSWORD` |
| **Government (verify)** | `gov.official@landregistry.bhumi` | `BhumiGov@2026` |
| **Verifier** | `verifier@landregistry.bhumi` | `BhumiGov@2026` |

Open **http://localhost**

---

## What you can do

1. **My Properties** — 10,000 records (search `LR-7D185238`, etc.)
2. **Documents** — deed/proof per property (IPFS hashes from dataset)
3. **Transfer** — verified properties → new owner Aadhaar
4. **Government Panel** — login as gov → verify pending properties
5. **Public Verify** — `/verify` with any `LR-{PropertyID}`

---

## Import manually (without Docker)

```bash
cd server
npm install
# Start MongoDB locally, set MONGODB_URI in ../.env
npm run import:dataset
```

Credentials written to `IMPORTED_CREDENTIALS.txt`.

---

## Docker Hub images

- https://hub.docker.com/r/panther0027/bhumi-land-registry-api
- https://hub.docker.com/r/panther0027/bhumi-land-registry-web

```bash
docker login
docker compose -f docker-compose.prod.yml build
docker tag bhumi-server panther0027/bhumi-land-registry-api:latest
docker tag bhumi-client panther0027/bhumi-land-registry-web:latest
docker push panther0027/bhumi-land-registry-api:latest
docker push panther0027/bhumi-land-registry-web:latest
```

---

## Troubleshooting

- **Login fails** — MongoDB must be running; `ENABLE_DEMO_MODE=false`. Re-run import: `docker compose exec server node scripts/importLandRegistryDataset.js`
- **Empty properties** — wait for import to finish; check `docker logs bhumi-api`
- **Atlas instead of local Mongo** — set `MONGODB_URI` to Atlas connection string; whitelist your IP `0.0.0.0/0`
