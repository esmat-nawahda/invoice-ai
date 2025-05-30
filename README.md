# Invoice AI Platform 🚀

A complete multi-tenant SaaS platform for AI-powered invoice extraction and management. Built with modern technologies and designed for scalability, security, and excellent user experience.

## 🏗️ Architecture

```
invoice-ai/
├── 🖥️  server/          # Node.js + Express API
├── 📱 client/
│   ├── 👤 admin/       # Admin React Dashboard
│   ├── 💼 business/    # Business React Dashboard
│   └── 🔗 shared/      # Shared utilities & API client
└── 📋 package.json     # Root workspace management
```

## ✨ Features

### 🔧 **Admin Dashboard**
- **Multi-tenant Management**: Oversee all businesses on the platform
- **Analytics & Monitoring**: Platform usage statistics and health checks
- **Business Administration**: Create, manage, and monitor business accounts
- **System Overview**: Real-time platform metrics and status

### 💼 **Business Dashboard**
- **AI Invoice Extraction**: Upload images and extract structured data using OCR + GPT-4
- **Invoice Management**: Complete CRUD operations with search and filtering
- **Dashboard Analytics**: Business-specific usage statistics and insights
- **API Key Management**: Secure authentication and access control

### 🛠️ **Backend API**
- **Multi-tenant Architecture**: Complete business isolation
- **AI-Powered Extraction**: Tesseract.js OCR + OpenAI GPT-4
- **Secure Authentication**: API key-based access control
- **Rate Limiting**: Configurable limits per business plan
- **Usage Tracking**: Monitor API calls and billing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB database
- OpenAI API key

### 1. Clone and Install
```bash
git clone <repository-url>
cd invoice-ai
npm run install:all
```

### 2. Environment Setup
Create `.env` file in the root directory:
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/invoice-ai

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Security
JWT_SECRET=your-super-secure-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Optional: CORS, Rate Limiting, etc.
CORS_ORIGIN=*
RATE_LIMIT_MAX=100
```

### 3. Complete Setup
```bash
# Setup environment files and create test business
npm run setup
```

### 4. Start All Applications
```bash
# Start all apps concurrently (server + both frontends)
npm run dev
```

**That's it!** 🎉 Your Invoice AI platform is now running:

- **🖥️ Server API**: http://localhost:3000
- **👤 Admin Dashboard**: http://localhost:5173
- **💼 Business Dashboard**: http://localhost:5174

## 📋 Available Scripts

### 🏃‍♂️ **Development**
```bash
npm run dev              # Start all applications
npm run dev:server       # Start only server
npm run dev:admin        # Start only admin dashboard
npm run dev:business     # Start only business dashboard
```

### 🏗️ **Building**
```bash
npm run build           # Build all applications
npm run build:server    # Build only server
npm run build:admin     # Build only admin app
npm run build:business  # Build only business app
```

### 🚀 **Production**
```bash
npm run start           # Start server in production
npm run start:all       # Start all apps in production mode
```

### 🧹 **Maintenance**
```bash
npm run clean           # Clean all node_modules and dist folders
npm run lint            # Lint all applications
npm run test            # Run all tests
npm run setup           # Complete project setup
```

### 🔑 **Utilities**
```bash
npm run create-test-business  # Generate test business and API key
```

## 🎯 Usage Guide

### Getting Started as Admin
1. Navigate to **Admin Dashboard** (http://localhost:5173)
2. View platform overview and business management
3. Create and manage business accounts
4. Monitor system health and usage

### Getting Started as Business User
1. Navigate to **Business Dashboard** (http://localhost:5174)
2. Sign in with your API key (generated from setup script)
3. Upload invoice images for AI extraction
4. Manage your invoice collection and view analytics

### API Integration
```javascript
// Use the shared API client
import { createBusinessApi } from './client/shared/api';

const api = createBusinessApi('sk_your_api_key_here');
const invoices = await api.get('/invoices');
```

## 🏢 Business Plans & Pricing

| Plan | Monthly Invoices | API Calls/Day | Storage | Team Members |
|------|-----------------|---------------|---------|--------------|
| **Free** | 50 | 100 | 1 GB | 1 |
| **Starter** | 500 | 1,000 | 10 GB | 3 |
| **Professional** | 5,000 | 10,000 | 100 GB | 10 |
| **Enterprise** | Unlimited | Unlimited | 1 TB | Unlimited |

## 🛠️ Technology Stack

### **Backend**
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB with Mongoose
- **AI/ML**: Tesseract.js (OCR) + OpenAI GPT-4
- **Authentication**: API Key-based with hashing
- **Languages**: TypeScript

### **Frontend**
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query + Context API
- **Routing**: React Router
- **UI Components**: Headless UI + Heroicons

### **DevOps & Tools**
- **Development**: Concurrently for multi-app development
- **Package Management**: npm workspaces
- **Code Quality**: ESLint + Prettier
- **Containerization**: Docker support

## 🔐 Security Features

- **🔑 API Key Authentication**: Secure, hashed API keys for business access
- **🏢 Multi-tenant Isolation**: Complete data separation between businesses
- **⚡ Rate Limiting**: Configurable limits per API key and business plan
- **🛡️ Input Validation**: Comprehensive request validation with proper error handling
- **📊 Usage Tracking**: Monitor API calls and prevent abuse
- **🔒 Secure Storage**: Encrypted sensitive data and secure file handling

## 📦 Project Structure

```
invoice-ai/
├── 📋 package.json              # Root workspace configuration
├── 🖥️  server/                 # Backend API
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── middlewares/       # Authentication, validation
│   │   └── config/            # Configuration files
│   ├── tests/                 # Server tests
│   └── package.json
├── 📱 client/
│   ├── 👤 admin/              # Admin dashboard
│   │   ├── src/
│   │   │   ├── components/    # React components
│   │   │   ├── pages/        # Page components
│   │   │   └── utils/        # Utilities
│   │   └── package.json
│   ├── 💼 business/           # Business dashboard
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/       # Page components
│   │   │   ├── context/     # React context
│   │   │   └── hooks/       # Custom hooks
│   │   └── package.json
│   ├── 🔗 shared/            # Shared utilities
│   │   ├── api.ts           # API client with TypeScript
│   │   └── assets/          # Shared assets (logos, etc.)
│   └── README.md
└── README.md                  # This file
```

## 🐳 Docker Support

```bash
# Build and run with Docker Compose
npm run docker:up

# Run in background
npm run docker:up:d

# Stop containers
npm run docker:down

# View logs
npm run docker:logs
```

## 🚀 Deployment

### Production Environment Variables
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/invoice-ai
OPENAI_API_KEY=your_production_openai_key
JWT_SECRET=your_very_secure_production_secret
CORS_ORIGIN=https://yourdomain.com
```

### Deployment Checklist
- [ ] Set production environment variables
- [ ] Configure MongoDB with authentication
- [ ] Set up HTTPS with SSL certificates
- [ ] Configure proper CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

## 📈 Monitoring & Analytics

The platform includes comprehensive monitoring:
- **API Usage Tracking**: Monitor requests per business
- **Performance Metrics**: Response times and error rates
- **Business Analytics**: Invoice processing statistics
- **Health Checks**: System status monitoring
- **Usage Limits**: Automatic enforcement of plan limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

- **📚 API Documentation**: Available at http://localhost:3000/api-docs when server is running
- **🐛 Issues**: Report bugs and feature requests via GitHub Issues
- **💬 Discussions**: Join community discussions for questions and ideas
- **📧 Contact**: Reach out to the development team for enterprise support

## 🎉 What's Next?

- [ ] **Dashboard Enhancements**: Advanced analytics and reporting
- [ ] **Mobile Apps**: React Native mobile applications
- [ ] **Integrations**: QuickBooks, Xero, SAP integrations
- [ ] **Advanced AI**: Enhanced extraction accuracy and field detection
- [ ] **Workflow Automation**: Automated invoice processing workflows
- [ ] **Multi-language Support**: Support for more languages and currencies

---

**Ready to revolutionize invoice processing?** 🚀

Start with `npm run setup && npm run dev` and begin extracting invoice data in minutes!