# API Gateway Base Configuration

This directory contains the Phase 2 base Nginx gateway configuration for EMP.

Files:

- `nginx.conf`: top-level Nginx runtime configuration and JSON logging
- `conf.d/api-gateway.conf`: upstreams, route mappings, rate limits, and `/health`

Current scope:

- route mapping for all planned EMP services
- rate limit zones aligned with the SRS
- request ID propagation
- gateway health endpoint
- JSON access logs for later Loki/Promtail integration

Planned later phases:

- TLS termination
- CORS allowlist
- stronger security headers
- production-specific upstream and secret handling
