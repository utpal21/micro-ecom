# AI Agent Context Directory

## Purpose
This directory contains essential context documents for all AI agents working on the Enterprise Marketplace project. **All AI agents MUST read these documents before making any changes** to ensure consistency, professional-grade quality, and adherence to established standards.

## Required Reading Order (Mandatory!)

### First-Time Setup
1. **START HERE**: `README.md` (this file) - Overview and navigation
2. `CODING_STANDARDS.md` - Professional engineering standards (MANDATORY)
3. `PROJECT_STRUCTURE.md` - Project structure and standards
4. `engineering_playbook.md` - Development guidelines and best practices
5. `implementation_plan.md` - Project implementation roadmap

### Context Documents

#### 1. CODING_STANDARDS.md ⭐ CRITICAL
**Purpose**: Defines professional coding, architectural, and operational standards
**When to Read**: BEFORE writing any code or making architectural decisions
**Key Sections**:
- Architecture Principles (Microservices, Service Communication)
- Code Quality Standards (PHP/Laravel, SOLID, Repository Pattern)
- Database Standards (Naming, Design, Migrations)
- Docker & Containerization Standards
- Security Standards
- API Design Standards
- Testing Standards
- Documentation Standards
- Performance Standards
- Monitoring & Observability
- CI/CD Standards
- Git & Version Control

#### 2. PROJECT_STRUCTURE.md ⭐ CRITICAL
**Purpose**: Explains project structure, clarifies file purposes (including .gitignore), provides guidance
**When to Read**: When working on project structure or file organization
**Key Sections**:
- Complete project structure overview
- .gitignore files explanation (IMPORTANT: Read this before removing any .gitignore!)
- Service structure standards
- Database connection standards
- Docker standards
- API standards
- Documentation standards
- Development workflow
- Best practices summary

#### 3. engineering_playbook.md
**Purpose**: Development guidelines and best practices for the team
**When to Read**: When implementing features or solving technical challenges
**Key Sections**:
- Development workflow
- Code review guidelines
- Testing strategies
- Deployment procedures

#### 4. implementation_plan.md
**Purpose**: Project implementation roadmap and phase breakdown
**When to Read**: When planning new features or understanding project roadmap
**Key Sections**:
- Phase breakdown (Phase 1-6)
- Service implementation order
- Dependencies and prerequisites
- Milestones and deliverables

## Quick Reference

### Common Tasks

#### Adding a New Service
1. Read `PROJECT_STRUCTURE.md` - Service Structure Standards
2. Read `CODING_STANDARDS.md` - Docker & Containerization Standards
3. Follow naming conventions:
   - Service name: `{service-name}` (kebab-case)
   - Database: `postgres-{service-name}`
   - Database name: `emp_{service-name}`
   - Container: `emp-{service-name}`
4. Implement health checks
5. Update `docker-compose.yml`
6. Document API in `openapi.yaml`

#### Setting Up Database Connections
1. Read `PROJECT_STRUCTURE.md` - Database Connection Standards
2. Use service name as host (NOT localhost)
3. Use internal port 5432 (NOT external port)
4. Configure `listen_addresses = '*'` in PostgreSQL
5. Add health check to service

#### Writing Code
1. Read `CODING_STANDARDS.md` - Code Quality Standards
2. Follow PSR-12 coding standard
3. Use strict type declarations
4. Implement repository pattern
5. Write comprehensive tests
6. Document all public APIs

#### Configuring Docker
1. Read `CODING_STANDARDS.md` - Docker & Containerization Standards
2. Use multi-stage builds
3. Run as non-root user
4. Add health checks
5. Use named volumes for persistence
6. Follow naming conventions

#### Testing
1. Read `CODING_STANDARDS.md` - Testing Standards
2. Aim for 80%+ coverage
3. Write unit tests for business logic
4. Write integration tests for APIs
5. Use AAA pattern (Arrange, Act, Assert)

## Important Clarifications

### About .gitignore Files
**READ THIS BEFORE MAKING ANY CHANGES TO .GITIGNORE FILES!**

The multiple `.gitignore` files you see in `services/auth-service/` are:
- ✅ **STANDARD LARAVEL FILES** - They are created automatically by Laravel
- ✅ **EXPECTED AND NORMAL** - Every Laravel project has them
- ✅ **DO NOT REMOVE THEM** - They prevent tracking of files that should never be in git
- ✅ **LOCATIONS**:
  - `services/auth-service/.gitignore` (service root)
  - `services/auth-service/storage/*/.gitignore` (Laravel storage directories)
  - `services/auth-service/database/.gitignore` (Laravel database files)
  - `services/auth-service/bootstrap/cache/.gitignore` (Laravel cache files)
  - `services/auth-service/vendor/*/.gitignore` (third-party packages)

**What to Maintain**:
- ✅ Root `.gitignore` (project root) - This is the main one to update
- ✅ Add project-specific ignores to root `.gitignore`

**What NOT to Touch**:
- ❌ Laravel default `.gitignore` files in service directories
- ❌ Vendor `.gitignore` files (they're from composer packages)

For full explanation, see `PROJECT_STRUCTURE.md` - "About .gitignore Files" section.

### Database Connection Pattern
**Always follow this pattern for all services**:

```yaml
# docker-compose.yml
postgres-{service-name}:
  image: postgres:17-alpine
  container_name: emp-postgres-{service-name}
  environment:
    POSTGRES_DB: emp_{service-name}
    POSTGRES_USER: ${POSTGRES_USER:-emp}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-emp}
  command:
    - "postgres"
    - "-c"
    - "listen_addresses=*"
```

```bash
# services/{service-name}/.env
DB_CONNECTION=pgsql
DB_HOST=postgres-{service-name}    # Use service name, NOT localhost
DB_PORT=5432                        # Use internal port, NOT external port
DB_DATABASE=emp_{service-name}
DB_USERNAME=${POSTGRES_USER:-emp}
DB_PASSWORD=${POSTGRES_PASSWORD:-emp}
```

### Service Communication
**Never use localhost for inter-service communication!**

❌ WRONG:
```bash
DB_HOST=127.0.0.1
DB_PORT=5433
```

✅ CORRECT:
```bash
DB_HOST=postgres-auth
DB_PORT=5432
```

## Professional-Grade Requirements

### Code Quality
- [x] PSR-12 coding standards
- [x] Strict type declarations
- [x] Comprehensive documentation
- [x] Repository pattern implementation
- [x] Service layer for business logic
- [x] Comprehensive test coverage (80%+)

### Architecture
- [x] Microservices architecture
- [x] Database per service
- [x] Event-driven communication
- [x] API Gateway pattern
- [x] High availability configuration

### Infrastructure
- [x] Docker containerization
- [x] Health checks for all services
- [x] Data persistence (named volumes)
- [x] Network isolation
- [x] Security best practices

### Operations
- [x] Structured logging
- [x] Metrics collection
- [x] Monitoring and alerting
- [x] CI/CD pipeline
- [x] Backup and recovery

## Checklist for AI Agents

Before Making Any Changes:
- [ ] Read `CODING_STANDARDS.md`
- [ ] Read relevant sections of `PROJECT_STRUCTURE.md`
- [ ] Check `implementation_plan.md` for context
- [ ] Review existing code patterns in similar services
- [ ] Follow established naming conventions
- [ ] Write tests for new functionality
- [ ] Update documentation
- [ ] Ensure health checks are implemented
- [ ] Verify Docker configuration follows standards

After Making Changes:
- [ ] Verify code follows PSR-12
- [ ] Run tests and ensure they pass
- [ ] Check for security issues
- [ ] Update relevant documentation
- [ ] Test Docker configuration
- [ ] Verify service health checks pass

## Common Pitfalls to Avoid

### ❌ Don't Do This
- Remove Laravel default `.gitignore` files
- Use localhost for inter-service communication
- Hardcode credentials
- Ignore errors with `@`
- Write business logic in controllers
- Skip writing tests
- Ignore documentation
- Use external ports for internal communication
- Create services without health checks
- Commit sensitive data to git

### ✅ Do This Instead
- Follow naming conventions
- Use dependency injection
- Implement repository pattern
- Write comprehensive tests
- Document all public APIs
- Use service layer for business logic
- Implement health checks
- Use Docker service names
- Follow PSR-12 standards
- Keep documentation up to date

## Current Project Status

### Completed
- ✅ Phase 1: Architecture and Infrastructure Setup
- ✅ Phase 2: Auth Service Implementation
- ✅ Database connection issues resolved
- ✅ Professional standards established
- ✅ Docker infrastructure configured
- ✅ Health checks implemented

### In Progress
- 🔄 Phase 3: Additional Microservices (Order, Inventory, Payment, Product, Notification)

### Standards Established
- ✅ Coding standards defined
- ✅ Project structure documented
- ✅ Database connection patterns established
- ✅ Docker standards defined
- ✅ API design standards documented
- ✅ Testing requirements defined
- ✅ Security standards established

## Getting Help

### Documentation Index
1. `CODING_STANDARDS.md` - Complete engineering standards
2. `PROJECT_STRUCTURE.md` - Project structure and file organization
3. `engineering_playbook.md` - Development guidelines
4. `implementation_plan.md` - Project roadmap

### External Resources
- Laravel Documentation: https://laravel.com/docs
- Docker Documentation: https://docs.docker.com
- PostgreSQL Documentation: https://www.postgresql.org/docs
- Redis Documentation: https://redis.io/documentation

## Conclusion

This directory provides all the context needed to maintain professional-grade quality across the Enterprise Marketplace project. **Always reference these documents** before making changes to ensure consistency and adherence to established standards.

**Remember**: The multiple `.gitignore` files in Laravel services are standard and expected - do NOT remove them!

---

**Last Updated**: 2026-04-20
**Version**: 1.0.0
**Maintained By**: Engineering Team