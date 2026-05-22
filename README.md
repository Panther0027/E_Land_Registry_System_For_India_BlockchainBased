# Bhumi — Blockchain Land Registry System

**Your Land. Your Truth. On Chain.**

Bhumi is a production-ready full-stack blockchain-based land registry system for India — designed as a portfolio-grade, government-trustworthy platform with multi-language support, public verification, and complete land lifecycle management.

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Public Verification** | Anyone can verify land records at `/verify` — no login required |
| **QR Code Verification** | Scan QR on property certificates for instant lookup |
| **PDF Certificates** | Download official Bhumi land ownership certificates |
| **Multi-language** | English, Hindi (हिंदी), Odia (ଓଡ଼ିଆ) via i18next |
| **MetaMask Integration** | Connect Ethereum wallet for blockchain identity |
| **Dispute Management** | Raise disputes on-chain; officials resolve via panel |
| **Government Analytics** | Registry stats, state breakdown, verification rates |
| **Role-based Access** | Owner, Government Official, Verifier with distinct dashboards |
| **IPFS Documents** | Deeds and proofs stored permanently on IPFS via Pinata |
| **Blockchain Events** | Real-time listeners for register, verify, transfer, dispute |

---

## Architecture

```
bhumi/
├── client/          # React + Vite + Tailwind + i18n
├── server/          # Node.js + Express + MongoDB
├── contracts/       # Solidity + Hardhat (Sepolia)
```

---

## Quick Start

### Option A: Local Development

```bash
cd bhumi
cp .env.example .env

# Install all dependencies
npm run install:all

# Start MongoDB, then seed data
cd server && npm run seed

# Terminal 1 — Backend
npm run dev

# Terminal 2 — Frontend
cd ../client && npm run dev
```

Open **http://localhost:5173**

### Option B: Local setup

```bash
cd bhumi
cp .env.example .env
npm run install:all
cd server && npm run seed
```

Then start the backend and frontend locally:

```bash
npm run dev:server
npm run dev:client
```

Open **http://localhost:5173**

See **[DEMO_GUIDE.md](./DEMO_GUIDE.md)** for presentation walkthrough.

### Dataset (10,000 real records)

The file `data/land_registry_dataset_10000.xlsx` is imported into MongoDB with property IDs like **`LR-7D185238`**.

Set in `.env` before import:

```env
REGISTRY_PRIMARY_EMAIL=your@gmail.com
REGISTRY_PRIMARY_PASSWORD=YourPass@123
ENABLE_DEMO_MODE=false
```

Then all 10,000 properties are assigned to **your email** for login, transfer, verify, and documents.

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Owner | rajesh@example.com | Owner@123 |
| Government Official | official@bhumi.gov.in | Official@123 |
| Verifier | verifier@bhumi.gov.in | Verifier@123 |

**Sample Properties:** `BH-001-KHURDA` (verified), `BH-002-CUTTACK` (pending), `BH-004-PURI` (disputed)

**Public Verify:** http://localhost:5173/verify?id=BH-001-KHURDA

---

## Pages

### Public (no login)
- `/home` — Marketing homepage with live stats
- `/about` — Mission, values, tech stack
- `/how-it-works` — 5-step process guide
- `/verify` — Public property search + QR verification
- `/landing` — Onboarding carousel

### Authenticated
- Dashboard (role-aware: owner vs official stats)
- Register Property (multi-step + IPFS)
- My Properties (filter, search, sort)
- Property Detail (certificate, QR, dispute, blockchain history)
- Transfer Ownership (OTP mock + blockchain)
- Government Panel (analytics, pending, disputes, resolve)
- Documents, Notifications, Profile (MetaMask + language)

---

## API Highlights

```
GET  /api/property/stats/public        Public registry stats
GET  /api/property/search              Public property lookup
GET  /api/property/:id/certificate     Download PDF certificate
GET  /api/property/government/stats    Analytics dashboard
GET  /api/property/disputed/all        Disputed properties
POST /api/property/dispute/:id         Raise on-chain dispute
POST /api/property/resolve/:id         Resolve dispute (official)
PUT  /api/auth/wallet                  Link MetaMask wallet
```

---

## Environment Variables

See `.env.example` for full list. Key variables:

```env
MONGODB_URI=mongodb://localhost:27017/bhumi
JWT_SECRET=your-secret
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=your-wallet-private-key
CONTRACT_ADDRESS=deployed-contract-address
PINATA_API_KEY=your-pinata-key
PINATA_SECRET_KEY=your-pinata-secret
```

> Blockchain and IPFS work in **mock mode** when credentials are not configured.

---

## Smart Contract

Deploy to Sepolia:
```bash
cd contracts
npm run compile
npm run deploy:sepolia
```

Functions: `registerProperty`, `verifyProperty`, `transferOwnership`, `raiseDispute`, `getProperty`, `getOwnershipHistory`

---

## Security

- Aadhaar hashed with HMAC-SHA256 (never plain text)
- JWT + role-based access control
- bcrypt password hashing (12 rounds)
- Rate limiting, Helmet, CORS
- Zod (frontend) + express-validator (backend)

---

## License

MIT
