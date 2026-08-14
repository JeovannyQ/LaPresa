# Despliegue de La Presa

Servidor de origen sobre **Ubuntu 24.04**. Estos archivos se escriben en local y
se ejecutan en el VPS; en Windows no corren (no hay systemd).

## Qué monta

```
  Celular (Larix) ──rtmp──> MediaMTX :1935
                                │
                                │ 127.0.0.1 (nunca sale a internet)
                                v
                          server.js + ffmpeg  ──> 3 calidades HLS
                                │                  /var/lib/lapresa/live  (tmpfs)
                                │                     │
                                │                     v
                                │                  nginx  ──> CDN ──> espectadores
                                v
                          grabaciones mp4
                          /var/lib/lapresa/recordings  (15 días)
```

| Archivo | Qué hace |
|---|---|
| `install.sh` | Instalación completa desde cero. Idempotente. |
| `lapresa.service` | La API + ffmpeg, como usuario `lapresa`, sin privilegios. |
| `mediamtx.service` | La ingesta RTMP del celular. |
| `nginx/lapresa.conf` | Sirve `dist/`, hace de proxy al `/api/` y **sirve el HLS directo desde disco**. |

## Instalación

```bash
git clone https://github.com/JeovannyQ/LaPresa.git /opt/lapresa
sudo bash /opt/lapresa/deploy/install.sh lapresa.tudominio.com
```

El script genera solo las tres claves (admin, publicación RTMP e interna), las
guarda en `/etc/lapresa/claves-generadas.txt` con permisos de root y las imprime
al terminar. **Al volver a correrlo no las regenera**, para que actualizar el
código no obligue a reconfigurar el celular.

## Actualizar el código

```bash
cd /opt/lapresa && git pull
sudo bash deploy/install.sh lapresa.tudominio.com
```

Recompila `dist/` y `server.js` y reinicia el servicio. La configuración y las
claves se conservan.

## Lo que el script deja pendiente a propósito

1. **DNS** apuntando a la IP del servidor.
2. **TLS** — requiere que el DNS ya resuelva:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d lapresa.tudominio.com
   ```
3. **Cerrar el 1935 a la IP de la gallera** cuando se conozca. Mientras esté
   abierto al mundo, la única defensa es la clave de publicación.
4. **La CDN.** Sin ella este servidor no aguanta 1.500 espectadores: el origen
   está dimensionado para alimentar a la CDN, no al público. Origen de la CDN =
   `https://lapresa.tudominio.com/live/`.

## Decisiones que conviene no deshacer sin pensarlo

**El HLS lo sirve nginx, no Node.** Antes lo servía Express con `no-store`, o sea
que cada espectador pegaba contra Node cada 4 segundos y nada se podía cachear.
Los `max-age` del `.m3u8` (2 s) y del `.ts` (60 s) son lo que permite a la CDN
colapsar miles de peticiones simultáneas en una sola al origen.

**Los segmentos van en tmpfs (RAM).** Se reescriben cada 4 segundos durante 6–8
horas y se borran solos a los 40 s: en disco es puro desgaste. Ocupan ~25 MB.

**Los `.ts` no se cachean "para siempre".** Los nombres `seg_00001.ts` se
reinician en cada emisión; con un TTL largo la CDN serviría video de la jornada
anterior.

**En producción no se usa `tsx`.** `npm run build:server` empaqueta `server.ts` a
`server.js` con esbuild y systemd corre `node server.js`, sin depender de
devDependencies.

## Diagnóstico

```bash
systemctl status lapresa mediamtx nginx
journalctl -u lapresa -f              # incluye la línea de comando de ffmpeg
curl -s localhost:3001/api/health
ls -la /var/lib/lapresa/live/         # con la emisión activa: master.m3u8 + 3 carpetas
```

Si el estado se queda en `starting` con `waitingForPublisher`, el servidor está
bien y lo que falta es que el celular publique: es el comportamiento esperado.
