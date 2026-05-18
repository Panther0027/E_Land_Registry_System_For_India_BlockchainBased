# Bhumi — Demo Presentation Guide

## Quick access (Docker production)

```bash
docker compose -f docker-compose.prod.yml up -d
```

- **Web app:** http://localhost  
- **API health:** http://localhost/api/health  

---

## 1. Login (seed accounts)

After `RUN_SEED=true` (default in Docker), use:

| Role | Email | Password |
|------|-------|----------|
| Property owner | `rajesh@example.com` | `Owner@123` |
| Government official | `official@bhumi.gov.in` | `Official@123` |
| Verifier | `verifier@bhumi.gov.in` | `Verifier@123` |

**New registration (demo mode without MongoDB):**

- Aadhaar: `7890-1234-5674`
- Password: `Owner@123`
- Use a **new email** (e.g. `demo@yourname.com`)

---

## 2. Verify property (public, no login)

1. Open **Verify** → enter **`BH-001-KHURDA`**
2. Click **Verify on Blockchain** → shows Sepolia / demo chain record

Other demo IDs: `BH-002-CUTTACK`, `BH-003-BBSR`, `BH-004-PURI`

---

## 3. Register a new property

1. Login as **rajesh@example.com**
2. **Dashboard** → **Register Property**
3. Use sample data:

| Field | Example |
|-------|---------|
| Survey Number | `SN-2026-DEMO-01` |
| District | `Khurda` |
| State | `Odisha` |
| Pincode | `751001` |
| Area | `1500` |
| Land type | Residential |
| Owner name | Rajesh Kumar |
| Owner Aadhaar | `2345-6789-0124` |

4. **Documents step:** download sample files from **Documents** page:
   - `land_deed_khurda.pdf`
   - `ownership_proof_khurda.txt`
5. Upload them as **Land deed** and **Ownership proof**
6. Submit → property goes to **pending** until official verifies

---

## 4. Government verification

1. Login as **official@bhumi.gov.in** / `Official@123`
2. **Government Panel** → pending properties → **Verify**

---

## 5. Transfer ownership

1. Login as owner with a **verified** property (e.g. `BH-001-KHURDA`)
2. **Transfer** → select property
3. New owner Aadhaar (valid demo): `7890-1234-5674`
4. Reason: `Sale to family member for agricultural use`
5. Complete OTP step (demo OTP shown in API response / logs)

---

## 6. Documents dashboard

1. **Documents** in sidebar
2. See pre-loaded demo IPFS records for `BH-001-KHURDA`, etc.
3. Download **demo sample files** at top (fake deed/proof for uploads)
4. Select a property → **Upload Document** (PDF or image)

---

## Fake documents included in repo

- `server/demo-assets/land_deed_khurda.pdf`
- `server/demo-assets/ownership_proof_khurda.txt`

Download in app: **Documents** → “Demo sample files” buttons.

---

## Blockchain (optional)

```bash
cd server && npm run seed:blockchain
```

Registers demo property IDs on Sepolia (requires `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS` in `.env`).
