# Deployment Summary - Padel Russia

## Project Successfully Deployed to Production

**Server:** 85.198.67.207  
**Domain:** padel-russia.online  
**Deployment Date:** May 1, 2026

## Architecture

The application is deployed using Docker Compose with the following services:

### 1. **Frontend** (React + Vite)
- Built and served via Nginx inside the container
- Port 80 (internal)
- Handles all UI and client-side routing

### 2. **Backend** (Node.js + Express + Prisma)
- RESTful API server
- Port 3001 (internal)
- SQLite database for data persistence
- Health check endpoint at `/health`

### 3. **Nginx Reverse Proxy**
- Handles SSL termination (Let's Encrypt certificates)
- Routes traffic to frontend and backend
- Provides security headers and compression
- Ports 80 (HTTP) and 443 (HTTPS) exposed

## Key Features

✅ **HTTPS with Let's Encrypt SSL**  
✅ **Automatic HTTP to HTTPS redirect**  
✅ **Security headers (HSTS, X-Frame-Options, etc.)**  
✅ **Gzip compression**  
✅ **SPA routing support**  
✅ **API proxying**  
✅ **Static asset caching**  
✅ **Health check endpoint**  
✅ **Docker containerization**  
✅ **Production-ready configuration**

## Deployment Files

### Core Files
- `docker-compose.yml` - Main Docker Compose configuration
- `nginx/prod.conf` - Nginx reverse proxy configuration
- `.env.example` - Environment variables template
- `deploy.sh` - Deployment script
- `scripts/check-ports.sh` - Port availability checker

### Production Configuration
- `docker-compose.prod.yml` - Alternative production compose file (if needed)

## Deployment Process

### Prerequisites
1. SSH access to server: `ssh -i C:\Users\HONOR\.ssh\beget root@85.198.67.207`
2. Docker and Docker Compose installed on server
3. Domain DNS pointing to server IP (85.198.67.207)
4. Port 80 and 443 available

### Deployment Steps

1. **Initial Setup** (one-time)
   ```bash
   # Clone repository
   git clone https://github.com/seomozg/padel-russia.git /opt/padel-russia
   
   # Install Certbot for SSL
   apt update && apt install certbot -y
   
   # Create SSL directories
   mkdir -p /etc/letsencrypt/live/padel-russia.online
   mkdir -p /opt/padel-russia/nginx/www
   ```

2. **Deploy Application**
   ```bash
   # Copy configuration files
   scp -i C:\Users\HONOR\.ssh\beget docker-compose.yml root@85.198.67.207:/opt/padel-russia/
   scp -i C:\Users\HONOR\.ssh\beget nginx/prod.conf root@85.198.67.207:/opt/padel-russia/nginx/
   
   # SSH to server
   ssh -i C:\Users\HONOR\.ssh\beget root@85.198.67.207
   
   # Navigate to project directory
   cd /opt/padel-russia
   
   # Request SSL certificate
   certbot certonly --standalone -d padel-russia.online -d www.padel-russia.online --email your-email@example.com --agree-tos --non-interactive
   
   # Copy SSL certificates
   cp /etc/letsencrypt/live/padel-russia.online/fullchain.pem /etc/letsencrypt/live/padel-russia.online/privkey.pem /etc/letsencrypt/
   
   # Build and start containers
   docker-compose build
   docker-compose up -d
   ```

3. **Verify Deployment**
   ```bash
   # Check container status
   docker ps
   
   # Check logs
   docker-compose logs -f
   
   # Test health endpoint
   curl https://padel-russia.online/health
   ```

## Updating the Application

### Update Code
```bash
# Pull latest changes
cd /opt/padel-russia
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d
```

### Update Configuration
```bash
# Copy updated files from local
scp -i C:\Users\HONOR\.ssh\beget docker-compose.yml root@85.198.67.207:/opt/padel-russia/
scp -i C:\Users\HONOR\.ssh\beget nginx/prod.conf root@85.198.67.207:/opt/padel-russia/nginx/

# Restart affected services
cd /opt/padel-russia
docker-compose restart nginx  # if nginx config changed
docker-compose up -d          # if docker-compose changed
```

## Monitoring

### Check Service Status
```bash
# All containers
docker ps

# Specific service logs
docker-compose logs -f nginx
docker-compose logs -f frontend
docker-compose logs -f backend

# Resource usage
docker stats
```

### Health Checks
```bash
# Frontend
curl https://padel-russia.online/

# Backend API
curl https://padel-russia.online/health

# Courts API
curl https://padel-russia.online/courts
```

## SSL Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up automatic renewal:

```bash
# Test renewal
certbot renew --dry-run

# Set up cron job for automatic renewal
crontab -e
# Add: 0 3 * * * certbot renew --quiet
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Check what's using ports 80/443
   netstat -tulpn | grep :80
   netstat -tulpn | grep :443
   
   # Stop conflicting services
   systemctl stop apache2  # if Apache is running
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate validity
   certbot certificates
   
   # Renew if needed
   certbot renew
   ```

3. **Container not starting**
   ```bash
   # Check logs
   docker-compose logs [service-name]
   
   # Restart service
   docker-compose restart [service-name]
   ```

4. **Database issues**
   ```bash
   # Check database file
   ls -la /opt/padel-russia/backend/prisma/dev.db
   
   # Reset database (WARNING: deletes all data)
   docker-compose exec backend npx prisma migrate reset --force
   ```

## Security Considerations

✅ SSL/TLS encryption enabled  
✅ Security headers configured  
✅ CORS properly configured  
✅ Input validation on backend  
✅ Environment variables for secrets  
✅ Regular security updates needed  

### Recommended Additional Security

1. **Set up firewall**
   ```bash
   ufw allow 22/tcp    # SSH
   ufw allow 80/tcp    # HTTP
   ufw allow 443/tcp   # HTTPS
   ufw enable
   ```

2. **Enable automatic security updates**
   ```bash
   apt install unattended-upgrades
   dpkg-reconfigure --priority=low unattended-upgrades
   ```

3. **Set up monitoring**
   - Consider adding uptime monitoring
   - Set up log rotation
   - Monitor disk space and resources

## Environment Variables

The application uses the following environment variables (set in `.env` file):

- `JWT_SECRET` - Secret key for JWT tokens (required)
- `GOOGLE_PLACES_API_KEY` - Google Places API key (optional)
- `PERPLEXITY_API_KEY` - Perplexity API key (optional)
- `VITE_YANDEX_MAPS_API_KEY` - Yandex Maps API key (set in docker-compose.yml)

## Database

- **Type:** SQLite
- **Location:** `/opt/padel-russia/backend/prisma/dev.db`
- **ORM:** Prisma
- **Migrations:** Automatic on startup

### Backup Database
```bash
cp /opt/padel-russia/backend/prisma/dev.db /opt/padel-russia/backend/prisma/dev.db.backup
```

### Restore Database
```bash
cp /opt/padel-russia/backend/prisma/dev.db.backup /opt/padel-russia/backend/prisma/dev.db
docker-compose restart backend
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Check disk space: `df -h`
   - Check logs for errors: `docker-compose logs --tail 100`
   - Update system packages: `apt update && apt upgrade -y`

2. **Monthly:**
   - Review and rotate logs
   - Check SSL certificate expiration
   - Review security updates
   - Backup database

3. **As needed:**
   - Update application code
   - Update dependencies
   - Monitor performance

## Contact and Resources

- **Repository:** https://github.com/seomozg/padel-russia
- **Domain:** padel-russia.online
- **Server IP:** 85.198.67.207

## Deployment Checklist

- [x] Server provisioned and accessible via SSH
- [x] Docker and Docker Compose installed
- [x] Domain DNS configured (A record pointing to 85.198.67.207)
- [x] SSL certificates obtained from Let's Encrypt
- [x] Docker images built successfully
- [x] All containers running and healthy
- [x] HTTPS working with valid certificate
- [x] Frontend accessible and functional
- [x] Backend API responding correctly
- [x] Security headers configured
- [x] Deployment documentation created

## Status: ✅ PRODUCTION READY

The application is fully deployed and operational at https://padel-russia.online