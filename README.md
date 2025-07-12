# Pipedriven

A Next.js-based CRM application for managing contacts, campaigns, and activities with Pipedrive integration.

## Features

- **Contact Management**: Track and manage contacts with warmness scoring
- **Campaign Management**: Create and manage marketing campaigns
- **Activity Tracking**: Log and track various types of activities (emails, calls, meetings)
- **Enhanced Action System**: Quick actions for common tasks with primary and secondary action menus
- **RBAC Authentication**: Role-based access control with NextAuth.js
- **Pipedrive Integration**: Sync contacts and activities with Pipedrive CRM

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Pipedrive API key (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd pipedriven
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database and API credentials
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma db seed
```

5. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Default Login

After seeding the database, you can log in with:
- **Email:** john@the4oc.com
- **Password:** password123

## Development

### Testing

The project follows Test-Driven Development (TDD) methodology:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/__tests__/components/actions/QuickActionButton.test.tsx
```

### Database

```bash
# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Open Prisma Studio
npx prisma studio
```

### Code Quality

```bash
# Run linting
npm run lint

# Run type checking
npm run type-check
```

## Project Structure

```
src/
├── app/                 # Next.js app router pages and API routes
├── components/          # React components
│   ├── actions/        # Action system components
│   ├── contacts/       # Contact-related components
│   ├── campaigns/      # Campaign-related components
│   └── ui/            # Reusable UI components
├── server/             # Server-side services
├── lib/               # Utility functions and configurations
├── types/             # TypeScript type definitions
└── __tests__/         # Test files
```

## Action System

The application features an enhanced action system with:

- **Primary Actions**: Email, Meeting Request, Meeting (always visible)
- **Secondary Actions**: LinkedIn, Phone Call, Conference (accessible via ellipsis menu)
- **Modal Integration**: Note capture and contact editing for secondary actions

## Contributing

1. Follow TDD methodology - write tests first
2. Ensure all tests pass before committing
3. Follow the established code style and patterns
4. Update documentation and changelog for significant changes

## Documentation

- [Technical Requirements](./docs/technical-requirements.md)
- [Implementation Plan](./docs/implementation-plan.md)
- [Development Roadmap](./docs/development-roadmap.md)
- [Architecture Diagram](./docs/architecture-diagram.md)
- [Changelog](./CHANGELOG.md)

## License

This project is proprietary software.
