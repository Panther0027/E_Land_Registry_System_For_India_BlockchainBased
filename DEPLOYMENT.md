Docker deployment
=================

Files added:
- `client/Dockerfile` — multi-stage build producing static site served by nginx
- `server/Dockerfile` — production Node image
- `nginx/nginx.conf` — reverse proxy routing `/api` to server and `/` to client
- `docker-compose.yml` — compose file for local deployment (mongo, server, client, nginx)
- `.github/workflows/docker-publish.yml` — GitHub Actions workflow to build and push images

Required GitHub secrets (set these in your repository settings → Secrets):
- `DOCKERHUB_USERNAME` — your Docker Hub username (e.g., `panther27`)
- `DOCKERHUB_TOKEN` — Docker Hub access token (use token, not password)

How it works:
- Push to `main` triggers the workflow which builds server and client images and pushes them to Docker Hub under
  `${{ secrets.DOCKERHUB_USERNAME }}/blockchainbased_elandregistrysystem-server` and `...-client`.

Local run (build and run with compose):
```bash
docker compose build
docker compose up
```

Environment variables for production (examples):
- `MONGO_URI` (default in compose points to mongo service)
- `JWT_SECRET`
- `NODE_ENV=production`
- `FIREBASE_*` values — provide after Firebase setup

Next steps I can do for you:
- Add server verification with `firebase-admin` when you provide service account JSON
- Wire client `firebase` config when you provide web app config
- Update workflow to push to a single repo/tag format if you prefer
