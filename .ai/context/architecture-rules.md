# Architecture Rules

## System Architecture

### Pattern: Modular Monolith

The application follows a modular monolith architecture using NestJS modules. Each feature is a self-contained module with clear boundaries, enabling future microservice extraction without refactoring.

```
┌────────────────────────────────────────────────────┐
│                    API Gateway                      │
│              (Controllers + Guards)                 │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Auth     │  │  Users   │  │ Feature  │  ...    │
│  │  Module   │  │  Module  │  │  Module  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│                                                     │
├────────────────────────────────────────────────────┤
│              Shared / Common Module                 │
│     (Guards, Pipes, Filters, Interceptors)          │
├────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────┐  ┌──────────┐                         │
│  │ MongoDB  │  │  Redis   │                         │
│  └──────────┘  └──────────┘                         │
│                                                     │
│  ┌──────────┐                                      │
│  │ RabbitMQ │                                      │
│  └──────────┘                                      │
│                                                     │
└────────────────────────────────────────────────────┘
```

### Layered Architecture (Per Module)

```
Controller Layer   → HTTP request handling, input validation, response formatting
    ↓
Service Layer      → Business logic, orchestration, domain rules
    ↓
Repository Layer   → Data access, query building, database operations
    ↓
Entity Layer       → Data models, schema definitions
```

### Rules

1. **Controllers** handle HTTP concerns only — no business logic.
2. **Services** contain all business logic — injectable and testable.
3. **Repositories** abstract database access — services never query directly.
4. **Entities** define data shapes — no methods, no logic.
5. **DTOs** validate inputs and serialize outputs — separate request/response DTOs.
6. **Guards** handle authentication and authorization — applied at controller level.
7. **Pipes** handle request transformation — applied at parameter level.
8. **Filters** handle exception formatting — applied globally.
9. **Interceptors** handle cross-cutting concerns — logging, caching, timing.

### Module Communication

#### Within the Same Process
- Services inject other services via NestJS DI container.
- Use interfaces for loose coupling.
- Avoid circular dependencies — use `forwardRef()` only as a last resort.

#### Across Modules (Decoupled)
- Use RabbitMQ for event-driven communication.
- Event naming: `module.entity.action` (e.g., `auth.user.registered`).
- Events are fire-and-forget — don't wait for processing.
- Consumers are idempotent — safe to process the same event twice.

### API Versioning

- All endpoints use `/api/v1/` prefix.
- Breaking changes require a new version (`/api/v2/`).
- Old versions are maintained until all clients migrate.
- Version is in the URL, not in headers.

### Configuration Management

```typescript
// Use @nestjs/config with validation
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'staging', 'production').required(),
        PORT: Joi.number().default(3001),
        MONGODB_URI: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
        JWT_REFRESH_EXPIRY: Joi.string().default('7d'),
      }),
    }),
  ],
})
```

### Dependency Rules

1. **No circular dependencies** between modules.
2. **Common module** is imported by feature modules, never the reverse.
3. **Feature modules** do not directly import other feature modules' internals.
4. **Shared types** live in `codebase/shared/` and are imported by both backend and frontend.
5. **Third-party libraries** are wrapped in internal services for abstraction.

### Forbidden Patterns

- ❌ Business logic in controllers
- ❌ Direct database queries in services (use repositories)
- ❌ `any` types anywhere in the codebase
- ❌ Mongoose auto-indexing enabled in production (causes performance overhead)
- ❌ Hardcoded configuration values (use `.env`)
- ❌ Circular module dependencies
- ❌ God classes (>200 lines) or god functions (>30 lines)
- ❌ In-memory state that prevents horizontal scaling
