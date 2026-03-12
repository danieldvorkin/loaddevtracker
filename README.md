# Load Dev Tracker

A minimal React + TypeScript + Vite project for tracking Firebase status and development loads.

## Features
- React 19 with Vite for fast development
- TypeScript for type safety
- Tailwind CSS for styling
- Firebase integration
- XState for state management
- ESLint and Prettier for code quality

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Lint
```bash
npm run lint
```

## Project Structure
- `src/` — Main source code
  - `App.tsx` — Main app component
  - `FirebaseStatusBlinker.tsx` — Firebase status indicator
  - `Navbar.tsx` — Navigation bar
  - `lib/firebase.ts` — Firebase config and setup
  - `assets/` — Static assets
- `public/` — Static files
- `.env` — Environment variables (not committed)

## Environment Variables
Create a `.env` file in the root with your Firebase config:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
```

## License
MIT
