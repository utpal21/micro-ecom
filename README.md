# Enterprise Marketplace Platform

This repository contains the monorepo foundation for the Enterprise Marketplace Platform (EMP) described in:

- `.ai/Enterprise_Marketplace_SRS_v2.md`
- `.ai/implementation_plan.md`
- `.ai/engineering_playbook.md`

## Progress

- Completed phases: `2 / 11`
- Current phase: `Phase 3 - Auth Service`
- Source of truth: `.ai/implementation_plan.md`
- Engineering standards: `.ai/engineering_playbook.md`

## Phase 1 Scope

Phase 1 establishes:

- Monorepo directory structure for apps, services, shared packages, and infrastructure
- Root workspace metadata for Node-based packages
- Base Docker Compose infrastructure for PostgreSQL, MongoDB, Redis Sentinel, and RabbitMQ
- Infra bootstrap assets such as database init scripts and readiness helpers
- A central Swagger service registry seed for the APIs defined in the SRS

## Phase 2 Scope

Phase 2 establishes:

- `packages/shared-types` with shared event, auth, and order schemas
- `packages/utils` with structured logging, tracing, validation, and API error helpers
- `packages/event-bus` with RabbitMQ topology, publisher, consumer, and idempotency primitives
- Base Nginx gateway configuration with route mapping, rate limiting, request ID propagation, and `/health`

## Quick Start

```bash
docker compose up -d rabbitmq redis-master redis-replica-1 redis-replica-2 \
  redis-sentinel-1 redis-sentinel-2 redis-sentinel-3 \
  postgres-auth postgres-order postgres-inventory postgres-payment mongodb mongo-init-replica
docker compose ps
```

## Layout

```text
apps/
services/
packages/
infrastructure/
docs/swagger/
```
