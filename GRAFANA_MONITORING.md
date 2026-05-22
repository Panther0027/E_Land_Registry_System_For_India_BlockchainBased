# Grafana & Prometheus Monitoring Setup

## Overview

This monitoring stack consists of:
- **Prometheus** — time-series database for metrics collection
- **Grafana** — visualization and alerting platform
- **Jenkins** — instrumented with Prometheus metrics plugin

All services are containerized and included in `docker-compose.jenkins.yml`.

---

## Quick Start

### Start the monitoring stack

```powershell
cd D:\Project\ELandRegistryBloackchainBasedSystem\bhumi
docker-compose -f docker-compose.jenkins.yml up -d
```

### Access services

- **Jenkins:** http://localhost:8080
  - Username: `admin`
  - Password: `admin`

- **Prometheus:** http://localhost:9090
  - Metrics query interface
  - View scraped targets: http://localhost:9090/targets

- **Grafana:** http://localhost:3000
  - Username: `admin`
  - Password: `admin`

---

## Grafana Setup

### Auto-provisioned resources

After starting, Grafana automatically:
1. Adds Prometheus as a data source
2. Imports the Jenkins Build Logs dashboard

### Manual dashboard import (if needed)

1. Open Grafana: http://localhost:3000
2. Go to **Dashboards** → **New** → **Import**
3. Upload: `monitoring/grafana/dashboards/jenkins-builds.json`

---

## Dashboard: Jenkins Build Logs

The dashboard displays:

1. **Builds Over Time** — Line chart showing build volume
2. **Average Job Duration** — Gauge showing current average
3. **Build Success Rate** — Pie chart (successful vs failed)
4. **Build Duration by Job** — Stacked bar chart by job name

### Metrics used

- `jenkins_builds_total` — Total builds executed
- `jenkins_builds_success_total` — Successful builds
- `jenkins_builds_failed_total` — Failed builds
- `jenkins_job_duration_seconds` — Job execution time

---

## Prometheus Configuration

Located at: `monitoring/prometheus.yml`

### Scrape jobs

1. **Prometheus** — self-monitoring on port 9090
2. **Jenkins** — metrics endpoint `/prometheus` on port 8080
3. **Docker** (optional) — Docker daemon metrics

### Query examples

```promql
# Total builds in last 5 minutes
increase(jenkins_builds_total[5m])

# Build success rate
jenkins_builds_success_total / jenkins_builds_total

# Average job duration
avg(jenkins_job_duration_seconds)

# Failed builds
increase(jenkins_builds_failed_total[1h])
```

Access **Prometheus Graph UI**: http://localhost:9090/graph

---

## Enable Prometheus plugin in Jenkins

1. Go to Jenkins: http://localhost:8080
2. **Manage Jenkins** → **Manage Plugins**
3. Search for **Prometheus metrics**
4. Install **Prometheus Metrics Plugin**
5. Restart Jenkins
6. Access metrics: http://localhost:8080/prometheus

---

## Alerts (Optional)

### Add alerting rules

Create `monitoring/prometheus-rules.yml`:

```yaml
groups:
  - name: jenkins
    rules:
      - alert: HighFailureRate
        expr: (jenkins_builds_failed_total / jenkins_builds_total) > 0.5
        for: 5m
        annotations:
          summary: "High build failure rate"
```

Then update `monitoring/prometheus.yml`:

```yaml
rule_files:
  - "prometheus-rules.yml"
```

### Configure Grafana alerts

1. In Grafana, edit any panel
2. Go to **Alert** tab
3. Set conditions and notification channels

---

## Logs and debugging

### View Prometheus logs
```powershell
docker logs bhumi-prometheus
```

### View Grafana logs
```powershell
docker logs bhumi-grafana
```

### Check Jenkins metrics endpoint
```powershell
curl http://localhost:8080/prometheus
```

---

## Stop monitoring stack

```powershell
docker-compose -f docker-compose.jenkins.yml down
```

To remove volumes (reset all data):
```powershell
docker-compose -f docker-compose.jenkins.yml down -v
```

---

## Next steps

1. **Install Prometheus plugin in Jenkins** (see above)
2. **Set up custom alerts** for build failures
3. **Add more dashboards** for Docker/server metrics
4. **Configure webhook notifications** (Slack, email, etc.)

---

## Useful links

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Jenkins Prometheus Plugin](https://plugins.jenkins.io/prometheus/)
