# OMNIS - ARNS Explorer

A modern web application for exploring the Arweave Name Service (ArNS) ecosystem.

## Features

- **Live Feed**: Real-time updates of new ArNS registrations
- **Directory**: Searchable and filterable list of all ArNS names
- **Analytics**: Comprehensive statistics and visualizations
- **Top Holders**: Track the most active participants in the ecosystem
- **Name Details**: In-depth information about individual ArNS names

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Data Visualization**: Recharts
- **Performance**: Web Workers, IndexedDB
- **Notifications**: Service Worker, Push API
- **API Integration**: @ar.io/sdk

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Aluisyo/OMNIS

# Navigate to the project directory
cd OMNIS

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Building for Production

```bash
npm run build
```

## Architecture

The application follows a component-based architecture with:

- **Pages**: Main views of the application
- **Components**: Reusable UI elements
- **Services**: API and data management
- **Contexts**: Global state management
- **Utils**: Helper functions
- **Workers**: Background processing

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 