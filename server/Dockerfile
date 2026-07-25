FROM python:3.12-slim AS base

WORKDIR /srv

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl wget \
    && rm -rf /var/lib/apt/lists/*

# Zero-cost pilot topology: OPA embedded in this same image and run as a
# loopback-only process alongside the API (see entrypoint.sh), instead of
# a separate Render service, which would require a paid plan. Pinned to a
# specific static (no libc dependency) release rather than "latest" so a
# rebuild doesn't silently pick up a different OPA version.
ARG OPA_VERSION=1.7.1
RUN curl -fsSL -o /usr/local/bin/opa \
      "https://openpolicyagent.org/downloads/v${OPA_VERSION}/opa_linux_amd64_static" \
    && chmod +x /usr/local/bin/opa

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY entrypoint.sh ./

RUN pip install --no-cache-dir . \
    && chmod +x entrypoint.sh

RUN useradd --create-home --uid 1000 payreality
USER payreality

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Runs OPA (loopback-only) and pending Alembic migrations, then starts the
# API. A failed migration aborts startup rather than serving traffic
# against a schema it doesn't match: see DEPLOYMENT.md for the rollback
# procedure.
CMD ["./entrypoint.sh"]
