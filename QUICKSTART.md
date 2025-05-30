# 🚀 Quick Start Guide - Invoice AI Platform

Get your Invoice AI platform running in under 5 minutes!

## Prerequisites

- **Node.js 18+** and npm
- **MongoDB** (local or cloud)
- **OpenAI API key**

## Installation

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd invoice-ai
npm run install:all
```

### 2. Configure Environment
```bash
# Copy environment template
cp .env.example server/.env

# Edit server/.env with your settings:
# - Set your OPENAI_API_KEY
# - Set your MONGODB_URI (or use default local MongoDB)
```

### 3. Complete Setup
```bash
npm run setup
```
This will:
- ✅ Create environment files for frontend apps
- ✅ Copy environment template for server
- ✅ Create a test business and API key

### 4. Start Everything
```bash
npm run dev
```

**🎉 Done!** Your platform is now running:

- **🖥️ Server API**: http://localhost:3000
- **👤 Admin Dashboard**: http://localhost:5173
- **💼 Business Dashboard**: http://localhost:5174

## First Steps

### Admin Dashboard
1. Open http://localhost:5173
2. View platform overview
3. Manage businesses and monitor usage

### Business Dashboard
1. Open http://localhost:5174
2. Login with the API key from setup (starts with `sk_...`)
3. Upload an invoice image
4. Watch AI extract the data automatically!

## Common Commands

```bash
# Development
npm run dev              # Start all apps
npm run dev:server       # Server only
npm run dev:admin        # Admin dashboard only
npm run dev:business     # Business dashboard only

# Building
npm run build            # Build everything for production
npm run start            # Run server in production mode

# Maintenance
npm run lint             # Check code quality
npm run clean            # Clean all builds and dependencies
npm run validate         # Test that everything builds correctly
```

## Environment Configuration

### Required Settings (in `server/.env`)
```env
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb://localhost:27017/invoice-ai
```

### Optional Settings
```env
JWT_SECRET=your-secure-secret
CORS_ORIGIN=*
LOG_LEVEL=info
```

## Troubleshooting

### Port Issues
If ports are in use:
```bash
# Kill existing processes
pkill -f vite
pkill -f node

# Restart
npm run dev
```

### Database Connection
```bash
# Check MongoDB is running
mongosh

# Or use MongoDB Compass for GUI management
```

### API Key Issues
```bash
# Generate new test business and API key
npm run create-test-business
```

### Build Problems
```bash
# Clean everything and reinstall
npm run clean
npm run install:all
npm run setup
```

## Next Steps

1. **Configure Your OpenAI API Key** in `server/.env`
2. **Upload Test Invoices** through the business dashboard
3. **Explore the Admin Dashboard** to see platform metrics
4. **Check the API Documentation** at http://localhost:3000/api-docs

## Production Deployment

When ready for production:

1. **Set Production Environment Variables**
2. **Use Production MongoDB URI**
3. **Configure HTTPS and CORS**
4. **Build and Deploy**: `npm run build`

---

**Need help?** Check out:
- `README.md` - Complete documentation
- `DEVELOPMENT.md` - Developer guide
- `client/README.md` - Frontend app details

**Happy invoicing!** 🧾✨