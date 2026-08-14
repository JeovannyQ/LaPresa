#!/usr/bin/env bash
#
# La Presa — instalacion del servidor de origen sobre Ubuntu 24.04 limpio.
#
#   sudo bash /opt/lapresa/deploy/install.sh lapresa.tudominio.com
#
# Es idempotente: se puede volver a correr para actualizar el codigo sin perder
# las claves ya generadas. Lo que ya existe no se pisa.
#
set -euo pipefail

APP_DIR="/opt/lapresa"
DATA_DIR="/var/lib/lapresa"
HLS_DIR="${DATA_DIR}/live"
RECORDINGS_DIR="${DATA_DIR}/recordings"
CONF_DIR="/etc/lapresa"
ENV_FILE="${CONF_DIR}/lapresa.env"
SECRETS_FILE="${CONF_DIR}/claves-generadas.txt"
APP_USER="lapresa"
NODE_MAJOR="22"
# Los segmentos vivos ocupan ~25 MB (40 s x 3 calidades); 512M sobra de largo.
HLS_TMPFS_SIZE="512M"

log()  { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[aviso]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

# ── Comprobaciones previas ──────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "Hay que correrlo como root:  sudo bash $0 <dominio>"

DOMAIN="${1:-}"
[[ -n "$DOMAIN" ]] || die "Falta el dominio.  Uso: sudo bash $0 lapresa.tudominio.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
if [[ "$REPO_DIR" != "$APP_DIR" ]]; then
  die "El repositorio tiene que estar en ${APP_DIR} (esta en ${REPO_DIR}).
     git clone https://github.com/JeovannyQ/LaPresa.git ${APP_DIR}"
fi

command -v apt-get >/dev/null || die "Este script es para Ubuntu/Debian."

# ── Paquetes del sistema ────────────────────────────────────────────────────
log "Instalando paquetes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  ca-certificates curl gnupg git openssl tar \
  nginx ffmpeg ufw

# Node se instala desde NodeSource: el de Ubuntu 24.04 viene viejo para Vite 6.
if ! command -v node >/dev/null || [[ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt "$NODE_MAJOR" ]]; then
  log "Instalando Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi
log "Node $(node -v) · npm $(npm -v) · $(ffmpeg -version | head -1 | cut -d' ' -f1-3)"

# ── Usuario de servicio ─────────────────────────────────────────────────────
if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Creando usuario de servicio ${APP_USER}"
  useradd --system --no-create-home --shell /usr/sbin/nologin "$APP_USER"
fi

# ── Carpetas de datos ───────────────────────────────────────────────────────
log "Preparando carpetas de datos"
mkdir -p "$HLS_DIR" "$RECORDINGS_DIR/clips" "$CONF_DIR"
chown -R "${APP_USER}:${APP_USER}" "$DATA_DIR"
chmod 755 "$DATA_DIR" "$HLS_DIR"
chmod 700 "$CONF_DIR"

# Los segmentos se reescriben cada 4 s durante 6-8 horas seguidas. En disco eso
# es desgaste puro para datos que se borran solos a los 40 s: van en RAM.
if ! grep -q "^tmpfs ${HLS_DIR} " /etc/fstab; then
  log "Montando ${HLS_DIR} como tmpfs (${HLS_TMPFS_SIZE})"
  # uid/gid van en la linea de fstab a proposito: un chown despues de montar se
  # pierde en el proximo arranque y el servicio no podria escribir.
  printf 'tmpfs %s tmpfs rw,size=%s,mode=0755,uid=%s,gid=%s,noatime 0 0\n' \
    "$HLS_DIR" "$HLS_TMPFS_SIZE" "$(id -u "$APP_USER")" "$(id -g "$APP_USER")" >> /etc/fstab
  systemctl daemon-reload
fi
mountpoint -q "$HLS_DIR" || mount "$HLS_DIR"

# ── Claves ──────────────────────────────────────────────────────────────────
# Solo se generan la primera vez: si no, cada actualizacion cambiaria la clave
# del celular y la emision no arrancaria hasta reconfigurar Larix.
if [[ -f "$SECRETS_FILE" ]]; then
  log "Reutilizando las claves ya generadas (${SECRETS_FILE})"
  # shellcheck disable=SC1090
  source "$SECRETS_FILE"
else
  log "Generando claves"
  ADMIN_API_KEY="$(openssl rand -hex 32)"
  RTMP_PUBLISH_PASS="$(openssl rand -hex 16)"
  RTMP_INTERNAL_PASS="$(openssl rand -hex 16)"
  umask 077
  cat > "$SECRETS_FILE" <<EOF
# Generado por install.sh el $(date -Is). NO subir esto a git ni a WhatsApp.
ADMIN_API_KEY='${ADMIN_API_KEY}'
RTMP_PUBLISH_PASS='${RTMP_PUBLISH_PASS}'
RTMP_INTERNAL_PASS='${RTMP_INTERNAL_PASS}'
EOF
  umask 022
fi
chmod 600 "$SECRETS_FILE"

# ── Configuracion ───────────────────────────────────────────────────────────
log "Escribiendo ${ENV_FILE}"
cat > "$ENV_FILE" <<EOF
# Generado por deploy/install.sh — se reescribe en cada ejecucion.
# Las claves salen de ${SECRETS_FILE}.
APP_URL=https://${DOMAIN}
ADMIN_API_KEY=${ADMIN_API_KEY}

STREAM_SERVER_PORT=3001

# En produccion la fuente es siempre el celular publicando en MediaMTX.
STREAM_SOURCE=rtmp
# Las credenciales van como ?user=&pass=: con la forma "rtmp://usuario:clave@host"
# ffmpeg no las manda y MediaMTX rechaza la conexion. Verificado contra v1.20.0.
RTMP_INGEST_URL="rtmp://127.0.0.1:1935/live/gallera?user=interno&pass=${RTMP_INTERNAL_PASS}"
RTMP_RETRY_SECONDS=5

VIDEO_MAX_HEIGHT=720
VIDEO_BITRATE=2500k
VIDEO_BUFSIZE=5000k
VIDEO_BITRATE_480=1200k
VIDEO_BITRATE_360=700k

# Estas dos las sirve nginx directo desde disco; no las cambies sin tocar
# tambien deploy/nginx/lapresa.conf.
HLS_DIR=${HLS_DIR}
RECORDINGS_DIR=${RECORDINGS_DIR}
HLS_SEGMENT_SECONDS=4
HLS_LIST_SIZE=10
EOF
chown root:"$APP_USER" "$ENV_FILE"
chmod 640 "$ENV_FILE"

log "Escribiendo ${CONF_DIR}/mediamtx.yml"
sed -e "s|CAMBIAR-ESTA-CLAVE-POR-UNA-LARGA|${RTMP_PUBLISH_PASS}|" \
    -e "s|CAMBIAR-ESTA-TAMBIEN|${RTMP_INTERNAL_PASS}|" \
    "${APP_DIR}/mediamtx.yml" > "${CONF_DIR}/mediamtx.yml"
chown root:"$APP_USER" "${CONF_DIR}/mediamtx.yml"
chmod 640 "${CONF_DIR}/mediamtx.yml"

# ── MediaMTX ────────────────────────────────────────────────────────────────
if ! command -v mediamtx >/dev/null; then
  log "Descargando MediaMTX"
  MEDIAMTX_VERSION="${MEDIAMTX_VERSION:-$(curl -fsSL https://api.github.com/repos/bluenviron/mediamtx/releases/latest \
    | grep -o '"tag_name":[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)}"
  [[ -n "$MEDIAMTX_VERSION" ]] || die "No se pudo averiguar la version de MediaMTX. Reintenta o exporta MEDIAMTX_VERSION=v1.x.y"

  case "$(uname -m)" in
    x86_64)  MTX_ARCH="amd64" ;;
    aarch64) MTX_ARCH="arm64v8" ;;
    *)       die "Arquitectura no contemplada: $(uname -m)" ;;
  esac

  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  curl -fsSL -o "${TMP}/mediamtx.tar.gz" \
    "https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_${MTX_ARCH}.tar.gz"
  echo "  sha256: $(sha256sum "${TMP}/mediamtx.tar.gz" | cut -d' ' -f1)"
  tar -xzf "${TMP}/mediamtx.tar.gz" -C "$TMP" mediamtx
  install -m 0755 "${TMP}/mediamtx" /usr/local/bin/mediamtx
  log "MediaMTX ${MEDIAMTX_VERSION} instalado"
fi

# ── Compilacion ─────────────────────────────────────────────────────────────
log "Instalando dependencias y compilando"
cd "$APP_DIR"
npm ci --no-audit --no-fund
npm run build          # dist/ para nginx
npm run build:server   # server.js para systemd (sin tsx en produccion)
[[ -f "${APP_DIR}/server.js" ]] || die "No se genero server.js. Revisa 'npm run build:server'."

# ── systemd ─────────────────────────────────────────────────────────────────
log "Instalando servicios"
install -m 0644 "${SCRIPT_DIR}/lapresa.service"  /etc/systemd/system/lapresa.service
install -m 0644 "${SCRIPT_DIR}/mediamtx.service" /etc/systemd/system/mediamtx.service
systemctl daemon-reload
systemctl enable mediamtx.service lapresa.service >/dev/null
# Un arranque fallido no aborta la instalacion a proposito: mas vale terminar de
# configurar nginx y llegar al resumen (que explica como ver el registro) que
# dejar el servidor a medias justo cuando hay algo que diagnosticar.
systemctl restart mediamtx.service || warn "mediamtx no arranco — revisa: journalctl -u mediamtx -n 50"
systemctl restart lapresa.service  || warn "lapresa no arranco — revisa: journalctl -u lapresa -n 50"

# ── nginx ───────────────────────────────────────────────────────────────────
log "Configurando nginx para ${DOMAIN}"
sed "s|__DOMAIN__|${DOMAIN}|g" "${SCRIPT_DIR}/nginx/lapresa.conf" > /etc/nginx/sites-available/lapresa.conf
ln -sf /etc/nginx/sites-available/lapresa.conf /etc/nginx/sites-enabled/lapresa.conf
# El sitio por defecto responde en el mismo puerto 80 y gana por ser el primero.
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ── Cortafuegos ─────────────────────────────────────────────────────────────
log "Configurando el cortafuegos"
# OpenSSH primero y siempre: habilitar ufw sin esa regla deja el servidor
# inalcanzable y solo se recupera por la consola web del proveedor.
ufw allow OpenSSH        >/dev/null
ufw allow 80/tcp         >/dev/null
ufw allow 443/tcp        >/dev/null
ufw allow 1935/tcp       >/dev/null
ufw --force enable       >/dev/null
ufw status numbered | sed 's/^/    /'

# ── Resumen ─────────────────────────────────────────────────────────────────
cat <<EOF

════════════════════════════════════════════════════════════════════════
  Instalacion terminada.

  Servicios:   systemctl status lapresa mediamtx nginx
  Registros:   journalctl -u lapresa -f

  Para el celular (Larix Broadcaster), URL de publicacion:
      rtmp://${DOMAIN}:1935/live/gallera?user=gallera&pass=${RTMP_PUBLISH_PASS}

  Las credenciales van EN LA URL como se ve arriba. Si Larix trae campos
  aparte de usuario y clave, dejalos vacios: MediaMTX espera los parametros.

  Clave de administrador del panel web:
      ${ADMIN_API_KEY}

  Ambas quedaron guardadas en ${SECRETS_FILE} (solo root).

  FALTA TODAVIA:
   1. Apuntar el DNS de ${DOMAIN} a la IP de este servidor.
   2. Certificado TLS, una vez el DNS resuelva:
          apt install -y certbot python3-certbot-nginx
          certbot --nginx -d ${DOMAIN}
      Larix debe publicar por rtmps una vez haya certificado.
   3. Restringir el 1935 a la IP de la gallera cuando se conozca:
          ufw delete allow 1935/tcp
          ufw allow from <IP-DE-LA-GALLERA> to any port 1935 proto tcp
   4. Conectar la CDN apuntando su origen a https://${DOMAIN}/live/
      Sin CDN este servidor NO aguanta 1.500 espectadores.
════════════════════════════════════════════════════════════════════════
EOF
