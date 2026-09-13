# Multi-stage so the runtime image carries no build toolchain.
FROM python:3.11-slim AS builder

WORKDIR /build
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


FROM python:3.11-slim

# libpq5 only: the client library, not the compiler that linked against it.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpq5 curl \
 && rm -rf /var/lib/apt/lists/*

# Never run the app as root.
RUN useradd --create-home --uid 1000 nexgram
WORKDIR /app

COPY --from=builder /install /usr/local
COPY --chown=nexgram:nexgram . .
RUN chmod +x ./entrypoint.sh

USER nexgram

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

EXPOSE 8000

# Readiness, not liveness: a process that cannot reach the database should be
# taken out of rotation rather than killed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:8000/ready || exit 1

# Migrations, an optional seed, then the server. See entrypoint.sh for why
# the seed is there at all and why running it every boot is safe.
CMD ["./entrypoint.sh"]
