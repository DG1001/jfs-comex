FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --gid 1001 bof && useradd --uid 1001 --gid bof --shell /bin/bash --create-home bof

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY config.yaml ./config.yaml
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data && chown -R bof:bof /app && chmod +x /usr/local/bin/docker-entrypoint.sh

# Bewusst NICHT `USER bof`: der Entrypoint läuft als root, korrigiert die
# Rechte am (ggf. bind-gemounteten) /app/data und legt dann via setpriv die
# Privilegien auf bof ab, bevor er den Server startet.
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
