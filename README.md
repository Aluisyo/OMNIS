# OMNIS ArNS Explorer — Frontend

A modern React + TypeScript single-page application for exploring the Arweave Name Service (ArNS) ecosystem.

## 🚀 Features

- **Live Feed**: Real-time stream of new and updated name registrations.
- **Directory**: Fast search, filter by name, owner, with auto-submit via navigation state.
- **Analytics**: Charts for top holders and registration trends (Web Worker powered).
- **Top Holders**: Interactive list and mobile-friendly cards, click primary names to view tied ArNS.
- **Name Details**: Full metadata, owner of ArNS, undernames, Web preview of ArNS.

## 🛠 Tech Stack

- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, tailwind-merge, clsx
- **State & Context**: React Context (DataContext), IndexedDB via idb
- **Data & Workers**: @ar.io/sdk, arweave, Web Worker (arnsWorker.ts)
- **Charts & Animations**: Recharts, framer-motion
- **UI Elements**: lucide-react icons, react-hot-toast
- **Routing**: react-router-dom v6

## 📋 Prerequisites

- Node.js >= 16
- npm or yarn

## ⚙️ Setup & Development

1. Clone repo:
   ```bash
   git clone https://github.com/Aluisyo/OMNIS
   cd OMNIS
   ```
2. Install dependencies:
   ```bash
   npm install
   # or yarn
   ```
3. Run in dev mode:
   ```bash
   npm run dev
   ```
4. Open http://localhost:5173 in your browser.

## 📦 Build & Preview

```bash
npm run build    # production bundle
npm run preview  # serve built files
```

## 📁 Project Structure

```
OMNIS/
├── src/
│   ├── pages/               # Top-level routes (LiveFeed, Directory, TopHolders, NameDetails, Analytics)
│   ├── components/          # Shared UI components (common, layout, directory)
│   ├── contexts/            # DataContext for global records state
│   ├── services/            # IndexedDB & SDK services (arnsService, dataService)
│   ├── utils/               # Helpers: punycode, formatters, cn
│   ├── arnsWorker.ts        # Web Worker entry for heavy analytics
│   └── index.css, main.tsx  # Tailwind import & app bootstrap
├── public/                  # Static assets
├── backend/                 # Separate backend service (see backend/README.md)
├── vite.config.ts
└── README.md                # Frontend documentation
```

## ✅ Testing & Linting

- **Lint**: `npm run lint`
- **Format**: `npm run format`
- **Test**: `npm run test`

## 🤝 Contributing

1. Fork and branch from `main`
2. Commit with clear messages
3. Open a PR with description of changes and screenshots if UI changed

---


## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
