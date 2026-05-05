# Docker Configuration Fix Instructions

## Issue Summary
The admin-service has an embedded RSA private key in docker-compose.yml, which is:
1. A security risk (keys in environment variables)
2. Prevents proper file-based key management
3. Needs to be replaced with file mounting

## Current State
- JWT key files exist at: `services/admin-service/config/jwt/private.pem` and `public.pem`
- Keys are embedded in docker-compose.yml (line 350-354)
- No volume mounts configured for JWT keys

## Required Changes to docker-compose.yml

### 1. Replace Embedded Key with File Path (Line 350-354)

**REMOVE:**
```yaml
- JWT_PRIVATE_KEY=${JWT_PRIVATE_KEY:-"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfldNoxZjgHj+g\n9M8xcCpCiU4kIXEu7B95UhTJBw6Adz39zXzn5dUNulpITRokJEmYwaBW1jxoqMWl\ne/66g8KYFw/hQ1KXZQLXJ5WSvt3Jcfk6dm0rejDLNgFtTwHGGdhNsVlUs5Ks+2Gv\nc+UotACGwJZB2FqMyK9qF+MuZH9J4eoyNSCLs8JjRN1d8Ea/BO3qOCRabscRC4W+\nPTJSCDVVEURQJ4z94J3i2GUQaevEIVzmG6fn+ksBXO5N8jOkdAkFytUFO+MduZRP\n4nDFInSVUJFyT4VUY7YQez1HWVjk1GvTRk5Pcf2XS99yxcRtxVVZSUvY8dJPeRPQ\nowmCPhkLAgMBAAECggEAI+h5c4eImItDHM6JwsmI1UwdSKA2VUWG0y045AWbcUu1\nS7WyLGw1CLy3vd+O0I8jYsJ2GybSZ4dIzDMFzglV5Kc6MwC6RaZAtofySwcXB5X5\nDkfxcIdx9AZQZFsepc+GIF7Yl0nfx02iz/2E/ZcrHnkqU0OJXLg+XoOc8NkjDZz1\n23izn5lnXxIYvnTxZarfNDKoquvZ+QF0LsKbYVhdoTLZ7j0CqEa7jRESUiqNgnfH\num4ItZuv4QFqUvWUT1JOZ+ZL2+PumGUtaZ+WOGPsE+HQImKud2mLVuvN1if/a4qf\nvRqufNq1GFSOxdvzbP+vsH+OrJivFLbBjpSgwgf7wQKBgQD6KTDdC651swXsVDpc\nEOrcPau7tVGWBbl6fRV7uwu8HNbTPpv1kKmckFwMUHL1QKP+ZZx7PKVzy8HlNYWo\n9oV1csk6KxOzIgrAJN7wDPuWxgqnZPXpHyJhSZ7MUFmwbA1uOpsu203E5bvwhlCQ\nNZ+19lTMAvn7pFPQsGC7HYgbBQKBgQDkzdXIELq8fpe9EnVBZgELZ8CRLRRAbW8r\nWs3Ut9f7jIimnarU+rRJB3XwxDEVt/ZHSxtoxSsRRi2aA7x3XKHF+y+QSrFvLj8Q\nhDQWF1Az8pugI9pFPtqoHBtvCUbeJ3Vyi2DWG+dWAELm87h/LHYg+Jqf1xYace1l\nPfGjIeNAzwKBgFQLdrEs9YXxiXHmslywClfIGGRN/IUMk04FrCwPoVen0LzT8g3E\ndld1YJd6h8TB3NbhSHtW2rdWo2PgYXFssVXOJLD4O/wY2cfIG2ZG1lfHXVjz4HJb\n1W8eDs3RyPAuvSxlYDGT2ELodAXQ+kwY1/mIMuD/twDGKqqYN0dmGo4JAoGAQUkq\nUufTIK3OhjiaFIsSiTqVi9cdDDUtn2VNjgDXNAOpikE62YKfpqbmVEjm6JeRQk6A\nB6ka3Nb1dBjU0gowbtl5fOaTMnIztHbElfkY/XmgRlV0loWUxpseiNRQ0FrZ/FEg\n1HcpzzRL4rJwVnlNS6MkG6+3stwHLPg71px4x6kCgYEAx79moh9HdZKP3Vfudgqx\nR5tkcP+ghsffb55+cebdCx0FfLisU2hnKsFcOHBJYp2HnsSLg5uiA4/535sNO6vX\nTyOnBfk/1luyNuA+euO8ZNVPKhEcZjB5hXZ2IT5HG7O40OoRq5bt4UR+k3PsHK/J\nCxZFamV7sp+ClXkFuNuNNnQ=\n-----END PRIVATE KEY-----"}
```

**ADD:**
```yaml
- JWT_PRIVATE_KEY_PATH=/app/config/jwt/private.pem
- JWT_PUBLIC_KEY_PATH=/app/config/jwt/public.pem
```

### 2. Add Volume Mount for JWT Keys

After the `environment:` section, add a `volumes:` section:

```yaml
    volumes:
      # Mount JWT keys for service-to-service authentication
      - ./services/admin-service/config/jwt:/app/config/jwt:ro
```

### 3. Update Admin Service Dockerfile

Ensure the Dockerfile creates the `/app/config/jwt` directory:

```dockerfile
RUN mkdir -p /app/config/jwt
```

## Manual Edit Instructions

Since the multi-line key makes automated editing difficult, here's the manual process:

1. **Open docker-compose.yml**
2. **Find line 350** (approximately)
3. **Delete the entire JWT_PRIVATE_KEY line** (spans multiple lines)
4. **Add these two lines** in its place:
   ```yaml
   - JWT_PRIVATE_KEY_PATH=/app/config/jwt/private.pem
   - JWT_PUBLIC_KEY_PATH=/app/config/jwt/public.pem
   ```
5. **Find the admin-service volumes section** (currently empty or non-existent)
6. **Add the JWT volume mount**:
   ```yaml
     volumes:
       # Mount JWT keys for service-to-service authentication
       - ./services/admin-service/config/jwt:/app/config/jwt:ro
   ```
7. **Save the file**

## Verification

After making changes, verify:

1. **Check JWT files exist:**
   ```bash
   ls -la services/admin-service/config/jwt/
   ```

2. **Test docker-compose syntax:**
   ```bash
   docker-compose config
   ```

3. **Start services:**
   ```bash
   docker-compose up -d admin-service
   ```

4. **Check service logs:**
   ```bash
   docker-compose logs -f admin-service
   ```

5. **Verify JWT keys are mounted:**
   ```bash
   docker exec emp-admin-service ls -la /app/config/jwt/
   ```

## Admin Frontend Docker Configuration

To add the admin frontend to docker-compose.yml, add this service:

```yaml
  # ============================================
  # Admin Frontend - React 18 + Vite
  # ============================================
  admin-frontend:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
      target: production
    container_name: emp-admin-frontend
    ports:
      - "${ADMIN_FRONTEND_PORT:-5173}:80"
    environment:
      # API Configuration
      - VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:8007/api/v1}
      - VITE_PRODUCT_SERVICE_URL=${VITE_PRODUCT_SERVICE_URL:-http://localhost:8002/api/v1}
      - VITE_ORDER_SERVICE_URL=${VITE_ORDER_SERVICE_URL:-http://localhost:8003/api/v1}
      - VITE_INVENTORY_SERVICE_URL=${VITE_INVENTORY_SERVICE_URL:-http://localhost:8004/api/v1}
      - VITE_AUTH_SERVICE_URL=${VITE_AUTH_SERVICE_URL:-http://localhost:8001/api/v1}
    depends_on:
      - admin-service
    networks:
      - emp-backend
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

## Summary

1. ✅ JWT key files already exist
2. ⚠️ Need to replace embedded key with file paths in docker-compose.yml
3. ⚠️ Need to add volume mount for JWT keys
4. ⚠️ Need to create Dockerfile for admin-frontend
5. ⚠️ Need to add admin-frontend service to docker-compose.yml

## Testing Plan

1. Fix admin-service JWT configuration
2. Restart admin-service container
3. Verify JWT authentication works
4. Create admin-frontend Dockerfile
5. Add admin-frontend to docker-compose.yml
6. Test full authentication flow
7. Verify admin frontend connects to admin API