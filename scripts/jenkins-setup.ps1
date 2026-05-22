# Jenkins Setup Helper Script for Bhumi Project (Windows PowerShell)
# This script helps automate Jenkins configuration

param(
    [string]$Option = ""
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Bhumi Jenkins Setup Helper (Windows)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check Docker
try {
    $null = docker --version
    Write-Host "OK - Docker found" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Docker is not installed" -ForegroundColor Red
    exit 1
}

# Check docker-compose
try {
    $null = docker-compose --version
    Write-Host "OK - Docker Compose found" -ForegroundColor Green
} catch {
    Write-Host "ERROR - Docker Compose is not installed" -ForegroundColor Red
    exit 1
}

# Menu
Write-Host ""
Write-Host "Choose an option:" -ForegroundColor Cyan
Write-Host "1. Start Jenkins (docker-compose)"
Write-Host "2. Stop Jenkins"
Write-Host "3. View Jenkins logs"
Write-Host "4. Reset Jenkins (remove volumes)"
Write-Host "5. Install Jenkins plugins (manual step info)"
Write-Host "6. View Jenkins URL and credentials"
Write-Host "0. Exit"
Write-Host ""

if ($Option -eq "") {
    $Option = Read-Host "Enter option (0-6)"
}

switch ($Option) {
    "1" {
        Write-Host "Starting Jenkins..." -ForegroundColor Cyan
        docker-compose -f docker-compose.jenkins.yml up -d
        Write-Host "OK - Jenkins started" -ForegroundColor Green
        Write-Host ""
        Write-Host "Waiting 10 seconds for Jenkins to start..." -ForegroundColor Cyan
        Start-Sleep -Seconds 10
        Write-Host ""
        Write-Host "Jenkins URL: http://localhost:8080" -ForegroundColor Green
        Write-Host ""
        Write-Host "To get initial admin password, run:"
        Write-Host "docker logs bhumi-jenkins | findstr /I password" -ForegroundColor Yellow
        break
    }
    "2" {
        Write-Host "Stopping Jenkins..." -ForegroundColor Cyan
        docker-compose -f docker-compose.jenkins.yml down
        Write-Host "OK - Jenkins stopped" -ForegroundColor Green
        break
    }
    "3" {
        Write-Host "Fetching Jenkins logs..." -ForegroundColor Cyan
        docker logs bhumi-jenkins
        break
    }
    "4" {
        $confirm = Read-Host "Are you sure? This will delete all Jenkins data (y/n)"
        if ($confirm -eq "y") {
            Write-Host "Removing Jenkins volumes..." -ForegroundColor Cyan
            docker-compose -f docker-compose.jenkins.yml down -v
            Write-Host "OK - Jenkins reset" -ForegroundColor Green
        }
        else {
            Write-Host "Cancelled"
        }
        break
    }
    "5" {
        Write-Host "Manual setup steps:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "1. Add Credentials in Jenkins:"
        Write-Host "   - Jenkins menu: Manage Jenkins / Manage Credentials"
        Write-Host "   - System / Global credentials / Add Credentials"
        Write-Host ""
        Write-Host "2. Create two credentials:"
        Write-Host "   Credential 1 - Username with password:"
        Write-Host "      Username: panther27"
        Write-Host "      Password: YOUR_DOCKER_HUB_TOKEN"
        Write-Host "      ID: DOCKERHUB_TOKEN"
        Write-Host ""
        Write-Host "   Credential 2 - Secret text or username/password:"
        Write-Host "      Secret: panther27"
        Write-Host "      ID: DOCKERHUB_USERNAME"
        Write-Host ""
        Write-Host "3. Create Pipeline Job:"
        Write-Host "   - Jenkins home / New Item"
        Write-Host "   - Name: Bhumi-Docker-Pipeline"
        Write-Host "   - Type: Pipeline"
        Write-Host "   - Definition: Pipeline script from SCM"
        Write-Host "   - SCM: Git"
        Write-Host "   - URL: https://github.com/Panther0027/E_Land_Registry_System_For_India_BlockchainBased.git"
        Write-Host "   - Script path: Jenkinsfile"
        Write-Host ""
        break
    }
    "6" {
        Write-Host "Jenkins Information:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "URL: http://localhost:8080" -ForegroundColor Green
        Write-Host ""
        Write-Host "Admin password:" -ForegroundColor Yellow
        try {
            $logs = docker logs bhumi-jenkins 2>$null
            $password = $logs | Select-String -Pattern "please use the following password"
            if ($password) {
                Write-Host $password -ForegroundColor Green
            }
            else {
                Write-Host "(Jenkins may not be running yet)" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "(Jenkins may not be running yet)" -ForegroundColor Yellow
        }
        Write-Host ""
        break
    }
    "0" {
        Write-Host "Exiting..."
        exit 0
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
