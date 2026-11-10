# Library Management System

A React + TypeScript front end on a Node.js API backed by SQLite.

## Run it

Requires Node.js 22.13 or newer (for the built-in `node:sqlite` module).

```bash
npm install
npm run dev      # API on :4000 and React app on :5173
npm test         # run the system validation tests
```

Open http://localhost:5173.

## Features
- Book management: add, edit copies, delete, search by title, author, ISBN or category
- Member registration
- Issue and return with a 14-day loan, 1-per-day late fines and a 3-book limit
- Reports: totals, overdue books, most borrowed, collection by category (printable)

## Documentation
- [Planning](docs/01-planning.md)
- [Architecture](docs/02-architecture.md)
