# Tech Stack

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 24 LTS | JavaScript runtime |
| **NestJS** | 10.x | Progressive Node.js framework |
| **TypeScript** | 5.x | Type-safe JavaScript (strict mode) |
| **Mongoose** | 8.x | MongoDB ODM (Primary Database ORM) |
| **Passport** | 0.7.x | Authentication middleware |
| **passport-jwt** | 4.x | JWT authentication strategy |
| **bcrypt** | 5.x | Password hashing |
| **class-validator** | 0.14.x | Request validation decorators |
| **class-transformer** | 0.5.x | Object transformation |
| **@nestjs/swagger** | 7.x | OpenAPI documentation |
| **@nestjs/config** | 3.x | Configuration management |
| **@nestjs/throttler** | 5.x | Rate limiting |
| **@nestjs/cache-manager** | 2.x | Caching abstraction |
| **@nestjs/bull** | 10.x | Job queue (RabbitMQ adapter) |
| **Winston** | 3.x | Structured logging |
| **helmet** | 7.x | HTTP security headers |
| **cors** | 2.x | Cross-Origin Resource Sharing |
| **Joi** | 17.x | Configuration validation |
| **uuid** | 9.x | UUID generation |

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14.x | React framework (App Router) |
| **React** | 18.x | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript (strict mode) |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Shadcn UI** | Latest | Accessible component primitives |
| **Radix UI** | Latest | Headless UI primitives (via Shadcn) |
| **Zustand** | 4.x | Client state management |
| **TanStack React Query** | 5.x | Server state management |
| **React Hook Form** | 7.x | Form state management |
| **Zod** | 3.x | Schema validation |
| **Framer Motion** | 11.x | Animation library |
| **Lucide React** | Latest | Icon library |
| **Axios** | 1.x | HTTP client |
| **clsx** | 2.x | Conditional class names |
| **tailwind-merge** | 2.x | Tailwind class conflict resolution |
| **next-themes** | Latest | Theme management (light/dark) |
| **date-fns** | 3.x | Date utility library |

## Databases

| Technology | Version | Purpose |
|-----------|---------|---------|
| **MongoDB** | 7.x | Primary database (transactional and flexible document data) |
| **Redis** | 7.x | In-memory cache, sessions, rate limiting |

## Message Queue

| Technology | Version | Purpose |
|-----------|---------|---------|
| **RabbitMQ** | 3.x | Asynchronous message queue for background jobs |

## Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Jest** | 29.x | Unit and integration test runner |
| **Supertest** | Latest | HTTP assertion for integration tests |
| **Playwright** | Latest | End-to-end browser testing |
| **@testing-library/react** | Latest | React component testing |
| **ts-jest** | 29.x | TypeScript support for Jest |

## DevOps

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Docker** | Latest | Application containerization |
| **Docker Compose** | Latest | Multi-container orchestration |
| **GitHub Actions** | N/A | CI/CD pipeline |
| **Prometheus** | Latest | Metrics collection |
| **Grafana** | Latest | Metrics visualization |
| **ELK Stack** | Latest | Log aggregation and analysis |

## Development Tools

| Technology | Purpose |
|-----------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Husky** | Git hooks |
| **lint-staged** | Pre-commit linting |
| **commitlint** | Commit message linting |
| **ts-node** | TypeScript execution |
| **nodemon** | Development auto-restart |

## Version Compatibility Notes

- Node.js 24 LTS is required for native fetch and latest ESM support.
- NestJS 10.x requires Node.js 16+ and TypeScript 4.7+.
- Next.js 14.x requires React 18.x and Node.js 18+.
- Mongoose 8.x requires Node.js 16+ and has improved TypeScript support.
