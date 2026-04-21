# Enterprise Marketplace Platform (EMP) — Engineering Playbook

> Purpose: This file is the working memory and implementation playbook for all coding agents and human contributors in this repository.
> Scope: Applies to every service, shared package, gateway component, and frontend module unless an ADR explicitly overrides it.
> Primary source: `.ai/Enterprise_Marketplace_SRS_v2.md`

---

## 1. How To Use This File

- Read this file before starting any new phase or service.
- Treat this file as the operational interpretation of the SRS.
- If this file conflicts with the SRS, the SRS wins.
- If implementation pressure conflicts with this file, stop and record an ADR before deviating.

---

## 2. Non-Negotiable Architecture Rules

These rules come directly from the SRS and must be enforced in code review and implementation:

- `C-01` Database isolation: a service may access only its own database.
- `C-02` Tech stack: do not swap framework or language for a service without an ADR.
- `C-03` Async integration: all state-changing cross-service operations use RabbitMQ.
- `C-04` Event naming: use lowercase `domain.action`.
- `C-05` Idempotency: all consumers must deduplicate by `event_id`.
- `C-06` DLQ: every consumer queue must have a dead-letter queue.
- `C-07` Secrets: never commit secrets, keys, or credentials.
- `C-08` Logging: all services emit structured JSON logs.
- `C-09` Health: all services expose `/health/live` and `/health/ready`.
- `C-10` Migrations: additive and backward-compatible only.
- `C-11` Raw SQL: forbidden in application code.
- `C-12` Service calls: never call another service's internal port directly.
- `C-13` SSLCommerz IPN: `val_id` must be validated before fulfillment.
- `C-14` Money: store amounts as integer paisa only.
- `C-15` JWT private key: Docker Secret only.

---

## 3. Decision Hierarchy

When making implementation decisions, follow this order:

1. SRS constraints and service boundaries
2. Security and data integrity
3. Operability and observability
4. Backward compatibility
5. Developer ergonomics
6. Performance optimizations

Do not optimize convenience ahead of correctness, traceability, or recovery.

---

## 4. Staff-Level Development Principles

- **Containerization First**: Every service MUST be fully Dockerized. Creating the Docker container (`Dockerfile` and `docker-compose` entry) for a service is the mandatory FIRST step of any coding phase to ensure zero local dependencies.
- **Strict Design Patterns**: NEVER use direct database queries (e.g., Eloquent models or DB facades) in Controllers. You must strictly use Service and Repository patterns as expected of a Staff-Level Software Engineer. Controllers handle HTTP routing/requests and delegate all logic.
- **Dynamic Swagger**: Swagger/OpenAPI documentation must be generated *dynamically* from code, using annotations or reflection. Manual maintenance of Swagger YAML/JSON files is not permitted.
- Design for failure first: retries, timeouts, DLQs, and idempotency are baseline behavior.
- Prefer boring, explicit code over clever abstractions.
- Keep service boundaries strict and obvious in code structure.
- Make operational intent visible: logging, metrics, traces, health checks, and config should be first-class.
- Build for change: additive schema evolution, versioned contracts, and isolated modules.
- Keep write paths transactional and auditable.
- Keep read paths fast, cache-aware, and side-effect free.
- Make invariants impossible to violate through code structure, types, guards, and DB constraints.
- Use composition over inheritance unless the framework strongly expects inheritance.
- Every cross-service contract must be typed, validated, and documented.

---

## 5. Repository-Wide Coding Standards

### 5.1 Code Style

- Use descriptive names. Avoid abbreviations except widely accepted domain terms like `JWT`, `JWKS`, `DLQ`, `SKU`.
- One module should have one clear reason to change.
- Prefer small functions with explicit inputs and outputs.
- Avoid hidden state and mutable global singletons unless required for framework bootstrap.
- Keep framework glue thin and push domain logic into dedicated services or use cases.
- Every non-trivial public method should have clear validation and failure behavior.

### 5.2 Type Safety Policy

Type safety is mandatory across this repository.

This policy applies to:

- Laravel services
- NestJS services
- Next.js applications
- Node.js services
- shared packages
- scripts and background workers
- any future service added to this repository

Core rules:

- Do not use `any` in TypeScript.
- Do not use implicit `any`.
- Do not use `mixed` or unbounded dynamic values as a shortcut unless they are validated immediately at the boundary.
- Do not disable strict typing rules to get code through compilation.
- Do not widen types just to silence the compiler.
- Do not return loosely shaped arrays or objects when a DTO, interface, or schema should exist.
- Do not pass unvalidated external payloads beyond the transport boundary.
- Do not use stringly-typed domain state when an enum, literal union, value object, or constant map should exist.

Allowed boundary pattern:

- external input may enter as `unknown`
- validate or parse it immediately
- convert it into a typed DTO, schema-backed object, or domain object before further use

Allowed exception process:

- if a runtime or framework boundary truly forces a loose type, contain it in the smallest possible adapter
- document why the loose boundary exists
- validate and narrow the value immediately
- never let the loose type spread through service logic
- no team member or coding agent may treat this as optional based on personal style

Required mindset:

- application code must model invariants in types wherever practical
- runtime validation complements static typing; it does not replace it
- compiler warnings about types are design feedback, not noise

### 5.3 Module Boundaries

- `controller` or `route` layers handle transport only.
- `service` or `use-case` layers handle business logic.
- `repository` or persistence adapters handle storage.
- `mapper` or serializer layers convert between transport, domain, and persistence models.
- Shared packages must remain framework-light where possible.

### 5.4 Error Handling

- Fail fast on invalid input.
- Use typed error categories: validation, auth, forbidden, conflict, dependency failure, unexpected failure.
- Never leak secrets or internal stack details to API responses.
- Log internal context once, at the boundary where the error is handled.
- Convert internal exceptions into standardized API or event error shapes.

### 5.5 Configuration

- Centralize environment parsing and validation at startup.
- Reject boot if required config is missing or malformed.
- Keep defaults safe for local development and explicit for production.
- Do not read raw environment variables throughout the codebase.

### 5.6 Time and Money

- Persist timestamps in UTC.
- Use ISO 8601 in logs and API payloads where timestamps are exposed.
- Never use floats for money, discounts, totals, or ledger values.

### 5.7 Type-Safety Enforcement By Stack

#### TypeScript Services and Shared Packages

- Enable strict TypeScript mode.
- Keep `noImplicitAny` and related strict compiler checks enabled.
- Prefer `unknown` over `any` at unsafe boundaries.
- Use Zod schemas, DTOs, and literal unions to narrow transport payloads.
- Shared packages must export concrete types for contracts used across services.
- Avoid type assertions unless validation or framework guarantees justify them.
- If a type assertion is required, keep it local and justify it with nearby code or a docblock.
- Do not use `Record<string, any>`, `Promise<any>`, `Map<string, any>`, or similar loose shortcuts.

#### PHP Services

- Use `declare(strict_types=1);` in PHP files where applicable to the service codebase.
- Add explicit parameter types, return types, and typed properties everywhere possible.
- Do not rely on untyped arrays for important domain structures when DTOs or value objects are warranted.
- Prefer backed enums, value objects, and dedicated classes over magic strings.
- Validate request payloads before they reach business logic.
- Use PHPDoc only to refine types that PHP itself cannot express cleanly, not as a substitute for real typing.
- Do not use `mixed` as a convenience escape hatch in service logic.
- Do not use generic associative arrays as hidden DTOs for core workflows.
- Use typed request objects, typed resources, typed service contracts, typed collection contents where possible, and explicit domain value objects for critical business concepts.
- If framework APIs return broad values, narrow them immediately at the boundary before business logic uses them.

#### Cross-Language Rule

- Every service must use the strongest practical typing model available in its language and framework.
- Business logic must never be built on top of vague transport shapes.
- External input, event payloads, database records, and configuration must be converted into explicit typed structures before workflow logic executes.
- If a language cannot express a type invariant statically, enforce it through validation, value objects, enums, guards, schema parsing, or dedicated wrapper types.
- Production-grade code in this repository must favor explicit contracts over dynamic convenience.

#### JSON and Event Contracts

- JSON payloads are not trusted until validated.
- Event payloads must have schema-backed definitions.
- API request and response bodies must be represented by explicit DTOs or schema types.
- Config objects must be parsed into typed structures before use.

---

## 6. Design Patterns To Follow

This repository does **not** use a different design pattern per developer preference.
We use a small, explicit set of patterns consistently across all services.

### 6.0 Default Pattern Stack

These are the default patterns for the EMP codebase:

- Architecture pattern: `Modular Monolith per Service` with strict bounded contexts inside each microservice
- Service design pattern: `Layered Architecture`
- Business logic pattern: `Use Case / Application Service`
- Persistence pattern: `Repository Pattern`
- Integration pattern: `Event-Driven Architecture`
- API contract pattern: `DTO + Validation Schema`
- Error handling pattern: `Centralized Exception Mapping`
- Cross-cutting pattern: `Middleware / Interceptor / Guard / Policy`, depending on stack
- Data consistency pattern: `Transactional Write Model` in the owning service
- Read optimization pattern: `Cache-Aside`

Patterns we are **not** using as primary defaults unless a specific need arises:

- Full generic Clean Architecture with excessive indirection
- Heavy CQRS split for every CRUD endpoint
- Event sourcing for every service write model
- Generic base repositories with hidden query behavior
- Fat active-record domain models containing most business logic

### 6.1 Pattern Selection Rule

When writing new code, choose the simplest approved pattern that preserves:

- service boundary clarity
- business rule readability
- testability
- observability
- operational safety

If two patterns are possible, prefer the one already used in the same service or shared package.

### 6.2 Service Design

- Use domain-oriented folders per bounded context.
- Prefer use-case driven application services over fat controllers.
- Keep side effects behind interfaces when feasible.
- Use DTOs for transport boundaries and domain models for business invariants.

### 6.3 Canonical Request Flow

For both Laravel and NestJS services, the default write-path flow is:

`Route/Controller -> Request DTO/Validator -> Use Case / Application Service -> Repository -> DB Transaction -> Domain/Event Publish -> Response Mapper`

Rules:

- Controllers never contain business workflows.
- Repositories never contain transport logic.
- Validators never contain persistence logic.
- Event publishing happens after business invariants pass.
- External side effects happen from application services or dedicated handlers, not controllers.

### 6.4 Event-Driven Patterns

- Publisher confirms for RabbitMQ writes where reliability matters.
- Consumers acknowledge messages only after successful processing.
- Deduplication happens before side effects.
- Retries are bounded and exponential.
- Poison messages go to DLQ, not infinite retry loops.
- Event payloads are versioned when compatibility risk exists.

### 6.5 Data Access Patterns

- Repositories own ORM or ODM queries.
- Transactions wrap multi-step state changes in the owning service.
- Use optimistic or pessimistic locking based on domain contention.
- Enforce invariants at both application and database layers where possible.

### 6.6 API Patterns

- Version public APIs under `/api/v1`.
- Use pagination for list endpoints.
- Use idempotency keys for externally retried write operations.
- Use consistent response envelopes for success and failure.
- Public contracts must be described in OpenAPI.

### 6.7 Patterns By Stack

#### Laravel Services

Default pattern:

- `Controller -> FormRequest -> Action/Application Service -> Repository -> Resource`

Use:

- Controllers for HTTP transport only
- Form Requests for validation and authorization input gating
- Actions or application services for business workflows
- Repositories for query and persistence coordination
- API Resources for response shaping
- Policies and Gates for authorization rules

Avoid:

- business logic in controllers
- large multi-purpose service classes
- model observers for critical business workflows unless explicitly justified
- hidden side effects in Eloquent model events

#### NestJS Services

Default pattern:

- `Controller -> DTO/Pipe -> Use Case Service -> Repository/Persistence Service -> Presenter/Response`

Use:

- Controllers for transport only
- DTOs and validation pipes for edge validation
- application services for business rules
- repositories for storage access
- guards for auth
- interceptors for logging, tracing, and response shaping
- exception filters for consistent error mapping

Avoid:

- business logic in controllers
- direct ORM/ODM calls spread across services
- giant `common` folders with mixed concerns

#### Next.js Frontend

Default pattern:

- `Route Segment -> Server Fetch/Query Hook -> UI Component Tree -> Shared Client State only when necessary`

Use:

- server components first
- client components only for interactivity
- React Query for server-state orchestration
- Zustand only for local client state
- route-level composition over deeply coupled page files

Avoid:

- ad hoc fetching scattered across many nested client components
- duplication of API schema assumptions without validation

#### Notification Service

Default pattern:

- `Consumer/Handler -> Template Renderer -> Provider Adapter -> Delivery Result Recorder`

Use:

- adapters for SMTP/SMS providers
- retry coordinator separated from provider implementation
- template rendering as its own concern

### 6.8 When To Use CQRS

The SRS includes CQRS as an architectural direction, but implementation should be pragmatic.

Default rule:

- use a unified service layer for normal CRUD and workflow endpoints
- split commands and queries only when read and write concerns clearly diverge

Use explicit CQRS only when:

- read models differ substantially from write models
- write-side invariants are complex
- query performance requires specialized projections
- event-driven projections are already needed

Do not introduce CQRS ceremony for simple CRUD endpoints.

### 6.9 When To Use Event Sourcing

Event sourcing is **not** the default for every service in this repository.

Use event sourcing only when:

- auditability of state transitions is a first-order business need
- reconstructing history is materially valuable
- append-only event history is part of the domain design

For now, prefer:

- standard transactional persistence
- explicit status history tables where needed
- domain events for integration

### 6.10 Documentation and Docblock Rule

We document public intent, not obvious syntax.

Use docblocks for:

- public classes in shared packages
- public interfaces
- reusable framework-agnostic utilities
- event payload contracts
- non-obvious business rules
- methods whose side effects, invariants, or failure modes are not obvious

Do not add docblocks for:

- trivial getters and setters
- self-explanatory one-line methods
- framework boilerplate with obvious behavior

Docblock expectations:

- summarize responsibility in one sentence
- document important params and return value only when not obvious from types
- document side effects, idempotency behavior, retries, and invariants where relevant
- document monetary units as `paisa` when applicable

Short examples:

```ts
/**
 * Publishes a domain event with standardized metadata and routing guarantees.
 */
```

```php
/**
 * Creates an order once per idempotency key and publishes `order.created`
 * after the transaction commits successfully.
 */
```

---

## 7. Tech Stack Standards

### 7.1 Laravel 13 Services

Applies to: `auth-service`, `order-service`

- Keep controllers thin and move domain logic into service classes or actions.
- Use Form Requests or equivalent request validators for all writable endpoints.
- Use Eloquent relationships carefully and avoid N+1 queries through explicit eager loading.
- Use policies, gates, and middleware for authorization, not ad hoc checks in controllers.
- Keep jobs, listeners, notifications, and commands focused and single-purpose.
- Use migrations for schema changes and seeders only for controlled bootstrap data.
- Use API Resources or transformers for response shaping.
- Avoid putting business logic in models beyond simple invariants or casts.
- Use queue jobs for asynchronous side effects, but cross-service state changes must still route through RabbitMQ.

Recommended structure:

- `app/Http/Controllers`
- `app/Http/Requests`
- `app/Actions` or `app/Application`
- `app/Domain`
- `app/Policies`
- `app/Repositories`
- `app/Events` and `app/Listeners`

### 7.2 NestJS 11 Services

Applies to: `product-service`, `inventory-service`, `payment-service`

- Keep controllers transport-only.
- Put business logic in providers that represent use cases or domain services.
- Use DTO classes for request and response boundaries.
- Use pipes for validation and normalization at the edge.
- Use guards for auth and permissions, interceptors for cross-cutting concerns, filters for exception mapping.
- Keep modules bounded by domain, not by technical layer alone.
- Use providers behind interfaces or tokens where external dependencies may vary.
- Keep Mongoose or TypeORM query logic inside repositories or dedicated persistence services.

Recommended structure:

- `src/modules/<domain>`
- `src/modules/<domain>/controllers`
- `src/modules/<domain>/dto`
- `src/modules/<domain>/services`
- `src/modules/<domain>/repositories`
- `src/modules/<domain>/schemas` or `entities`
- `src/common`

### 7.3 Next.js 14 Frontend

Applies to: `apps/web`

- Use App Router patterns consistently.
- Prefer server components by default and opt into client components only when needed.
- Keep data fetching close to the route boundary.
- Validate API responses with shared schemas where practical.
- Use React Query for server-state caching and mutations.
- Use Zustand for local client state only.
- Keep auth logic centralized and avoid ad hoc token handling in components.
- Make loading, empty, and error states explicit.
- Follow route-level RBAC and avoid UI-only protection.

### 7.4 Node.js 22 Notification Service

Applies to: `notification-service`

- Keep bootstrap small and explicit.
- Separate transport handlers, template rendering, provider adapters, and retry logic.
- Make every provider integration replaceable through an adapter interface.
- Keep the service stateless aside from Redis-backed deduplication and job state.

### 7.5 PostgreSQL 17

- Use migrations only.
- Prefer UUID primary keys for distributed consistency.
- Enforce invariants with constraints where possible.
- Index for actual query patterns, not guesswork.
- Keep transactions short.
- Do not hide complex writes across service boundaries.
- For ledger and financial records, prefer append-only modeling.

### 7.6 MongoDB 7.0

- Use schema validation and indexes intentionally.
- Keep documents shaped around product read patterns.
- Avoid over-embedding high-churn subdocuments.
- Use explicit compound indexes for filter-heavy queries.
- Treat slug uniqueness and product status filtering as first-class requirements.

### 7.7 Redis 7.2

- Use Redis for cache, token blacklist, deduplication, and ephemeral workflow state.
- All Redis keys must follow documented key patterns.
- Every cache entry must have a TTL unless there is a strong documented reason not to.
- Prefer cache-aside for reads and explicit invalidation on writes.

### 7.8 RabbitMQ 3.13

- Use named exchanges, durable queues, durable messages for business events.
- Define queue, DLQ, retry policy, and routing key together.
- Event payloads must include `event_id`, `event_name`, `occurred_at`, `producer`, `schema_version`, and domain data.
- Consumers must be idempotent and transaction-aware.

### 7.9 Nginx Gateway

- Centralize route mapping, rate limiting, security headers, and upstream configuration.
- Keep gateway config declarative and environment-driven.
- Do not place domain business logic in the gateway.
- Use the gateway as the only public ingress for service APIs.

---

## 8. API Contract and OpenAPI Rules

- Every service API must publish an OpenAPI document.
- Swagger generation must be part of service bootstrap or build output, not a manual artifact.
- Shared request and response shapes should reuse schemas from shared packages where practical.
- Public endpoints, auth requirements, path params, query params, error responses, and example payloads must be documented.
- OpenAPI must be updated in the same change set as endpoint changes.
- `docs/swagger/services.manifest.json` is the registry of service API documents.

Minimum OpenAPI expectations:

- `info`, `servers`, `tags`
- auth scheme definitions
- health endpoints
- standardized error responses
- examples for key write operations

---

## 9. Logging, Metrics, and Tracing Standards

- Emit structured JSON logs only.
- Required log fields: `timestamp`, `level`, `service`, `trace_id`, `span_id`, `request_id`, `message`.
- Add `user_id`, `event_id`, `status_code`, and `duration_ms` when available.
- Use one logger abstraction per runtime and reuse it across services.
- Propagate `X-Request-ID` and W3C trace context across service boundaries.
- Record dependency failures with enough context to debug them, but never log secrets.

---

## 10. Health and Readiness Standards

Every service must implement:

- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

Rules:

- `live` means the process is alive.
- `ready` means required dependencies are reachable.
- `ready` must return `503` when the service should not receive traffic.
- Health handlers must be lightweight and fast.

---

## 11. Security Standards

- Validate and sanitize all external input.
- Enforce authentication and authorization in both gateway and service layers where required.
- Use least privilege for service tokens and secrets.
- Never return internal infrastructure topology in public responses.
- Redact tokens, passwords, API keys, and payment-sensitive values from logs.
- Keep private keys and sensitive credentials in Docker Secrets only where the SRS requires them.

---

## 12. Testing Standards

Minimum expectations for production-grade work:

- Unit tests for pure business logic and validators
- Integration tests for service plus owned database
- Contract tests for public API shapes
- Event round-trip tests for publishers and consumers
- Health endpoint tests
- Idempotency tests for retryable operations
- Failure-path tests for dependency outages and malformed input

Rules:

- A feature is not complete if only the happy path is tested.
- Financial logic, auth flows, and event processing require explicit failure-case coverage.
- Test names should describe business behavior, not just method names.

---

## 13. Pull Request and Change Checklist

Before marking work complete, verify:

- boundaries respect the SRS
- config is validated at startup
- logs are structured
- health endpoints exist
- OpenAPI is updated
- tests cover happy path and failure path
- migrations are additive
- no secrets are committed
- cross-service write operations use RabbitMQ
- retry and DLQ behavior are defined for consumers

---

## 14. ADR Triggers

Create an ADR before:

- changing a service language or framework
- bypassing RabbitMQ for state-changing cross-service actions
- relaxing database isolation
- changing money storage away from integer paisa
- changing auth token model or key management
- introducing a new shared abstraction that affects multiple services
- changing the deployment model in a way that affects reliability or security

---

## 15. Agent Execution Workflow

Every coding agent should follow this sequence:

1. Read the SRS and this playbook.
2. Confirm the target phase and service boundary.
3. Check the progress tracker in `.ai/implementation_plan.md`.
4. Implement using the approved stack and patterns only.
5. Update OpenAPI or Swagger registry if APIs change.
6. Verify health, tests, and operational concerns.
7. Update the progress tracker when a phase is complete.

---

## 16. Current Repository Policy

Current source-of-truth files:

- `.ai/Enterprise_Marketplace_SRS_v2.md`
- `.ai/implementation_plan.md`
- `.ai/engineering_playbook.md`

Expectation for future work:

- Before each phase, review these three files together.
- New services and shared packages should align with this file from their first commit.
- If a recurring implementation lesson appears, update this file so future agents inherit it.
