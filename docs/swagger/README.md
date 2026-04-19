# Swagger Registry

This directory contains the central API registry for the platform.

- `services.manifest.json` is the source of truth for service-level API metadata.
- `openapi.index.json` is the generated aggregate index consumed by future Swagger UI tooling.

During later phases, each service will publish its own OpenAPI document and update the corresponding
`swaggerUrl` and readiness metadata here.

