# Invoice AI - Client Applications

This directory contains the frontend applications for the Invoice AI platform.

## Applications

### 🔧 Admin Dashboard (`/admin`)
System administration interface for managing the multi-tenant platform.

**Features:**
- Business management and overview
- System analytics and monitoring
- User administration
- Platform settings

**Tech Stack:**
- React 19 + TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Query for data fetching
- React Router for navigation
- Heroicons for icons

### 💼 Business Dashboard (`/business`)
Business-specific interface for invoice management and extraction.

**Features:**
- Invoice upload and AI extraction
- Invoice management and search
- Business dashboard with analytics
- API key authentication
- Settings management

**Tech Stack:**
- React 19 + TypeScript
- Vite build tool
- Tailwind CSS for styling
- React Query for data fetching
- React Router for navigation
- React Dropzone for file uploads
- Heroicons for icons

### 🔗 Shared Assets (`/assets`)
Common assets shared between applications.

**Contains:**
- Shared logo assets
- Common icons and graphics

**Note:** API clients are now embedded in each app for better dependency management.

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Running Invoice AI server (see `/server`)

### Setup

1. **Install dependencies for both apps:**
```bash
# Admin app
cd client/admin
npm install

# Business app  
cd client/business
npm install
```

2. **Environment configuration:**
Create `.env` files in each app directory:

**Admin app (`.env`):**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

**Business app (`.env`):**
```env
VITE_API_URL=http://localhost:3000/api/v1
```

3. **Start development servers:**
```bash
# Admin app (runs on http://localhost:5173)
cd client/admin
npm run dev

# Business app (runs on http://localhost:5174)
cd client/business  
npm run dev
```

## Usage

### Admin Dashboard
1. Navigate to `http://localhost:5173`
2. Access system administration features
3. Manage businesses and monitor platform usage

### Business Dashboard
1. Navigate to `http://localhost:5174`
2. Sign in with your API key (get from server setup)
3. Upload invoices for AI extraction
4. Manage your invoice data

### Getting an API Key
To use the business dashboard, you need an API key:

1. **Development:** Run the test script in the server:
   ```bash
   cd server
   npm run create-test-business
   ```
   
2. **Production:** Create a business through the admin interface or API

## Features

### Admin Dashboard Features
- **Business Overview:** View all registered businesses
- **Analytics:** Platform usage statistics and trends
- **Business Management:** Create, edit, and manage business accounts
- **System Monitoring:** Health checks and status monitoring

### Business Dashboard Features
- **Invoice Upload:** Drag-and-drop interface for invoice images
- **AI Extraction:** Automatic data extraction using OCR and GPT-4
- **Invoice Management:** Search, filter, and manage invoices
- **Dashboard Analytics:** Business-specific usage statistics
- **Settings:** Configure business preferences and API keys

### Shared Features
- **Responsive Design:** Works on desktop, tablet, and mobile
- **Modern UI:** Clean, professional interface with Tailwind CSS
- **Type Safety:** Full TypeScript support
- **Fast Development:** Hot reload with Vite
- **Optimized Builds:** Production-ready builds with code splitting

## API Integration

Both applications integrate with the Invoice AI server through a shared API client:

```typescript
// Shared API client with TypeScript interfaces
import { createBusinessApi, adminApi } from '../shared/api';

// Business app - requires API key
const api = createBusinessApi(apiKey);
const invoices = await api.get('/invoices');

// Admin app - no API key needed
const businesses = await adminApi.get('/businesses');
```

## Development

### Project Structure
```
client/
├── admin/                  # Admin dashboard app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utilities
│   ├── public/           # Static assets
│   └── package.json
├── business/             # Business dashboard app
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React context
│   │   ├── hooks/        # Custom hooks
│   │   └── utils/        # Utilities
│   ├── public/           # Static assets
│   └── package.json
├── shared/               # Shared utilities
│   ├── api.ts           # API client and types
│   └── assets/          # Shared assets (logos, etc.)
└── README.md
```

### Available Scripts

Each app has these npm scripts:

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Building for Production

```bash
# Build admin app
cd client/admin
npm run build

# Build business app
cd client/business
npm run build
```

Built files will be in the `dist/` directory of each app.

## Deployment

### Frontend Deployment Options

1. **Static Hosting:** Deploy built files to Netlify, Vercel, or AWS S3
2. **Docker:** Use the provided Dockerfile for containerized deployment
3. **CDN:** Serve static files through a CDN for better performance

### Environment Variables for Production

Set these environment variables in your deployment:

```env
# Both apps
VITE_API_URL=https://your-api-domain.com/api/v1

# Optional: Analytics, monitoring, etc.
VITE_ANALYTICS_ID=your_analytics_id
```

## Customization

### Theming
Both apps use Tailwind CSS with custom color schemes:
- **Admin:** Blue theme (`primary-600`, etc.)
- **Business:** Sky blue theme (`primary-600`, etc.)

Modify `tailwind.config.js` in each app to customize colors and styling.

### Logo
Replace the logo in `/shared/assets/logo.svg` to customize branding.

### Features
Add new features by:
1. Creating new page components
2. Adding routes to the router
3. Updating navigation menus
4. Adding API calls as needed

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check server is running on correct port
   - Verify VITE_API_URL environment variable
   - Check CORS configuration in server

2. **API Key Invalid**
   - Ensure API key starts with "sk_"
   - Verify key exists in database
   - Check key hasn't been revoked

3. **Build Errors**
   - Run `npm install` to ensure dependencies
   - Check TypeScript errors
   - Verify environment variables

### Development Tips

- Use browser dev tools for debugging
- Check network tab for API request/response details
- Use React Developer Tools extension
- Monitor console for errors and warnings

---

**Ready to start developing?** Choose your app and run `npm run dev`! 🚀