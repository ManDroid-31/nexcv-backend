# NexCV Backend

Backend service for NexCV - A modern resume builder application.

## Features

- User authentication with Clerk
- Resume CRUD operations
- Credit system for premium features
- Template management
- MongoDB database with Prisma ORM

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Prisma ORM
- Clerk Authentication
- ESLint & Prettier

## Setup

1. Clone the repository

```bash
git clone https://github.com/yourusername/NexCV_Backend.git
cd NexCV_Backend
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables
   Create a `.env` file in the root directory with:

```env
DATABASE_URL="your_mongodb_url"
CLERK_SECRET_KEY="your_clerk_secret_key"
CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
```

4. Initialize Prisma

```bash
npx prisma generate
npx prisma db push
```

5. Start the development server

```bash
npm run dev
```

## API Endpoints

### Public Routes

- `GET /` - Health check
- `GET /health` - Server status

### Protected Routes

- `POST /api/resumes` - Create resume
- `GET /api/resumes` - List all user resumes
- `GET /api/resumes/:id` - Get specific resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

## Development

- `npm run dev` - Start development server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## License

ISC
