# NexCV Backend

Backend service for NexCV - A modern resume builder application with AI-powered features and premium templates.

## Features

### Core Features

- User authentication with Clerk
- Resume CRUD operations with MongoDB and Prisma ORM
- Credit system for premium features
- Template management system
- PDF generation (planned)
- **AI-powered resume content generation**
- **Public resume sharing via slugs**

### Authentication & Security

- Secure user authentication via Clerk
- JWT token management
- Protected API routes
- Role-based access control
- **Rate limiting for AI endpoints**

### Resume Management

- Create, read, update, and delete resumes
- Multiple resume templates support
- Resume visibility control (public/private)
- Resume data validation with Zod
- **Flexible JSON data structure for resume content**
- PDF export functionality (planned)

### AI Features

- **Generate professional summaries**
- **Improve work experience descriptions**
- **Suggest relevant skills**
- **Enhance project descriptions**
- **Optimize education sections**
- **Improve personal information**
- **Rate limiting and abuse protection**

### Credit System

- Credit balance tracking
- Transaction history
- Premium feature access control
- Credit earning and spending mechanisms

## Tech Stack

### Backend

- Node.js with Express.js
- TypeScript support
- MongoDB with Prisma ORM
- Zod for data validation
- Clerk for authentication
- **OpenAI integration for AI features**
- **Express Rate Limit for API protection**
- Browserless for PDF generation (planned)
- Redis + BullMQ for queue management (planned)

### Development Tools

- ESLint for code linting
- Prettier for code formatting
- GitHub Actions for CI/CD
- Nodemon for development

## Project Structure

```
src/
├── app.js              # Main application entry
├── config/            # Configuration files
├── controllers/       # Route controllers
│   ├── ai.controller.js      # AI generation endpoints
│   └── resume.controller.js  # Resume CRUD operations
├── middlewares/       # Custom middlewares
│   ├── clerkAuth.middleware.js  # Clerk authentication
│   ├── creditCheck.middleware.js # Credit system
│   └── rateLimit.middleware.js  # Rate limiting
├── models/           # Data models
├── routes/           # API routes
│   ├── ai.routes.js      # AI endpoints
│   ├── protected.js      # Protected routes
│   └── resumes.routes.js # Resume endpoints
├── services/         # Business logic
├── utils/            # Utility functions
│   └── validation.js     # Zod validation schemas
└── types/            # Type definitions
    └── resume.types.js   # Resume data structure types
```

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
OPENAI_API_KEY="your_openai_api_key"  # Optional: for AI features
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
- `GET /api/public/:slug` - **Fetch public resume by slug**

### Protected Routes

#### Resume Management

- `POST /api/resumes` - Create new resume
- `GET /api/resumes` - List all user resumes
- `GET /api/resumes/:id` - Get specific resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

#### AI Features

- `POST /api/ai/generate` - **Generate AI content for resume sections**
- `POST /api/ai/enhance-resume` - Enhance entire resume
- `POST /api/ai/scrape-profile` - Scrape profile from URL
- `POST /api/ai/auto-fill` - Auto-fill resume fields

#### Credit System

- `GET /api/credits/balance` - Get user's credit balance
- `GET /api/credits/transactions` - Get credit transaction history
- `POST /api/credits/purchase` - Purchase credits (planned)

#### Templates

- `GET /api/templates` - List available templates
- `GET /api/templates/:id` - Get template details

## Resume Data Structure

The resume data is stored as a flexible JSON object in the `data` field. Here's the structure:

```javascript
{
  personalInfo: {
    name: "string",        // Required
    email: "string",       // Required, valid email
    phone: "string?",      // Optional
    location: "string?",   // Optional
    website: "string?",    // Optional, valid URL
    linkedin: "string?",   // Optional, valid URL
    github: "string?"      // Optional, valid URL
  },
  summary: "string?",      // Professional summary
  experience: [            // Work experience array
    {
      id: "string",        // Required, unique
      company: "string",   // Required
      position: "string",  // Required
      location: "string?",
      startDate: "string", // YYYY-MM or YYYY
      endDate: "string?",
      current: "boolean",
      description: "string?",
      achievements: "string[]?"
    }
  ],
  education: [             // Education array
    {
      id: "string",        // Required, unique
      institution: "string", // Required
      degree: "string",    // Required
      field: "string?",
      startDate: "string",
      endDate: "string?",
      current: "boolean",
      gpa: "string?",
      description: "string?"
    }
  ],
  skills: "string[]?",     // Skills array
  projects: [              // Projects array
    {
      id: "string",        // Required, unique
      name: "string",      // Required
      description: "string", // Required
      url: "string?",
      technologies: "string[]?",
      startDate: "string?",
      endDate: "string?"
    }
  ],
  customSections: [        // Custom sections array
    {
      id: "string",        // Required, unique
      title: "string",     // Required
      content: "any"       // Flexible content
    }
  ],
  sectionOrder: "string[]?", // Section display order
  layout: {                // Layout configuration
    margins: {
      top: "number",       // Default: 20
      bottom: "number",    // Default: 20
      left: "number",      // Default: 20
      right: "number"      // Default: 20
    },
    spacing: "number",     // Default: 1.2
    scale: "number"        // Default: 1
  },
  tags: "string[]?"        // Tags array
}
```

## AI Generation API

### Endpoint: `POST /api/ai/generate`

Generate AI-powered content for specific resume sections.

**Request Body:**

```json
{
    "section": "summary",
    "input": "I worked at Google as a software engineer...",
    "resumeId": "507f1f77bcf86cd799439011"
}
```

**Supported Sections:**

- `summary` - Professional summary
- `experience` - Work experience descriptions
- `education` - Education section content
- `skills` - Relevant skills suggestions
- `projects` - Project descriptions
- `personalInfo` - Personal information improvements

**Response:**

```json
{
    "result": "Experienced software engineer with a proven track record at Google..."
}
```

**Rate Limits:**

- 10 requests per 15 minutes per IP address
- Automatic fallback to mock AI if OpenAI is unavailable

## Data Models

### User

- Basic user information
- Clerk user ID integration
- Credit balance tracking
- Resume relationships

### Resume

- Title and slug
- Template reference
- **Flexible JSON data storage**
- Visibility settings (public/private)
- User relationship

### CreditTransaction

- Transaction type (earn/spend)
- Amount
- Reason
- Timestamp
- User relationship

### Template

- Template metadata
- Version information
- Compatibility details
- Custom field definitions

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run seed` - Seed database with sample data

### Code Style

- ESLint configuration for code quality
- Prettier for consistent formatting
- TypeScript for type safety

### Environment Variables

- `DATABASE_URL` - MongoDB connection string
- `CLERK_SECRET_KEY` - Clerk authentication secret
- `CLERK_PUBLISHABLE_KEY` - Clerk public key
- `OPENAI_API_KEY` - OpenAI API key (optional)

## Future Enhancements

### Planned Features

- **AI-powered resume suggestions** ✅ (Implemented)
- PDF generation with Browserless
- Stripe integration for payments
- Advanced template customization
- Resume analytics and insights
- Bulk operations support
- **API rate limiting** ✅ (Implemented)
- Caching implementation
- **Public resume sharing** ✅ (Implemented)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC

## Author

Made with ❤️ by Manas
