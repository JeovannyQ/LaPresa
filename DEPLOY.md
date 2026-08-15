# Despliegue de La Presa (Dokploy + Docker Compose)

Sustituye al despliegue con systemd/nginx sobre Ubuntu que vivía en `deploy/`.
El motivo del cambio: el buildpack de Railpack no puede instalar **ffmpeg** ni
levantar un **segundo servicio** (MediaMTX) ni abrir un **puerto TCP no-HTTP**
(el 1935), y las tres cosas son imprescindibles para transmitir.

## Arquitectura

```
  Celular (Larix) ──rtmp://IP:1935──> mediamtx
                                         │  red interna 172.28.0.0/16
                                         │  (no sale a internet)
                                         v
                                  app: server.js + ffmpeg
                                         │
                                    3 calidades HLS ──> /app/hls (tmpfs, RAM)
                                         │
                                         ├─> /live/*  ── Traefik ──> espectadores
                                         └─> grabaciones mp4
                                             /app/recordings (volumen, 15 días)
```

| Archivo | Qué hace |
|---|---|
| `docker-compose.yml` | Los dos servicios, la red, el volumen y el tmpfs. |
| `Dockerfile` | Imagen de la app: build multi-etapa + ffmpeg, corre como usuario `node`. |
| `mediamtx.yml` | Ingesta RTMP. Las claves llegan por entorno, no están aquí. |
| `.dockerignore` | Evita que `node_modules` de Windows contamine el build ARM. |

## Puesta en marcha

### 1. Generar las tres claves

```bash
echo "ADMIN_API_KEY=$(openssl rand -hex 32)"; echo "RTMP_PUBLISH_PASS=$(openssl rand -hex 16)"; echo "RTMP_INTERNAL_PASS=$(openssl rand -hex 16)"
```

Guárdalas: `RTMP_PUBLISH_PASS` es la que se configura en el celular y no debe
cambiar sin reconfigurar Larix.

### 2. Dokploy

Crear un servicio de tipo **Compose** apuntando al repositorio, y en
**Environment** pegar:

```
ADMIN_API_KEY=...
RTMP_PUBLISH_PASS=...
RTMP_INTERNAL_PASS=...
APP_URL=https://lapresa.quitech.com.do
```

En **Domains**: dominio `lapresa.quitech.com.do` → servicio `app`, puerto `3001`,
HTTPS activado. Dokploy inyecta las etiquetas de Traefik y resuelve el certificado.

El compose falla al arrancar si falta cualquiera de las tres claves — es
deliberado, para que nunca quede el canal abierto por una variable olvidada.

### 3. Abrir el 1935 en Oracle Cloud

Son **dos** cortafuegos y hay que tocar los dos. Es el tropiezo clásico en Oracle:
se abre la VCN, no funciona, y el motivo es que la imagen de Ubuntu trae sus
propias reglas de iptables.

1. **VCN → Security List → Ingress Rule:** origen `0.0.0.0/0`, TCP, puerto 1935.
2. **En la máquina:**

```bash
sudo iptables -I INPUT 6 -p tcp --dport 1935 -j ACCEPT && sudo netfilter-persistent save
```

Comprobar desde fuera:

```bash
nc -vz lapresa.quitech.com.do 1935
```

### 4. Configurar el celular (Larix Broadcaster)

| Campo | Valor |
|---|---|
| URL | `rtmp://<IP-del-servidor>:1935/live` |
| Stream name / key | `gallera` |
| Usuario | `gallera` |
| Contraseña | el `RTMP_PUBLISH_PASS` |
| Resolución | 1280x720 |
| Bitrate | 2500 kbps |
| Keyframe interval | 2 s |

## Verificación

```bash
curl -s https://lapresa.quitech.com.do/api/health
```

Tiene que responder **`"ffmpegInstalled": true`**. Si dice `false`, la imagen no
se construyó desde este `Dockerfile` y no habrá emisión: es la comprobación que
delataba el despliegue anterior.

Después, con el celular publicando:

```bash
curl -s https://lapresa.quitech.com.do/api/stream/status
curl -sI https://lapresa.quitech.com.do/live/master.m3u8   # 200 + application/vnd.apple.mpegurl
docker compose logs -f app                                  # incluye la línea de ffmpeg
```

Si el estado se queda en `starting` con `waitingForPublisher: true`, el servidor
está bien y lo que falta es que el celular publique. Es el comportamiento esperado:
el operador puede pulsar "iniciar" antes de que el celular esté listo.

Sin emisión activa, `/live/master.m3u8` devuelve **404**. Antes devolvía `index.html`
con un 200 y el reproductor fallaba con un error que no tenía que ver con la causa.

## Decisiones que conviene no deshacer sin pensarlo

**Las cabeceras de caché del HLS.** El `.m3u8` va con `max-age=2` y los `.ts` con
`max-age=60`. Con el `no-store` que había antes, cada espectador pegaba contra Node
cada 4 segundos y nada era cacheable — eso es justo lo que impide poner una CDN
delante. Los `.ts` deliberadamente **no** se cachean "para siempre": los nombres
`seg_00001.ts` se reinician en cada emisión y un TTL largo serviría video de la
jornada anterior.

**Ahora el HLS lo sirve Node, no nginx.** Es el precio de simplificar a contenedor.
Con decenas de espectadores no se nota; con cientos de concurrentes, Node se satura
antes que ffmpeg, y ahí toca meter una CDN con origen en `/live/`. El proyecto está
dimensionado para alimentar a la CDN, no al público directamente.

**Los segmentos van en tmpfs (RAM).** Se reescriben cada 4 s durante 6-8 horas y se
borran solos a los 40 s: en disco es desgaste puro, y el boot volume de Oracle tiene
IOPS limitadas. Ocupan ~25 MB.

**La subred `172.28.0.0/16` está fijada.** `mediamtx.yml` restringe el usuario
`interno` a ese rango. Si se cambia en el compose hay que cambiarlo allí también o
ffmpeg deja de poder leer la señal.

**En producción no se usa `tsx`.** `npm run build` empaqueta `server.ts` a
`server.js` con esbuild y el contenedor corre `node server.js`, sin depender de
devDependencies.

## Grabaciones

Viven en el volumen `recordings` y sobreviven a los redespliegues. Copia de
seguridad:

```bash
docker run --rm -v lapresa_recordings:/datos -v "$PWD":/backup alpine tar czf /backup/grabaciones.tar.gz -C /datos .
```

## Pendiente a propósito

1. **Restringir el 1935 a la IP de la gallera** cuando se conozca. Mientras esté
   abierto al mundo, la única defensa es `RTMP_PUBLISH_PASS`.
2. **La CDN**, si el aforo pasa de unos cientos de concurrentes. Origen:
   `https://lapresa.quitech.com.do/live/`. Ojo con el plan gratuito de Cloudflare:
   sus condiciones no permiten servir video por proxy.
3. **Vigilar el egress.** A 2,5 Mbps cada espectador consume ~1,1 GB/hora. Con los
   10 TB/mes gratuitos de Oracle son ~14 eventos de 6 h con 100 concurrentes.
