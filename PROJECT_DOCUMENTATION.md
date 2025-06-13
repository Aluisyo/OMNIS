# OMNIS ArNS Explorer — Project Documentation

This repository contains two main parts:

- **Frontend**: A React + TypeScript single-page application built with Vite for exploring Arweave Name Service (ArNS) data.
- **Backend**: A Node.js cron service that fetches, resolves, and aggregates ArNS records, then uploads consolidated data to Arweave.

---

## 🏛 Architecture

1. **Backend Service** (`/backend`)
   - Periodically fetches new ArNS registration transactions from Arweave.
   - Resolves metadata (owner addresses, primary names, undernames).
   - Persists data locally in `data.json` and uploads via ArDrive/Turbo.
   - Written in TypeScript, scheduled with cron.

2. **Frontend App** (`/src`)
   - Single-page React app (React 18 + TypeScript).
   - Uses IndexedDB (via `idb`) to store and serve fetched records.
   - Features live feed, search directory, analytics charts, top holders, and name details.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, framer-motion, Recharts, react-router-dom.
- **Backend**: Node.js, TypeScript, cron, Axios (Arweave SDK), Docker (optional).
- **Data Storage**: IndexedDB (frontend), local `data.json` (backend).
- **Utilities**: punycode decoding, number & address formatters.

---

## 📋 Prerequisites

- **Node.js** v16+ (both frontend & backend)
- **npm** or **yarn**
- **Docker & Docker Compose** (optional for backend containerization)
- **Arweave JWK keyfile** for backend uploads

---

## ⚙️ Setup & Development

### 1. Clone Repository
```bash
git clone https://github.com/Aluisyo/OMNIS
cd OMNIS
```

### 2. Install Dependencies

- **Frontend**
  ```bash
  npm install
  # or yarn
  ```

- **Backend**
  ```bash
  cd backend
  npm ci
  ```

### 3. Configuration

- **Frontend**
  - No special env variables required. Data is loaded from local IndexedDB.

- **Backend**
  - Copy `.env.example` to `.env` and update:
    ```ini
    KEYFILE_PATH=./arweave-keyfile.json   # Path to your Arweave JWK
    BASE_NAME=<your-base-name>            # ArNS root record name
    UNDERNAME=<your-undernames-label>     # Label for undernames
    CRON_SCHEDULE=*/5 * * * *             # Job frequency
    OWNER_RESOLUTION_CONCURRENCY=10       # Parallel owner lookups
    METADATA_SAVE_BATCH_SIZE=20           # Batch size for local saves
    ```

### 4. Running Locally

- **Frontend** (in project root):
  ```bash
  npm run dev
  ```
  Open [http://localhost:5173](http://localhost:5173).

- **Backend** (in `/backend`):
  ```bash
  npm run dev
  ```
  Service runs immediately and then on defined cron schedule.

---

## 📦 Build & Production

- **Frontend**
  ```bash
  npm run build
  npm run preview
  ```

- **Backend**
  ```bash
  cd backend
  npm run build
  npm start
  ```

---

## 🐳 Docker & Docker Compose (Backend)

```bash
cd backend
docker-compose up --build -d
```

Or manually:
```bash
docker build -t omnis-backend .
docker run -d --env-file .env -v $(pwd)/data.json:/app/data.json omnis-backend
```

---

## 📁 Project Structure

```
OMNIS/
├── public/                  # Static assets (incl. social-image.svg/png)
├── src/                     # Frontend app (React + TS)
│   ├── pages/               # Routes (LiveFeed, Directory, TopHolders, NameDetails, Analytics)
│   ├── components/          # Shared UI components
│   ├── contexts/            # DataContext for IndexedDB
│   ├── services/            # IDB & SDK data services
│   ├── utils/               # Helpers (formatters, punycode, cn)
│   └── arnsWorker.ts        # Web Worker for analytics
│   └── main.tsx, index.css  # Bootstrap
├── backend/                 # Node.js ETL service
│   ├── src/
│   │  ├── index.ts         # Cron scheduler & job runner
│   │  ├── config.ts        # App settings
│   │  ├── jobs/            # fetchAndUpload job
│   │  └── services/        # ArNS fetch/resolution logic
│   ├── .env.example        # Sample env variables
│   ├── data.json           # Local data dump (auto-generated)
│   └── Dockerfile, docker-compose.yml
├── LICENSE                  # MIT License
└── README.md                # Frontend documentation
└── PROJECT_DOCUMENTATION.md # Combined project docs
```

---

## ✅ Testing & Linting

- **Frontend**
  - `npm run lint`
  - `npm run format`
  - `npm run test`

- **Backend**
  - No formal tests; lint via `npm run lint` (if configured).

---

## 🤝 Contributing

1. Fork the repo and branch from `main`.
2. Make changes with descriptive commit messages.
3. Submit a PR with summary and screenshots (if UI updates).

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
