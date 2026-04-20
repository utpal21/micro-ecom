# Multi-stage build for Auth Service - Laravel 13
FROM php:8.4-cli-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    postgresql-dev \
    linux-headers \
    $PHPIZE_DEPS \
    git \
    curl \
    zip \
    unzip \
    libzip-dev \
    icu-dev \
    oniguruma-dev

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    pcntl \
    bcmath \
    intl \
    mbstring \
    opcache \
    zip \
    && pecl install redis-6.1.0 \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/auth-service

# Copy application files
COPY . .

# Install dependencies
RUN composer install \
    --no-interaction \
    --no-dev \
    --optimize-autoloader \
    --prefer-dist \
    --no-scripts

# Set permissions for storage and cache
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod -R g+w storage bootstrap/cache

# Production stage
FROM php:8.4-cli-alpine AS production

# Install system dependencies (minimal for production)
RUN apk add --no-cache \
    postgresql-client \
    curl

# Install PHP extensions
RUN docker-php-ext-install \
    pdo_pgsql \
    pgsql \
    pcntl \
    bcmath \
    intl \
    mbstring \
    opcache \
    zip \
    && pecl install redis-6.1.0 \
    && docker-php-ext-enable redis

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Create non-root user for security
RUN addgroup -g 1000 www && \
    adduser -D -u 1000 -G www -h /var/www/auth-service www

# Set working directory
WORKDIR /var/www/auth-service

# Copy application from base stage
COPY --from=base --chown=www:www /var/www/auth-service /var/www/auth-service

# Create storage directories
RUN mkdir -p storage/framework/{sessions,views,cache} \
    storage/logs \
    bootstrap/cache \
    && chown -R www:www storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Copy production PHP configuration
COPY infrastructure/docker/php/production.ini $PHP_INI_DIR/conf.d/

# Expose port
EXPOSE 8001

# Switch to non-root user
USER www

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD php artisan health:check || exit 1

# Run Laravel application
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8001"]

# Development stage (default)
FROM base AS development

# Set permissions for development
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Expose port
EXPOSE 8001

# Run Laravel development server
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8001"]