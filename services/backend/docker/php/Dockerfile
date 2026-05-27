FROM php:8.5-fpm-bookworm

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        git \
        unzip \
        libpq-dev \
        libicu-dev \
        libzip-dev \
    ; \
    docker-php-ext-install \
        pdo_pgsql \
        intl \
        zip \
    ; \
    apt-get install -y --no-install-recommends \
        libpq5 \
        libicu72 \
        libzip4 \
    ; \
    apt-get purge -y --auto-remove \
        libpq-dev \
        libicu-dev \
        libzip-dev \
    ; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_NO_INTERACTION=1

WORKDIR /var/www/html
