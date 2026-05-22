# 🚀 PRODUCTION DEPLOYMENT CHECKLIST

## Pre-Deployment: Local Testing

- [ ] Backend `npm start` works (no errors)
- [ ] Frontend `npm run dev` loads (no errors)
- [ ] Form submission works locally
- [ ] All file types tested (.css, .pdf, .txt, .zip)
- [ ] File size limit tested (9MB pass, 11MB fail)
- [ ] CORS preflight test passes (curl OPTIONS)
- [ ] Network tab shows 200 OK, no 405
- [ ] Browser console has no errors
- [ ] Toast notifications work correctly
- [ ] Uploaded files exist in `backend/uploads/`

---

## Backend Deployment (Node.js)

### Option 1: Vercel (Easiest for Serverless)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy backend
cd backend
vercel --prod

# 3. Set environment variables in Vercel dashboard
# PROJECT_SETTINGS → ENVIRONMENT VARIABLES
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://your-domain.com
```

**Gotchas:**
- Serverless has request size limit (~6MB for some providers)
- `uploads/` folder won't persist (use cloud storage like AWS S3)
- Cold starts may slow first request

### Option 2: Railway (Better for Traditional Apps)

```bash
# 1. Connect GitHub repo
# 2. Railway auto-detects Node.js
# 3. Set environment in Railway dashboard
# 4. Deploy button → auto deploy

# Backend package.json must have:
"scripts": {
  "start": "node server.js"
}
```

### Option 3: Docker + Any Host

**Dockerfile** (in backend/ folder):
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
```

**Build & Run:**
```bash
# Build image
docker build -t nopbaidrive-backend .

# Run container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e ALLOWED_ORIGINS=https://your-frontend.com \
  -v /var/uploads:/app/uploads \
  nopbaidrive-backend

# Or with Docker Compose
# docker-compose up -d
```

### Option 4: Traditional VPS (AWS EC2, DigitalOcean, Linode)

```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/your-username/nopbaidrive.git
cd nopbaidrive/backend

# Install & run
npm ci --only=production
npm start  # OR use PM2 for auto-restart

# Setup PM2 (process manager)
npm install -g pm2
pm2 start server.js --name "nopbaidrive"
pm2 startup  # Auto-start on reboot
pm2 save
```

**Nginx Reverse Proxy** (if needed):
```nginx
server {
  listen 80;
  server_name api.nopbaidrive.com;

  location / {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

```bash
# 1. Push to GitHub
git push origin main

# 2. Connect repo to Vercel
# vercel.com → New Project → Connect GitHub

# 3. Set environment
# VERCEL_ENV → Environment Variables
VITE_API_URL=https://api.nopbaidrive.com

# 4. Deploy
vercel --prod
```

### Option 2: Netlify

```bash
# 1. Build frontend
npm run build
# → Creates dist/ folder

# 2. Deploy to Netlify
npm install -g netlify-cli
netlify deploy --prod --dir=dist/

# Or connect GitHub → auto deploy on push
```

### Option 3: GitHub Pages

```bash
# package.json
"homepage": "https://your-username.github.io/nopbaidrive",
"scripts": {
  "build": "vite build && echo 'nopbaidrive.github.io' > dist/CNAME"
}

# Deploy
npm run build
npm install -g gh-pages
npx gh-pages -d dist
```

### Option 4: Static Hosting (AWS S3 + CloudFront)

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket/ --delete

# Set S3 as website hosting
# S3 → Properties → Static website hosting
# Index document: index.html
# Error document: index.html (SPA routing)
```

---

## Environment Variables Setup

### Backend (.env or Vercel/Railway dashboard)

```
NODE_ENV=production
PORT=3001

# CORS setup - CRITICAL
ALLOWED_ORIGINS=https://nopbaidrive.app,https://www.nopbaidrive.app

# Optional: S3 config if using cloud storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=nopbaidrive-uploads
```

### Frontend (.env or build-time injection)

```
VITE_API_URL=https://api.nopbaidrive.com
VITE_APP_NAME=Nộp Bài Tập
VITE_MAX_FILE_SIZE=10485760  # 10MB in bytes
```

---

## File Storage Considerations

### Local Storage (Current Implementation)
```
✅ Pros:
  - Simple, no external services
  - Fast local I/O
  
❌ Cons:
  - Doesn't scale to multiple servers
  - Data lost if server restarts (no persistence)
  - Hard to backup

⚠️ Solution: Mount persistent volume
docker run -v /persistent-storage:/app/uploads ...
```

### AWS S3 (Recommended for Production)
```javascript
// Install: npm install aws-sdk

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const multerS3 = require('multer-s3');

const upload = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  acl: 'private',
  metadata: function (req, file, cb) {
    cb(null, {
      fieldName: file.fieldname,
      studentEmail: req.body.studentEmail
    });
  },
  key: function (req, file, cb) {
    cb(null, `uploads/${Date.now()}_${file.originalname}`);
  }
});

// Use in route
router.post('/', upload.array('files'), handler);
```

### Cloudinary (Alternative)
```javascript
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nopbaidrive-uploads',
    allowed_formats: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'css', 'js', 'txt'],
    resource_type: 'auto'
  }
});

const upload = multer({ storage });
```

---

## Security Checklist

### SSL/TLS
- [ ] HTTPS enabled (free via Let's Encrypt)
- [ ] SSL certificate auto-renews
- [ ] HTTP redirects to HTTPS
- [ ] HSTS header set
  ```javascript
  app.use(helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }));
  ```

### Rate Limiting
- [ ] API rate limits configured (20 req/15min per IP)
- [ ] File upload limits enforced (10MB max)
- [ ] Max files per request limited (10 files)

### Input Validation
- [ ] Email format validated
- [ ] Filename sanitized (no `../` attacks)
- [ ] MIME type validated (not just extension)
- [ ] File size checked before processing

### CORS
- [ ] Only specific origins allowed
- [ ] Credentials properly handled
- [ ] OPTIONS preflight works

### Logging & Monitoring
- [ ] Access logs enabled
- [ ] Error logs to file/service
- [ ] Failed uploads logged
- [ ] Monitor disk space for uploads

### Deployment
- [ ] `.env` secrets never in git (use `.gitignore`)
- [ ] Production NODE_ENV set
- [ ] Error messages don't leak internal paths
- [ ] No debug logs in production

---

## Performance Optimization

### Backend
```javascript
// 1. Gzip compression
app.use(compression());

// 2. Cache static uploads
app.use('/uploads', express.static(
  path.join(__dirname, 'uploads'),
  { maxAge: '1d' }
));

// 3. Connection pooling if using DB
const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  // ...
});

// 4. Async file ops don't block
router.post('/', upload.array('files'), async (req, res) => {
  // Async DB save, email sending, etc
  await saveMetadata(req.body);
  res.json({ success: true });
  // Email send happens async
  sendConfirmationEmail(req.body.email).catch(err => console.error(err));
});
```

### Frontend
```javascript
// 1. Code splitting (Vite auto)
// 2. Lazy load components if needed
const UploadForm = lazy(() => import('./components/UploadForm'));

// 3. Optimize images
// Use WebP with JPEG fallback

// 4. Tree shake unused code
// Production builds already do this

// 5. Monitor bundle size
// npm install -g webpack-bundle-analyzer
```

### CDN
```javascript
// Frontend: Serve via CDN (Cloudflare, CloudFront)
// Backend: Set Cache-Control headers
app.use('/uploads', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
  next();
});
```

---

## Monitoring & Alerting

### Application Monitoring
- **Sentry** (error tracking)
  ```javascript
  import * as Sentry from "@sentry/node";
  Sentry.init({ dsn: process.env.SENTRY_DSN });
  ```

- **DataDog** (full observability)
  ```javascript
  const dd = require('dd-trace').init();
  ```

- **New Relic** (APM)
  ```javascript
  require('newrelic');
  ```

### Server Monitoring
- CPU, RAM, Disk usage
- Network I/O
- Process restarts
- Uptime

Tools: Grafana, Prometheus, UptimeRobot, Pingdom

### Log Aggregation
- **Winston** (Node logging)
- **Logstash** → **Elasticsearch** → **Kibana**
- **Papertrail** (managed)
- **Datadog** logs

---

## Rollback Plan

```bash
# If deployment breaks:

# 1. Identify bad deploy
git log --oneline | head -5

# 2. Revert to previous commit
git revert HEAD
git push

# 3. Or checkout specific commit
git checkout abc1234
git push -f origin main

# 4. Redeploy
vercel --prod  # or railway redeploy, etc

# 5. Communicate to users
# Post status update
```

---

## Post-Deployment Testing

- [ ] Live site loads without errors
- [ ] Form submission works end-to-end
- [ ] All file types accepted
- [ ] Uploaded files accessible at `/uploads/`
- [ ] Toast notifications display correctly
- [ ] Mobile responsive
- [ ] Lighthouse score > 80
- [ ] No console errors
- [ ] API response times < 500ms
- [ ] Database backups automated (if using DB)

---

## Maintenance

### Regular Tasks
- [ ] Monthly SSL certificate check
- [ ] Security updates for dependencies
  ```bash
  npm audit fix
  npm outdated
  ```
- [ ] Backup uploaded files
- [ ] Clear old uploads (>30 days)
- [ ] Monitor disk usage
- [ ] Review logs for errors

### Scheduled Jobs
```javascript
// Clean up old uploads (>30 days)
const schedule = require('node-schedule');

schedule.scheduleJob('0 2 * * *', async () => {
  const DIR = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(DIR);
  const now = Date.now();
  
  files.forEach(file => {
    const filePath = path.join(DIR, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtime.getTime();
    
    if (age > 30 * 24 * 60 * 60 * 1000) {  // 30 days
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${file}`);
    }
  });
});
```

---

**Last Updated:** 2026-05-23
