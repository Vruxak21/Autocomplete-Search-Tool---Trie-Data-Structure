# Auto-Complete Search Tool

A full-stack web application that provides Google-style autocomplete functionality with real-time search suggestions using advanced data structures (Trie with frequency counters and heap-based ranking).

## Project Structure

```
autocomplete-search-tool/
├── backend/          # Node.js/Express API server
├── frontend/         # React application
├── data/            # Sample datasets
└── README.md        # This file
```

## Quick Start

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Features

- Real-time search suggestions with sub-100ms response times
- Frequency-based ranking system
- Trie data structure visualization
- Support for large datasets (10,000+ entries)
- Optional typo tolerance
- MongoDB persistence layer

## Tech Stack

**Backend:**
- Node.js with Express
- MongoDB for data persistence
- Custom Trie and Heap implementations

**Frontend:**
- React with hooks
- Tailwind CSS for styling
- Axios for API communication
- D3.js for Trie visualization

## Development

- ESLint and Prettier configured for code consistency
- Comprehensive test suites for both frontend and backend
- Hot reload for development
- Production build optimization