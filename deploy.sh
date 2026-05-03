#!/bin/bash

# Deployment script for padel-russia.online
# Usage: ./deploy.sh

set -e

# Configuration
SERVER_USER="root"
SERVER_HOST="85.198.67.207"
SSH_KEY="C:/Users/HONOR/.ssh/beget"
DEPLOY_PATH="/var/www/padel-russia"
DOMAIN="padel-russia.online"
GIT_REPO="https://github.com/seomozg/padel-russia.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Padel Russia Deployment Script ===${NC}"
echo ""

# Function to print status
print_status() {
    echo -e "${YELLOW}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Check SSH connection
print_status "Step 1: Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'" > /dev/null 2>&1; then
    print_success "SSH connection established"
else
    print_error "Cannot connect to server. Please check SSH key and network."
    exit 1
fi

# Step 2: Check if Docker is installed
print_status "Step 2: Checking Docker installation..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "docker --version" > /dev/null 2>&1; then
    print_success "Docker is installed"
else
    print_error "Docker is not installed on the server"
    echo "Please install Docker and Docker Compose first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sh get-docker.sh"
    exit 1
fi

# Step 3: Check if Docker Compose is installed
print_status "Step 3: Checking Docker Compose installation..."
COMPOSE_CMD=""
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "docker compose version" > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    print_success "Docker Compose is installed"
elif ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "docker-compose --version" > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    print_success "Docker Compose is installed (standalone)"
else
    print_error "Docker Compose is not installed"
    echo "Please install Docker Compose v2+"
    exit 1
fi

# Step 4: Create deployment directory
print_status "Step 4: Creating deployment directory..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH"
print_success "Deployment directory created"

# Step 5: Clone or update repository
print_status "Step 5: Cloning/updating repository..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "[ -d $DEPLOY_PATH/.git ]"; then
    print_status "Repository exists, pulling latest changes..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_PATH && git pull origin main"
else
    print_status "Cloning repository..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "git clone $GIT_REPO $DEPLOY_PATH"
fi
print_success "Repository is up to date"

# Step 6: Create SSL directory structure
print_status "Step 6: Setting up SSL directories..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH/ssl/certs"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "mkdir -p $DEPLOY_PATH/ssl/www"
print_success "SSL directories created"

# Step 7: Copy production files
print_status "Step 7: Copying production configuration files..."

# Copy docker-compose.prod.yml
scp -i "$SSH_KEY" docker-compose.prod.yml "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/docker-compose.yml"

# Copy nginx configuration
scp -i "$SSH_KEY" nginx/prod.conf "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/nginx/prod.conf"

print_success "Configuration files copied"

# Step 8: Install SSL certificates
print_status "Step 8: Setting up Let's Encrypt SSL..."

# Check if Certbot is installed
if ! ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "certbot --version" > /dev/null 2>&1; then
    print_status "Installing Certbot..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "apt-get update && apt-get install -y certbot python3-certbot-nginx"
fi

# Try to obtain SSL certificate
print_status "Requesting SSL certificate for $DOMAIN..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN" || {
    print_error "Failed to obtain SSL certificate"
    echo "Please check if domain is pointing to server IP and port 80 is available"
    exit 1
}
print_success "SSL certificate obtained"

# Copy certificates to deployment directory
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cp -r /etc/letsencrypt/live/$DOMAIN/* $DEPLOY_PATH/ssl/certs/"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cp -r /etc/letsencrypt/archive/$DOMAIN/* $DEPLOY_PATH/ssl/certs/" || true

# Step 9: Build and start containers
print_status "Step 9: Building Docker images..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_PATH && $COMPOSE_CMD build"
print_success "Docker images built"

# Step 10: Start services
print_status "Step 10: Starting services..."
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_PATH && $COMPOSE_CMD up -d"
print_success "Services started"

# Step 11: Check service status
print_status "Step 11: Checking service status..."
sleep 5
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_PATH && $COMPOSE_CMD ps"

# Step 12: Show logs
print_status "Step 12: Service logs (last 20 lines):"
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" "cd $DEPLOY_PATH && $COMPOSE_CMD logs --tail=20"

echo ""
print_success "=== Deployment completed successfully! ==="
echo ""
echo "Your application is now available at:"
echo "  https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Set up DNS A record for $DOMAIN pointing to $SERVER_HOST"
echo "2. Set up automatic SSL renewal: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'certbot renew --dry-run'"
echo "3. Check application logs: ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST 'cd $DEPLOY_PATH && docker compose logs -f'"
echo ""