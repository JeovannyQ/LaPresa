# Decisión de VPS para transmisión propia

Fecha: 2026-08-08

## Plan preseleccionado

**Contabo Core VPS 8**:

- 8 vCPU
- 24 GB RAM
- 300 GB SSD
- Puerto de 600 Mbit/s
- Tráfico anunciado como ilimitado

## Decisión

El plan es **apto como servidor de origen** para La Presa. Ejecutará Ubuntu,
Nginx/RTMP, FFmpeg, la API, el reproductor HLS y el almacenamiento temporal de
grabaciones y clips.

No se debe usar para entregar video directamente a 1,300--1,500 espectadores.
La entrega pública será mediante una CDN. El puerto de 600 Mbit/s será suficiente
entre el origen y la CDN, pero no para servir a todos los espectadores sin CDN.

## Selecciones al contratar

1. Ubuntu 24.04 LTS.
2. Centro de datos US East/Miami, o el más cercano disponible a República
   Dominicana.
3. IPv4 pública.
4. NVMe si aparece como opción a un costo razonable; SSD es aceptable para la
   primera etapa.
5. Activar firewall del proveedor y snapshots. Las grabaciones importantes se
   respaldarán fuera de la VPS.

## Configuración posterior

- Abrir 80/tcp y 443/tcp al público.
- Abrir 1935/tcp solo para la fuente de emisión, idealmente restringido a la IP
  del lugar de transmisión.
- Mantener 22/tcp restringido a las IP de administración.
- Crear `ADMIN_API_KEY` de al menos 32 caracteres y no guardarla en Git.
- Instalar Nginx con RTMP, FFmpeg, Node.js, certificado TLS y monitoreo.
- Conectar la CDN al origen HLS antes de la primera emisión pública.

## Regla de capacidad

La señal inicial será 720p a aproximadamente 3 Mbit/s. Con 1,500 espectadores,
la CDN deberá absorber alrededor de 4.5 Gbit/s de salida. La VPS solo recibirá la
señal del codificador y atenderá a la CDN.
