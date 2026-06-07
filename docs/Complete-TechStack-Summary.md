Please review and document the complete PTDT-Dialer tech stack for both repositories.

Repositories:
- Frontend: dialer-frontend
- Backend: dialer-backend

For the FRONTEND, identify and summarize all technologies used, including but not limited to:

- Framework and runtime
- Build tooling
- Electron/Desktop packaging setup
- State management
- Routing
- UI/component libraries
- SIP/WebRTC libraries
- API client structure
- Charts/reporting libraries
- Styling approach
- Testing/build/lint setup
- Deployment/build configuration

- TypeScript
- TSX / JSX
- React
- Vite
- Electron
- React Router
- Zustand
- Axios
- Socket.IO Client, if present
- SIP.js / WebRTC
- Framer Motion
- Lucide React
- Recharts
- CSS / inline styling / global CSS utilities
- Browser media APIs
- LocalStorage/session state usage
- Build tools and package scripts
- Electron packaging/release setup
- Railway/static deployment configuration, if applicable

For the BACKEND, identify and summarize all technologies used, including but not limited to:

For the backend, identify and summarize:
- Runtime and language
- Web framework
- Database and ORM
- Authentication/authorization approach
- API route structure
- Call/campaign/contact/disposition/callback/DNC/report modules
- Logging and process management
- Prisma/migration setup
- Railway/deployment configuration
- provider/FreePBX/SIP integration touchpoints

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Supabase-hosted database
- JWT authentication
- bcrypt/password hashing, if present
- Role-based authorization
- Axios or third-party API clients, if present
- provider SDK / provider API integration, if present
- Socket.IO, if present
- Winston or logging libraries, if present
- CORS, Helmet, Morgan, rate limiting, validation middleware, if present
- PM2 local process management
- Railway deployment
- Prisma migrations and generated client
- Environment variables and production configuration

For each repository, include:
- Main framework/runtime
- Language and syntax style
- Major libraries and why they are used
- API/client architecture
- State management/data flow
- Build and deployment process
- External services integrated
- Important config files
- Any missing or questionable technologies/configuration that should be verified

Output should be clear, structured, and practical enough for a new engineer or QA auditor to understand exactly what the PTDT-Dialer is built with.