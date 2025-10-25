# Pandora Intel - Enterprise Deployment Guide

## 🚀 Production Deployment Checklist

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- SSL certificates for HTTPS
- Domain name and DNS configuration
- Environment variables configured

### 1. Environment Setup

#### Backend Environment Variables
Create a `.env` file in the `server/` directory:

```bash
# Database
MONGODB_URI=mongodb://your-production-db:27017/pandora-intel

# Security
JWT_SECRET=your-super-secure-jwt-secret-key-here
NODE_ENV=production

# API Configuration
PORT=5000
CLIENT_URL=https://your-frontend-domain.com
API_URL=https://your-api-domain.com

# External APIs
COINGECKO_API_KEY=your-coingecko-api-key
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key

# Logging
LOG_LEVEL=warn
```

#### Frontend Environment Variables
Create a `.env` file in the `client/` directory:

```bash
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_SOCKET_URL=https://your-api-domain.com
```

### 2. Security Configuration

#### Database Security
- Enable MongoDB authentication
- Configure firewall rules
- Use SSL/TLS for database connections
- Regular backups

#### Application Security
- Use strong, unique JWT secrets
- Enable HTTPS only
- Configure CORS properly
- Set up rate limiting
- Regular security audits

### 3. Deployment Options

#### Option A: Docker Deployment
```dockerfile
# Dockerfile for backend
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
EXPOSE 5000
CMD ["npm", "start"]
```

#### Option B: Cloud Platform Deployment

**Heroku:**
```bash
# Install Heroku CLI
# Create Heroku app
heroku create pandora-intel-api
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set JWT_SECRET=your-secret
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

**AWS/DigitalOcean:**
- Use PM2 for process management
- Configure Nginx as reverse proxy
- Set up SSL with Let's Encrypt
- Configure monitoring and logging

### 4. Monitoring and Logging

#### Application Monitoring
- Set up health checks
- Monitor API response times
- Track error rates
- Database performance monitoring

#### Logging
- Winston logs are configured
- Log rotation setup
- Centralized logging (ELK stack recommended)
- Alert on critical errors

### 5. CI/CD Pipeline

The project includes GitHub Actions workflow (`.github/workflows/ci.yml`) that:
- Runs tests on push/PR
- Performs security audits
- Builds and deploys on main branch
- Checks for vulnerabilities

### 6. Security Best Practices

#### Pre-deployment Security Checklist
- [ ] All dependencies updated
- [ ] Security audit passed (`npm audit`)
- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] CORS properly set
- [ ] JWT secrets are strong and unique
- [ ] Logging configured
- [ ] Backup strategy in place

#### Post-deployment Security
- [ ] Monitor logs regularly
- [ ] Set up alerts for anomalies
- [ ] Regular security updates
- [ ] Penetration testing
- [ ] Access control review

### 7. Performance Optimization

#### Backend
- Enable compression
- Configure caching
- Database indexing
- Connection pooling
- Load balancing

#### Frontend
- Code splitting
- Image optimization
- CDN setup
- Caching strategies

### 8. Backup and Recovery

#### Database Backups
```bash
# MongoDB backup
mongodump --uri="mongodb://your-db" --out=/backup/$(date +%Y%m%d)

# Automated backup script
0 2 * * * /path/to/backup-script.sh
```

#### Application Backups
- Source code in version control
- Environment configuration backed up
- SSL certificates backed up
- Monitoring configuration backed up

### 9. Troubleshooting

#### Common Issues
1. **Database Connection Issues**
   - Check MongoDB URI
   - Verify network connectivity
   - Check authentication

2. **CORS Issues**
   - Verify CLIENT_URL setting
   - Check CORS configuration

3. **JWT Issues**
   - Verify JWT_SECRET is set
   - Check token expiration

4. **Performance Issues**
   - Monitor database queries
   - Check memory usage
   - Review API response times

### 10. Maintenance

#### Regular Tasks
- Weekly security updates
- Monthly dependency updates
- Quarterly security audits
- Annual penetration testing

#### Monitoring
- Set up alerts for:
  - High error rates
  - Slow response times
  - Database issues
  - Memory/CPU usage

## 🔧 Development vs Production

### Development
- Detailed logging
- Hot reloading
- Debug mode enabled
- Local database

### Production
- Minimal logging (warn level)
- Process management (PM2)
- SSL/TLS required
- Production database
- Monitoring enabled

## 📞 Support

For deployment issues:
1. Check logs first
2. Verify environment variables
3. Test database connectivity
4. Review security configuration
5. Contact support team

---

**Remember:** Always test deployments in a staging environment before production!
