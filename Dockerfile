# syntax=docker/dockerfile:1
#
# La Presa — imagen de la API + ffmpeg.
#
# Sustituye al buildpack de Railpack, que no podía instalar ffmpeg: sin ffmpeg
# /api/health responde "ffmpegInstalled": false y no hay emisión posible.
#
# Se construye igual en amd64 y en arm64 (la A1.Flex de Oracle es ARM).

# ── Etapa 1: compilación ─────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Los manifiestos van primero y solos: mientras no cambien, Docker reutiliza la
# capa de "npm ci", que es la parte lenta del build (en ARM, muy lenta).
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Genera dist/ (Vite) y server.js (esbuild). Un solo script desde que "build"
# encadena "build:server"; antes esto era lo que faltaba y por eso el contenedor
# arrancaba sin server.js.
RUN npm run build

# ── Etapa 2: dependencias de producción ──────────────────────────────────────
# server.js se empaqueta con --packages=external, así que en runtime siguen
# haciendo falta express, cors y dotenv. Las devDependencies (vite, esbuild,
# tailwind, tsx) no: se quedan en la etapa de build y no engordan la imagen.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── Etapa 3: imagen final ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# ffmpeg hace las 3 codificaciones del HLS y la copia de la grabación.
# ca-certificates lo necesita Node para cualquier salida HTTPS.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist        ./dist
COPY --from=build /app/server.js   ./server.js
COPY package.json ./

# Se crean aquí y con dueño "node" para que el volumen y el tmpfs hereden el
# permiso al montarse. Si Docker las crea al vuelo quedan de root, y el proceso
# —que no corre como root— no podría escribir ni un segmento.
RUN mkdir -p /app/hls /app/recordings/clips \
 && chown -R node:node /app/hls /app/recordings

# Mismo criterio que el systemd al que sustituye: el proceso que maneja video y
# lanza ffmpeg no tiene por qué ser root.
USER node

EXPOSE 3001

# Dokploy reinicia el contenedor si esto falla. start-period generoso: el primer
# arranque hace la purga de grabaciones viejas antes de atender.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.STREAM_SERVER_PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# node directo sobre el bundle, sin npm por medio: así las señales de parada
# llegan al proceso real y ffmpeg se cierra limpio en cada redespliegue.
CMD ["node", "server.js"]
