# 🚀 Development Guide - Invoice AI Platform

## Quick Setup (First Time)

```bash
# 1. Clone and install everything
git clone <repository-url>
cd invoice-ai
npm run install:all

# 2. Setup environment and test data
npm run setup

# 3. Start all applications
npm run dev
```

**🎉 Done!** Your platform is running:
- **Server**: http://localhost:3000
- **Admin Dashboard**: http://localhost:5173  
- **Business Dashboard**: http://localhost:5174

## 📋 Daily Development Workflow

### Start Development
```bash
npm run dev              # Start all apps at once
# OR start individually:
npm run dev:server       # Backend API only
npm run dev:admin        # Admin dashboard only  
npm run dev:business     # Business dashboard only
```

### Get API Key for Testing
```bash
npm run create-test-business
# Look for: YOUR API KEY (save this securely): sk_xxxxx
```

### Common Tasks
```bash
npm run lint             # Check code quality
npm run test             # Run backend tests
npm run build            # Build all for production
npm run clean            # Clean node_modules and builds
```

## 🔧 Development Tools

### Workspace Structure
The project uses **npm workspaces** for managing multiple applications:
```
invoice-ai/               # Root workspace
├── package.json         # Root scripts and dependencies
├── server/              # Backend workspace
├── client/admin/        # Admin frontend workspace
└── client/business/     # Business frontend workspace
```

### Hot Reload & Live Updates
- **Server**: Automatic restart with ts-node-dev
- **Admin Dashboard**: Vite HMR on port 5173
- **Business Dashboard**: Vite HMR on port 5174
- **All changes**: Auto-reload when you save files

### Concurrent Development
Using **concurrently** to run all apps simultaneously:
- All logs are prefixed with app names
- Each app runs on its own port
- Stop all with `Ctrl+C`

## 🧪 Testing Your Changes

### Backend API Testing
```bash
# Test with the generated API key
export API_KEY="sk_your_generated_key"

# Test invoice extraction
curl -X POST http://localhost:3000/api/v1/invoices/extract \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"image": "data:image/jpeg;base64,/9j/...", "saveToDatabase": true}'

# Test invoice listing
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/v1/invoices
```

### Frontend Testing
1. **Business Dashboard**: 
   - Go to http://localhost:5174
   - Login with your API key
   - Test invoice upload and management

2. **Admin Dashboard**: 
   - Go to http://localhost:5173
   - View businesses and system stats

## 🏗️ Adding New Features

### Backend (Server)
```bash
# 1. Add new route
server/src/routes/newFeature.routes.ts

# 2. Create controller
server/src/controllers/newFeature.controller.ts

# 3. Add service logic
server/src/services/newFeature.service.ts

# 4. Update main routes
server/src/routes/index.ts
```

### Frontend (Admin/Business)
```bash
# 1. Add new page
client/admin/src/pages/NewPage.tsx

# 2. Update routing
client/admin/src/App.tsx

# 3. Add to navigation
client/admin/src/components/Layout.tsx

# 4. Create API calls
# Use shared API client from client/shared/api.ts
```

### Shared Utilities
```bash
# Add shared types/utilities
client/shared/api.ts        # API client and TypeScript types
client/shared/utils.ts      # Common utility functions
client/shared/types.ts      # Shared TypeScript interfaces
```

## 📦 Package Management

### Installing Dependencies

```bash
# Root level (like concurrently)
npm install package-name

# Server only
npm install package-name --workspace=server

# Admin app only  
npm install package-name --workspace=client/admin

# Business app only
npm install package-name --workspace=client/business

# All workspaces
npm install package-name --workspaces
```

### Managing Workspaces
```bash
# List all workspaces
npm run workspaces list

# Run command in specific workspace
npm run build --workspace=server
npm run dev --workspace=client/admin

# Run command in all workspaces
npm run lint --workspaces
```

## 🔍 Debugging

### Backend Debugging
```bash
# Enable debug logging
DEBUG=* npm run dev:server

# Check server logs
tail -f server/logs/app.log

# Database debugging
# Check MongoDB connection and data
```

### Frontend Debugging
- **Browser DevTools**: F12 for debugging React components
- **React DevTools**: Install React Developer Tools extension
- **Network Tab**: Monitor API calls and responses
- **Console**: Check for JavaScript errors

### Common Issues

1. **Port already in use**:
   ```bash
   # Find and kill processes
   lsof -ti:3000 | xargs kill
   lsof -ti:5173 | xargs kill
   lsof -ti:5174 | xargs kill
   ```

2. **API key not working**:
   - Ensure it starts with `sk_`
   - Check it exists in database
   - Verify it's not revoked

3. **Database connection issues**:
   - Check MongoDB is running
   - Verify connection string in .env
   - Check network connectivity

## 🌱 Environment Management

### Development Environment
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/invoice-ai
OPENAI_API_KEY=your_dev_key
LOG_LEVEL=debug
```

### Testing Environment
```env
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/invoice-ai-test
OPENAI_API_KEY=test_key
LOG_LEVEL=warn
```

### Production Environment
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/invoice-ai
OPENAI_API_KEY=your_production_key
LOG_LEVEL=error
JWT_SECRET=super_secure_secret
```

## 🔄 Git Workflow

### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/invoice-search

# Make changes and commit
git add .
git commit -m "Add invoice search functionality"

# Push and create PR
git push origin feature/invoice-search
```

### Commit Message Format
```
type(scope): description

Examples:
feat(api): add invoice search endpoint
fix(ui): resolve upload button styling issue
docs(readme): update installation instructions
refactor(auth): improve API key validation
```

## 🚀 Deployment Preparation

### Build for Production
```bash
# Build all applications
npm run build

# Test production builds locally
npm run start:all
```

### Environment Checklist
- [ ] Set production MongoDB URI
- [ ] Configure production OpenAI API key
- [ ] Set secure JWT secrets
- [ ] Configure CORS for production domains
- [ ] Set up SSL certificates
- [ ] Configure monitoring and logging

### Performance Optimization
- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure database indexes
- [ ] Set up Redis for caching (future)
- [ ] Monitor memory usage and optimize

## 📊 Monitoring in Development

### Server Monitoring
- **API Logs**: `tail -f server/logs/app.log`
- **Database Queries**: Enable Mongoose debug mode
- **Memory Usage**: Monitor with `npm run dev:server`

### Frontend Monitoring
- **Bundle Size**: Check Vite build output
- **Performance**: Use React DevTools Profiler
- **Network**: Monitor API calls in browser DevTools

## 🎯 Best Practices

### Code Organization
- **Single Responsibility**: Each file has one clear purpose
- **TypeScript First**: Use proper types everywhere
- **Error Handling**: Proper try/catch and user feedback
- **Security**: Validate all inputs, sanitize outputs

### API Design
- **RESTful**: Follow REST conventions
- **Consistent**: Same response format everywhere
- **Documented**: Add JSDoc comments
- **Versioned**: Use /api/v1/ prefix

### Frontend Architecture
- **Component-based**: Reusable, focused components
- **State Management**: React Query for server state, Context for app state
- **Responsive**: Mobile-first design approach
- **Accessible**: Proper ARIA labels and keyboard navigation

---

## 🆘 Need Help?

1. **Check logs** for error messages
2. **Restart services** with `npm run dev`
3. **Clear caches** with `npm run clean && npm run install:all`
4. **Check environment** variables and API keys
5. **Review documentation** in README.md

**Happy coding!** 🚀