#!/bin/bash

# Jenkins Setup Helper Script for Bhumi Project
# This script helps automate Jenkins configuration

set -e

echo "=========================================="
echo "Bhumi Jenkins Setup Helper"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker found${NC}"

# Check docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose found${NC}"

# Menu
echo ""
echo -e "${BLUE}Choose an option:${NC}"
echo "1. Start Jenkins (docker-compose)"
echo "2. Stop Jenkins"
echo "3. View Jenkins logs"
echo "4. Reset Jenkins (remove volumes)"
echo "5. Install Jenkins plugins (manual step info)"
echo "6. View Jenkins URL and credentials"
echo "0. Exit"
echo ""

read -p "Enter option (0-6): " OPTION

case $OPTION in
    1)
        echo -e "${BLUE}Starting Jenkins...${NC}"
        docker compose -f docker-compose.jenkins.yml up -d
        echo -e "${GREEN}✓ Jenkins started${NC}"
        echo ""
        echo -e "${BLUE}Waiting 10 seconds for Jenkins to start...${NC}"
        sleep 10
        echo ""
        echo -e "${GREEN}Jenkins URL: http://localhost:8080${NC}"
        echo ""
        echo "To get initial admin password, run:"
        echo "docker logs bhumi-jenkins | grep -i 'please use the following password'"
        ;;
    2)
        echo -e "${BLUE}Stopping Jenkins...${NC}"
        docker compose -f docker-compose.jenkins.yml down
        echo -e "${GREEN}✓ Jenkins stopped${NC}"
        ;;
    3)
        echo -e "${BLUE}Fetching Jenkins logs...${NC}"
        docker logs bhumi-jenkins
        ;;
    4)
        read -p "Are you sure? This will delete all Jenkins data (y/n): " CONFIRM
        if [ "$CONFIRM" = "y" ]; then
            echo -e "${BLUE}Removing Jenkins volumes...${NC}"
            docker compose -f docker-compose.jenkins.yml down -v
            echo -e "${GREEN}✓ Jenkins reset${NC}"
        else
            echo "Cancelled"
        fi
        ;;
    5)
        echo -e "${BLUE}Manual setup steps:${NC}"
        echo ""
        echo "1. Add Credentials in Jenkins:"
        echo "   - Jenkins → Manage Jenkins → Manage Credentials"
        echo "   - System → Global credentials → Add Credentials"
        echo ""
        echo "2. Create two credentials:"
        echo "   a) Username with password:"
        echo "      - Username: panther27"
        echo "      - Password: <DOCKER_HUB_TOKEN>"
        echo "      - ID: DOCKERHUB_TOKEN"
        echo ""
        echo "   b) Secret text (or username/password):"
        echo "      - Secret: panther27"
        echo "      - ID: DOCKERHUB_USERNAME"
        echo ""
        echo "3. Create Pipeline Job:"
        echo "   - Jenkins home → New Item"
        echo "   - Name: Bhumi-Docker-Pipeline"
        echo "   - Type: Pipeline"
        echo "   - Definition: Pipeline script from SCM"
        echo "   - SCM: Git"
        echo "   - URL: https://github.com/Panther0027/E_Land_Registry_System_For_India_BlockchainBased.git"
        echo "   - Script path: Jenkinsfile"
        echo ""
        ;;
    6)
        echo -e "${BLUE}Jenkins Information:${NC}"
        echo ""
        echo "URL: http://localhost:8080"
        echo ""
        echo "Admin password:"
        docker logs bhumi-jenkins 2>/dev/null | grep -i "please use the following password" || echo "(Jenkins may not be running yet)"
        echo ""
        ;;
    0)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Done!${NC}"
