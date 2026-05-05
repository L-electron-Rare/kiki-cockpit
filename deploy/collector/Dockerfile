# Optional: containerised kiki-collector. The native launchd plist (cc.kiki.collector.plist)
# is preferred on studio because the collector needs read access to logs and eval results
# living under the user's home directory.
FROM python:3.12-slim AS collector
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN uv sync --no-dev
ENV PATH="/app/.venv/bin:${PATH}" COLLECTOR_HOST=0.0.0.0 COLLECTOR_PORT=9150
EXPOSE 9150
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS http://127.0.0.1:9150/healthz || exit 1
CMD ["uvicorn", "kiki_collector.main:app", "--host", "0.0.0.0", "--port", "9150"]
