# Jenkins CI/CD Pipeline Setup

## Overview
This project includes a Jenkinsfile for automated Docker image building and pushing to Docker Hub.

The pipeline:
1. Checks out the repository
2. Builds Docker images for server and client
3. Optionally runs tests
4. Logs into Docker Hub
5. Pushes images with build number and `latest` tags
6. Cleans up

---

## Quick Start (Local Jenkins with Docker Compose)

### 1. Start Jenkins
```bash
cd /d/Project/ELandRegistryBloackchainBasedSystem/bhumi
docker compose -f docker-compose.jenkins.yml up -d
```

### 2. Access Jenkins
Open browser:
```
http://localhost:8080
```

### 3. Initial Setup
- Get admin password:
```bash
docker logs bhumi-jenkins | grep -i "please use the following password"
```

- Install suggested plugins
- Create first admin user

---

## Configure Jenkins for Bhumi Project

### Step 1: Add Docker Hub Credentials

1. Go to Jenkins → Manage Jenkins → Manage Credentials
2. Click "System" → "Global credentials"
3. Click "Add Credentials"
4. Fill in:
   - **Username:** `panther27`
   - **Password:** `<NEW_DOCKER_HUB_TOKEN>` (revoke old token, create new one)
   - **ID:** `DOCKERHUB_TOKEN`
   - **Description:** Docker Hub access token

5. Click "Create"

### Step 2: Add Docker Username Credential

1. Repeat above steps:
   - **Username:** `panther27`
   - **Password:** `panther27` (same as username for this one)
   - **ID:** `DOCKERHUB_USERNAME`
   - **Description:** Docker Hub username

Or use a text credential:
- Secret text value: `panther27`
- ID: `DOCKERHUB_USERNAME`

---

## Create a Pipeline Job

### Step 1: New Job
1. Go to Jenkins home
2. Click "New Item"
3. Enter name: `Bhumi-Docker-Pipeline`
4. Select "Pipeline"
5. Click "OK"

### Step 2: Configure Pipeline

1. Under "Pipeline" section:
   - **Definition:** Select "Pipeline script from SCM"
   - **SCM:** Select "Git"
   - **Repository URL:** `https://github.com/Panther0027/E_Land_Registry_System_For_India_BlockchainBased.git`
   - **Branch:** `*/main`
   - **Script Path:** `Jenkinsfile`

2. Under "Build Triggers":
   - Check "Poll SCM"
   - Schedule: `H/15 * * * *` (check every 15 minutes)
   - Or use GitHub webhook (see below)

3. Click "Save"

### Step 3: GitHub Webhook (Optional but Recommended)

#### On GitHub:
1. Go to repo → Settings → Webhooks
2. Click "Add webhook"
3. **Payload URL:** `http://<JENKINS_IP>:8080/github-webhook/`
4. **Content type:** `application/json`
5. **Events:** Select "Push events"
6. **Active:** Check
7. Click "Add webhook"

#### On Jenkins:
1. In Jenkins job → Configure
2. Under "Build Triggers":
   - Check "GitHub hook trigger for GITScm polling"
3. Click "Save"

---

## Run Pipeline

### Manual Trigger
1. Go to job → Click "Build Now"
2. Click build number to view logs
3. Click "Console Output" to see detailed logs

### Automatic Trigger
- Push to `main` branch (webhook) or Jenkins will poll SCM

---

## Environment Variables in Pipeline

The Jenkinsfile uses these credentials:
- `DOCKERHUB_USERNAME` → Jenkins credential ID
- `DOCKERHUB_TOKEN` → Jenkins credential ID

These are injected automatically from Jenkins Credentials store.

---

## Troubleshooting

### Docker build fails
- Check Docker is running in Jenkins container:
```bash
docker exec bhumi-jenkins docker ps
```

### Push fails
- Verify credentials are correct:
```bash
docker exec bhumi-jenkins cat /var/jenkins_home/credentials.xml | grep -i docker
```

### Pipeline not triggering
- Manually trigger: Job → "Build Now"
- Check webhook (if using): GitHub → Settings → Webhooks → Recent Deliveries
- Check Jenkins logs:
```bash
docker logs bhumi-jenkins
```

---

## Stop Jenkins

```bash
docker compose -f docker-compose.jenkins.yml down
```

To remove volumes:
```bash
docker compose -f docker-compose.jenkins.yml down -v
```

---

## Deploy to Production

After images are pushed to Docker Hub, deploy via:

```bash
# Pull latest images
docker compose pull

# Start containers
docker compose up -d
```

Or add a deployment stage in Jenkinsfile (SSH to prod server, pull & restart).

---

## Next: Add Firebase Integration

Once Firebase setup is ready (web config + service account), update:
- `server/config/firebase.js` with admin SDK
- `client/src/firebase.js` with web config
- Redeploy via Jenkins

---

## References
- [Jenkins Official Docs](https://www.jenkins.io/doc/)
- [Jenkinsfile Syntax](https://www.jenkins.io/doc/book/pipeline/jenkinsfile/)
- [Docker Hub Integration](https://plugins.jenkins.io/docker-commons/)
