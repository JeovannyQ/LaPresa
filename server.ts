import express, { Request, Response } from 'express';
import { spawn, ChildProcess, execSync, execFileSync } from 'child_process';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// El paquete es "type": "module", asi que __dirname no existe. Se reconstruye
// desde import.meta.url para poder servir ./dist.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ─── Configuration ───────────────────────────────────────────────────────────
// PORT lo inyectan las plataformas tipo Dokploy/Railpack; STREAM_SERVER_PORT es
// el que fija el systemd del VPS y tiene prioridad para no cambiar ese despliegue.
const PORT = parseInt(process.env.STREAM_SERVER_PORT || process.env.PORT || '3001', 10);
let STREAM_SOURCE = process.env.STREAM_SOURCE || 'dshow';
let STREAM_SOURCE_URL = process.env.STREAM_SOURCE_URL || '';
let DSHOW_VIDEO_DEVICE = process.env.DSHOW_VIDEO_DEVICE || '';
let DSHOW_AUDIO_DEVICE = process.env.DSHOW_AUDIO_DEVICE || '';
const RECORDINGS_DIR = path.resolve(process.env.RECORDINGS_DIR || './recordings');
// Las jornadas las escribe MediaMTX, no esta app (ver mediamtx.yml). Aquí solo
// se listan y se sirven: los archivos son de root y el proceso corre como node,
// así que borrarlos no es cosa nuestra —de la retención se encarga MediaMTX—.
const JORNADAS_DIR = path.join(RECORDINGS_DIR, 'jornadas');
const HLS_DIR = path.resolve(process.env.HLS_DIR || './hls');
const HLS_SEGMENT_SECONDS = Math.max(2, parseInt(process.env.HLS_SEGMENT_SECONDS || '4', 10));
const HLS_LIST_SIZE = Math.max(3, parseInt(process.env.HLS_LIST_SIZE || '10', 10));
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';
const RECORDINGS_MAX_AGE_DAYS = 15; // Retención de 15 días según requerimiento del cliente

// URL interna desde la que ffmpeg consume la señal que el celular publica en MediaMTX.
// El celular NUNCA habla con este servidor: publica contra MediaMTX (puerto 1935).
const RTMP_INGEST_URL = process.env.RTMP_INGEST_URL || 'rtmp://127.0.0.1:1935/live/gallera';
// Cada cuánto se reintenta mientras el celular todavía no publica o se cayó la señal.
const RTMP_RETRY_SECONDS = Math.max(2, parseInt(process.env.RTMP_RETRY_SECONDS || '5', 10));

// Calidad de salida. 720p es el techo acordado con el cliente: a 1080p el consumo
// de ancho de banda casi se duplica y en celular (donde ve la mayoría) no se nota.
const VIDEO_MAX_HEIGHT = Math.max(240, parseInt(process.env.VIDEO_MAX_HEIGHT || '720', 10));
const VIDEO_BITRATE = process.env.VIDEO_BITRATE || '2500k';
const VIDEO_BUFSIZE = process.env.VIDEO_BUFSIZE || '5000k';

// Escalones de calidad que se generan en paralelo. El reproductor (hls.js) elige
// solo según el ancho de banda de cada espectador y va cambiando en caliente.
interface Rendition {
  name: string;      // nombre de la carpeta y de la variante en el master
  height: number;
  bitrate: string;
  bufsize: string;
}
const LADDER: Rendition[] = [
  { name: `${VIDEO_MAX_HEIGHT}p`, height: VIDEO_MAX_HEIGHT, bitrate: VIDEO_BITRATE, bufsize: VIDEO_BUFSIZE },
  { name: '480p', height: 480, bitrate: process.env.VIDEO_BITRATE_480 || '1200k', bufsize: '2400k' },
  { name: '360p', height: 360, bitrate: process.env.VIDEO_BITRATE_360 || '700k', bufsize: '1400k' },
];

// Playlist maestro que apunta a los tres escalones: es lo que consume la web.
const MASTER_PLAYLIST_NAME = 'master.m3u8';
const HLS_URL = `/live/${MASTER_PLAYLIST_NAME}`;

// ─── State ───────────────────────────────────────────────────────────────────
let ffmpegProcess: ChildProcess | null = null;
let streamStartTime: Date | null = null;
let streamStatus: 'idle' | 'starting' | 'live' | 'stopping' | 'error' = 'idle';
let streamError: string | null = null;
// Con fuente RTMP el proceso se relanza solo hasta que el celular publique.
let keepStreaming = false;
let waitingForPublisher = false;
let rtmpRetryTimer: NodeJS.Timeout | null = null;

// Últimas líneas de diagnóstico de ffmpeg del intento en curso. Sin esto un
// "exited code 1" no dice nada: ffmpeg explica el motivo por stderr y antes se
// descartaba entero, así que un fallo de grabación era imposible de investigar
// después de ocurrido.
const FFMPEG_TAIL_LINES = 25;
let ffmpegStderrTail: string[] = [];
// Con RTMP el proceso se relanza cada RTMP_RETRY_SECONDS mientras nadie publica,
// y cada intento repite el mismo error. Volcarlo siempre llenaría el log de
// Docker con miles de líneas idénticas al día y enterraría lo que sí importa.
let lastFailureSignature = '';
let repeatedFailures = 0;

// Live Chat State (in-memory)
interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  isVIP?: boolean;
}
// Arranca vacio a proposito. Antes venia con tres mensajes de ejemplo que el
// visitante leia como comentarios de gente real que no estaba ahi.
const chatMessages: ChatMessage[] = [];

// Ensure directories exist
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
if (!fs.existsSync(HLS_DIR)) {
  fs.mkdirSync(HLS_DIR, { recursive: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimestamp(): string {
  const now = new Date();
  return now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
}

function ffmpegPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function requireAdmin(req: Request, res: Response, next: () => void): void {
  if (!ADMIN_API_KEY) {
    res.status(503).json({ error: 'ADMIN_API_KEY is not configured on the server.' });
    return;
  }

  const suppliedKey = req.get('x-admin-key') || '';
  const expected = Buffer.from(ADMIN_API_KEY);
  const supplied = Buffer.from(suppliedKey);
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    res.status(401).json({ error: 'Administrator authentication is required.' });
    return;
  }
  next();
}

/**
 * Borra de una carpeta lo que pase de la retencion, pero SOLO las extensiones
 * que genera la propia aplicacion.
 *
 * El filtro no es decorativo: sin el, la purga arrasa con cualquier archivo que
 * haya caido en la carpeta. En la primera prueba real se llevo por delante un
 * package.json que alguien habia dejado suelto en recordings/. Corre sin
 * vigilancia al arrancar y cada 12 horas, asi que un borrado equivocado aqui no
 * lo ve nadie hasta que se echa de menos el archivo.
 */
function purgeOldFiles(dir: string, extensions: string[], label: string): void {
  if (!fs.existsSync(dir)) return;

  const maxAge = RECORDINGS_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const file of fs.readdirSync(dir)) {
    if (!extensions.includes(path.extname(file).toLowerCase())) continue;

    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    if (now - stat.mtimeMs > maxAge) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ ${label} borrado (>${RECORDINGS_MAX_AGE_DAYS} dias): ${file}`);
    }
  }
}

function cleanOldRecordings(): void {
  try {
    // La raiz de recordings/ ya no recibe nada: las jornadas las escribe
    // MediaMTX en jornadas/ y se encarga el mismo de su retencion con
    // recordDeleteAfter. Esta pasada solo barre los stream_<fecha>.mp4 que
    // dejo la grabacion vieja de ffmpeg, y por eso no entra en jornadas/.
    purgeOldFiles(RECORDINGS_DIR, ['.mp4'], 'Resto de la grabacion vieja');
  } catch (err) {
    console.error('Error cleaning old recordings:', err);
  }
}

function checkFFmpeg(): boolean {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tapa user/pass antes de devolver una URL RTMP al panel. La URL de ingesta lleva
 * la clave interna en el query string y /api/stream/config la devolvía entera:
 * acababa en la consola del navegador y en cualquier captura de pantalla o de red
 * que hiciera el operador para pedir soporte.
 */
function redactCredentials(url: string): string {
  return url.replace(/([?&](?:user|pass)=)[^&]*/gi, '$1***');
}

function listDshowDevices(): string {
  try {
    const result = execSync('ffmpeg -list_devices true -f dshow -i dummy 2>&1', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result;
  } catch (err: any) {
    return err?.stderr || err?.stdout || 'Could not list devices';
  }
}

function buildFFmpegArgs(): string[] {
  // Sin esto cada arranque escupe la versión y la línea de "configuration" de
  // ffmpeg, que sola pasa de 1.500 caracteres. Con el reintento cada 5 s eso
  // sepulta los mensajes de error en el log.
  const args: string[] = ['-hide_banner'];
  let videoMap = '0:v';
  let audioMap = '0:a';

  switch (STREAM_SOURCE) {
    case 'dshow': {
      const videoDevice = DSHOW_VIDEO_DEVICE || 'video=Integrated Camera';
      const audioDevice = DSHOW_AUDIO_DEVICE || 'audio=Microphone';
      args.push(
        '-f', 'dshow',
        '-video_size', '1280x720',
        '-framerate', '30',
        '-i', `${videoDevice}:${audioDevice}`
      );
      break;
    }
    case 'rtsp': {
      if (!STREAM_SOURCE_URL) throw new Error('STREAM_SOURCE_URL is required for RTSP source');
      args.push('-rtsp_transport', 'tcp', '-i', STREAM_SOURCE_URL);
      break;
    }
    case 'rtmp': {
      // El celular (Larix Broadcaster) publica contra MediaMTX en el puerto 1935;
      // aquí solo consumimos esa señal ya publicada.
      args.push('-thread_queue_size', '512', '-i', RTMP_INGEST_URL);
      break;
    }
    case 'file': {
      if (!STREAM_SOURCE_URL) throw new Error('STREAM_SOURCE_URL is required for file source');
      args.push('-re', '-stream_loop', '-1', '-i', STREAM_SOURCE_URL);
      break;
    }
    case 'test':
    default: {
      videoMap = '0:v';
      audioMap = '1:a';
      args.push(
        '-re', '-f', 'lavfi', '-i', 'testsrc2=size=1280x720:rate=30',
        '-re', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100'
      );
      break;
    }
  }

  // ── Salida unica: HLS multicalidad (ABR) ──────────────────────────────────
  // Una sola calidad obligaría a todo el mundo a 2.5 Mbps: quien tenga mala
  // señal se congela en vez de bajar de calidad, y el consumo de ancho de banda
  // (que es la factura) se dispara. El reproductor elige el escalón solo.
  //
  // El scale con min(alto,ih) evita AGRANDAR: si el celular manda 480p, el
  // escalón de 720p sale en 480p en vez de inventar píxeles y gastar de más.
  const splitLabels = LADDER.map((_, i) => `[v${i}]`).join('');
  const filters = [`[${videoMap}]split=${LADDER.length}${splitLabels}`];
  LADDER.forEach((rung, i) => {
    // trunc(ih/2)*2 fuerza alto par: libx264 con yuv420p rechaza dimensiones
    // impares, y sin esto una fuente de alto impar reventaría al arrancar.
    filters.push(`[v${i}]scale=-2:'min(${rung.height},trunc(ih/2)*2)'[v${i}out]`);
  });
  args.push('-filter_complex', filters.join(';'));

  LADDER.forEach((rung, i) => {
    args.push(
      '-map', `[v${i}out]`,
      `-c:v:${i}`, 'libx264',
      `-b:v:${i}`, rung.bitrate,
      `-maxrate:v:${i}`, rung.bitrate,
      `-bufsize:v:${i}`, rung.bufsize
    );
  });
  // -sc_threshold 0 + GOP fijo: sin esto cada calidad corta los segmentos en
  // momentos distintos y el reproductor no puede saltar de una a otra sin salto.
  args.push('-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', '60', '-keyint_min', '60', '-sc_threshold', '0');

  LADDER.forEach(() => args.push('-map', audioMap));
  args.push('-c:a', 'aac', '-b:a', '128k', '-ar', '44100');

  const varStreamMap = LADDER.map((rung, i) => `v:${i},a:${i},name:${rung.name}`).join(' ');
  args.push(
    '-f', 'hls',
    '-hls_time', String(HLS_SEGMENT_SECONDS),
    '-hls_list_size', String(HLS_LIST_SIZE),
    '-hls_flags', 'delete_segments+append_list',
    '-hls_segment_filename', ffmpegPath(path.join(HLS_DIR, '%v', 'seg_%05d.ts')),
    '-master_pl_name', MASTER_PLAYLIST_NAME,
    '-var_stream_map', varStreamMap,
    ffmpegPath(path.join(HLS_DIR, '%v', 'stream.m3u8'))
  );

  return args;
}

/**
 * Lanza ffmpeg y lo deja bajo vigilancia. Con fuente RTMP el proceso muere en
 * cuanto el celular deja de publicar (o si todavía no ha empezado), así que se
 * relanza solo cada RTMP_RETRY_SECONDS hasta que el operador dé "detener".
 * Así el operador puede pulsar "iniciar" antes de que el celular esté listo, y
 * una caída de datos a mitad de jornada se recupera sin que nadie intervenga.
 */
function spawnFFmpeg(): void {
  // ffmpeg no crea las carpetas de cada variante: si no existen, aborta con
  // "No such file or directory" apenas arranca.
  for (const rung of LADDER) {
    const dir = path.join(HLS_DIR, rung.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  const args = buildFFmpegArgs();
  // Redactado: la URL de ingesta lleva la clave interna en el query string, y
  // esta línea se imprime en cada arranque —cada 5 s mientras nadie publica—.
  // Sin esto la clave queda escrita miles de veces en el log de Docker, que
  // cualquiera con acceso al VPS puede leer y que además se copia al pedir
  // soporte.
  console.log('\n🎬 Starting FFmpeg:', redactCredentials(['ffmpeg', ...args].join(' ')));

  const proc = spawn('ffmpeg', args, { cwd: RECORDINGS_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
  ffmpegProcess = proc;
  ffmpegStderrTail = [];

  // ffmpeg no escribe en límites de línea: un bloque puede cortar un mensaje por
  // la mitad y continuarlo en el siguiente. Sin reensamblarlos, el MISMO error
  // salía repartido de forma distinta en cada intento y la firma de abajo no
  // coincidía nunca, así que el anti-repetición no servía de nada.
  let stderrCarry = '';

  const handleStderrLine = (raw: string): void => {
    const line = raw.trim();
    if (!line) return;

    // Las líneas de progreso son el latido: con RTMP son la única prueba de que
    // están llegando cuadros de verdad, no solo de que el proceso arrancó.
    if (line.startsWith('frame=') || line.includes('speed=')) {
      waitingForPublisher = false;
      if (streamStatus === 'starting') {
        streamStatus = 'live';
        streamStartTime = new Date();
        console.log('🔴 Stream is LIVE!');
      }
      return;
    }

    const clean = redactCredentials(line);
    ffmpegStderrTail.push(clean);
    if (ffmpegStderrTail.length > FFMPEG_TAIL_LINES) ffmpegStderrTail.shift();

    // Ya emitiendo, cualquier aviso de ffmpeg es raro y vale la pena verlo en el
    // momento. Mientras se espera al celular no: ahí el ruido es constante y el
    // volcado se hace una sola vez al cerrar (ver 'close').
    if (!waitingForPublisher) console.error('   ffmpeg │', clean);
  };

  proc.stderr?.on('data', (data: Buffer) => {
    // El progreso se separa con \r y los mensajes con \n: se cortan los tres casos.
    const parts = (stderrCarry + data.toString()).split(/\r\n|\r|\n/);
    // El último trozo puede ser una línea a medias; se guarda para el siguiente
    // bloque en vez de tratarlo como si estuviera completa.
    stderrCarry = parts.pop() ?? '';
    for (const raw of parts) handleStderrLine(raw);
  });

  // Sin este manejador, un fallo al lanzar el proceso (ffmpeg ausente, permisos)
  // emite un 'error' sin escuchar y tumba el servidor completo.
  proc.on('error', (err: Error) => {
    console.error(`❌ No se pudo lanzar ffmpeg: ${err.message}`);
    streamError = err.message;
    keepStreaming = false;
  });

  proc.on('close', (code: number | null) => {
    // Lo que quedó sin salto de línea al morir el proceso. Suele ser justo el
    // último mensaje de error, que es el que más falta hace.
    if (stderrCarry) {
      handleStderrLine(stderrCarry);
      stderrCarry = '';
    }
    console.log(`⏹️ FFmpeg exited code ${code}`);
    ffmpegProcess = null;

    // El motivo de la salida. Se compara con el intento anterior para no repetir
    // el mismo volcado cada 5 s: la primera vez se explica entero, y a partir de
    // ahí solo se recuerda de tanto en tanto que sigue fallando igual.
    if (code !== 0 && ffmpegStderrTail.length > 0) {
      // Las direcciones de memoria que ffmpeg mete en cada etiqueta —"[in#0 @
      // 00000238da27e500]"— cambian en cada arranque. Sin borrarlas, dos fallos
      // idénticos nunca dan la misma firma y el anti-repetición no sirve de nada.
      const signature = ffmpegStderrTail.slice(-3).join(' ┃ ').replace(/@ *(0x)?[0-9a-f]{6,}/gi, '@ …');
      if (signature !== lastFailureSignature) {
        lastFailureSignature = signature;
        repeatedFailures = 0;
        console.error('   ── ffmpeg salió con error. Últimas líneas: ──');
        for (const line of ffmpegStderrTail) console.error('   │', line);
        console.error('   ────────────────────────────────────────────');
      } else if (++repeatedFailures % 60 === 0) {
        console.error(`   (el mismo fallo de ffmpeg se repite; ${repeatedFailures} veces ya) ${signature}`);
      }
    } else if (code === 0) {
      lastFailureSignature = '';
      repeatedFailures = 0;
    }

    if (keepStreaming && STREAM_SOURCE === 'rtmp') {
      waitingForPublisher = true;
      streamStatus = 'starting';
      streamStartTime = null;
      console.log(`📡 Sin señal en ${redactCredentials(RTMP_INGEST_URL)}. Reintento en ${RTMP_RETRY_SECONDS}s...`);
      rtmpRetryTimer = setTimeout(() => {
        rtmpRetryTimer = null;
        if (keepStreaming) spawnFFmpeg();
      }, RTMP_RETRY_SECONDS * 1000);
      return;
    }

    streamStatus = streamStatus === 'stopping' ? 'idle' : 'error';
    streamStartTime = null;
    keepStreaming = false;
  });

  // Las fuentes locales (webcam, archivo, patrón de prueba) arrancan siempre, así
  // que a los 8 s se dan por vivas aunque no se haya leído un "frame=". Con RTMP
  // eso sería mentira: ahí solo se marca LIVE cuando llegan cuadros de verdad.
  if (STREAM_SOURCE !== 'rtmp') {
    setTimeout(() => {
      if (streamStatus === 'starting') {
        streamStatus = 'live';
        streamStartTime = new Date();
      }
    }, 8000);
  }
}

// ─── API Routes ──────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    ffmpegInstalled: checkFFmpeg(),
    streamSource: STREAM_SOURCE,
    recordingsDir: RECORDINGS_DIR,
    maxAgeDays: RECORDINGS_MAX_AGE_DAYS,
  });
});

// Stream Status & Config
app.get('/api/stream/status', (_req: Request, res: Response) => {
  const duration = streamStartTime
    ? Math.floor((Date.now() - streamStartTime.getTime()) / 1000)
    : 0;

  res.json({
    status: streamStatus,
    startTime: streamStartTime?.toISOString() || null,
    durationSeconds: duration,
    error: streamError,
    streamSource: STREAM_SOURCE,
    // La URL de publicación NO va aquí: este endpoint es público y quien la
    // conozca podría publicar en el canal. Solo se expone en /api/stream/config.
    waitingForPublisher,
    hlsUrl: HLS_URL,
  });
});

app.get('/api/stream/config', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    streamSource: STREAM_SOURCE,
    streamSourceUrl: STREAM_SOURCE_URL,
    dshowVideoDevice: DSHOW_VIDEO_DEVICE,
    dshowAudioDevice: DSHOW_AUDIO_DEVICE,
    rtmpIngestUrl: redactCredentials(RTMP_INGEST_URL),
    videoMaxHeight: VIDEO_MAX_HEIGHT,
    videoBitrate: VIDEO_BITRATE,
    hlsUrl: HLS_URL,
  });
});

app.post('/api/stream/config', requireAdmin, (req: Request, res: Response) => {
  const { streamSource, streamSourceUrl, dshowVideoDevice, dshowAudioDevice } = req.body;

  if (streamSource !== undefined) {
    if (!['dshow', 'rtsp', 'rtmp', 'file', 'test'].includes(streamSource)) {
      res.status(400).json({ error: 'Invalid stream source.' });
      return;
    }
    STREAM_SOURCE = streamSource;
  }
  if (streamSourceUrl !== undefined) STREAM_SOURCE_URL = streamSourceUrl;
  if (dshowVideoDevice !== undefined) DSHOW_VIDEO_DEVICE = dshowVideoDevice;
  if (dshowAudioDevice !== undefined) DSHOW_AUDIO_DEVICE = dshowAudioDevice;

  res.json({
    message: 'Configuración actualizada',
    streamSource: STREAM_SOURCE,
    hlsUrl: HLS_URL,
  });
});

// Start Stream
app.post('/api/stream/start', requireAdmin, (_req: Request, res: Response) => {
  if (streamStatus === 'live' || streamStatus === 'starting') {
    res.status(409).json({ error: 'Stream is already active', status: streamStatus });
    return;
  }

  if (!checkFFmpeg()) {
    res.status(500).json({ error: 'FFmpeg is not installed or not found in PATH.' });
    return;
  }

  try {
    streamStatus = 'starting';
    streamError = null;
    keepStreaming = true;
    waitingForPublisher = STREAM_SOURCE === 'rtmp';

    spawnFFmpeg();

    res.json({
      message: STREAM_SOURCE === 'rtmp'
        ? 'Esperando la señal del celular...'
        : 'Transmisión iniciada',
      status: 'starting',
      waitingForPublisher,
    });
  } catch (err: any) {
    keepStreaming = false;
    streamStatus = 'error';
    streamError = err.message;
    res.status(500).json({ error: err.message });
  }
});

// Stop Stream
app.post('/api/stream/stop', requireAdmin, (_req: Request, res: Response) => {

  // Si estábamos esperando que el celular publicara no hay proceso que matar,
  // solo un temporizador de reintento que cancelar.
  const wasWaitingForPublisher = keepStreaming && !ffmpegProcess;
  keepStreaming = false;
  waitingForPublisher = false;
  if (rtmpRetryTimer) {
    clearTimeout(rtmpRetryTimer);
    rtmpRetryTimer = null;
  }

  if (wasWaitingForPublisher) {
    streamStatus = 'idle';
    streamStartTime = null;
    res.json({ message: 'Se dejó de esperar la señal del celular', status: 'idle' });
    return;
  }

  if (!ffmpegProcess) {
    res.status(400).json({ error: 'No active stream', status: streamStatus });
    return;
  }

  streamStatus = 'stopping';
  if (ffmpegProcess.stdin) {
    ffmpegProcess.stdin.write('q');
    ffmpegProcess.stdin.end();
  }

  res.json({ message: 'Deteniendo transmisión...', status: 'stopping' });
});

// ─── Historial de jornadas ───────────────────────────────────────────────────
// Lo que la ficha técnica muestra como "Historial de jugadas": una fila por
// noche, con su duración y su video. Los archivos los graba MediaMTX solo, sin
// que el operador tenga que pulsar nada, así que aquí no hay estado que mantener.

// ffprobe sobre un archivo de 4-5 horas no es gratis y la ficha lo pide en cada
// carga. La clave incluye tamaño y mtime para que la jornada que aún se está
// grabando se vuelva a medir en lugar de quedarse con la duración de hace un rato.
const durationCache = new Map<string, number>();

function probeDurationSeconds(filePath: string): number {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return 0;
  }

  const key = `${filePath}:${stat.size}:${stat.mtimeMs}`;
  const cached = durationCache.get(key);
  if (cached !== undefined) return cached;

  try {
    // execFileSync y no execSync: el nombre va como argumento, sin pasar por el
    // shell. Aunque los nombres los genere MediaMTX y no un usuario, meter una
    // ruta en una cadena de shell es la clase de atajo que luego se copia a un
    // sitio donde sí importa.
    const out = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath],
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    const seconds = Math.max(0, Math.round(Number(out)));
    if (!Number.isFinite(seconds)) return 0;
    durationCache.set(key, seconds);
    return seconds;
  } catch {
    // Un fMP4 a medio escribir (la jornada en curso) puede no responder todavía.
    return 0;
  }
}

/** Nombre que escribe MediaMTX para cada archivo: 2026-08-23_19-30-00.mp4 */
const PATRON_JORNADA = /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})\.mp4$/;

/**
 * Todos los .mp4 de jornada que hay en disco, miren donde miren.
 *
 * MediaMTX los mete bajo un arbol que sale del nombre de la ruta: como la
 * nuestra se llama "live/gallera", acaban en jornadas/live/gallera/. Se
 * recorre en vez de dar por hecha esa profundidad, porque el dia que cambie
 * el nombre de la ruta el historial se quedaria vacio sin decir por que.
 *
 * Se indexa por nombre de archivo y no por ruta completa: el nombre ya lleva
 * fecha y hora, es unico, y es lo que viaja en la URL de descarga.
 */
function buscarJornadas(): Map<string, string> {
  const encontrados = new Map<string, string>();
  if (!fs.existsSync(JORNADAS_DIR)) return encontrados;

  // Tope de profundidad por si alguien deja un enlace simbolico circular ahi
  // dentro: sin el, esto se cuelga y con el se queda corto, que es preferible.
  const recorrer = (dir: string, queda: number): void => {
    if (queda < 0) return;
    for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
      const completa = path.join(dir, entrada.name);
      if (entrada.isDirectory()) {
        recorrer(completa, queda - 1);
      } else if (entrada.isFile() && PATRON_JORNADA.test(entrada.name)) {
        if (!encontrados.has(entrada.name)) encontrados.set(entrada.name, completa);
      }
    }
  };

  try {
    recorrer(JORNADAS_DIR, 4);
  } catch (err) {
    console.error('No se pudo recorrer', JORNADAS_DIR, err);
  }
  return encontrados;
}

app.get('/api/historial', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(JORNADAS_DIR)) {
      res.json({ jornadas: [], maxAgeDays: RECORDINGS_MAX_AGE_DAYS });
      return;
    }

    // Una noche puede dejar más de un archivo: MediaMTX abre uno nuevo cada vez
    // que el celular reconecta, y en la gallera se cae la señal. La web enseña
    // una fila por fecha, así que se agrupan aquí y no en el navegador.
    const porFecha = new Map<string, { filename: string; startedAt: string; durationSeconds: number; sizeBytes: number }[]>();

    for (const [filename, filePath] of buscarJornadas()) {
      const match = filename.match(PATRON_JORNADA);
      if (!match) continue;

      const [, fecha, hh, mm, ss] = match;
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      const partes = porFecha.get(fecha) || [];
      partes.push({
        filename,
        startedAt: `${fecha}T${hh}:${mm}:${ss}`,
        durationSeconds: probeDurationSeconds(filePath),
        sizeBytes: stat.size,
      });
      porFecha.set(fecha, partes);
    }

    const jornadas = [...porFecha.entries()]
      .map(([fecha, partes]) => {
        partes.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
        return {
          fecha,
          durationSeconds: partes.reduce((total, p) => total + p.durationSeconds, 0),
          sizeBytes: partes.reduce((total, p) => total + p.sizeBytes, 0),
          partes,
        };
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));

    res.json({ jornadas, maxAgeDays: RECORDINGS_MAX_AGE_DAYS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/historial/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  // El nombre se compara contra el patrón exacto que escribe MediaMTX. Es más
  // estrecho que buscar ".." y separadores: lo que no encaje, no se sirve.
  if (!/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.mp4$/.test(filename)) {
    res.status(400).json({ error: 'Nombre de archivo inválido' });
    return;
  }

  // Se resuelve contra lo que hay indexado en disco en vez de concatenar la
  // ruta: así solo puede servirse un archivo que exista de verdad, vaya en la
  // subcarpeta que vaya (MediaMTX las crea a partir del nombre de la ruta).
  const filePath = buscarJornadas().get(filename);
  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Jornada no encontrada' });
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  // ?descargar=1 → el navegador guarda en vez de reproducir, y con un nombre
  // que signifique algo en la carpeta de descargas. El nombre se construye a
  // partir del filename YA validado contra el patrón de arriba, nunca de algo
  // que mande el visitante: una cabecera Content-Disposition armada con texto
  // ajeno es una vía directa para inyectar cabeceras.
  if (req.query.descargar) {
    res.setHeader('Content-Disposition', `attachment; filename="la-presa-${filename}"`);
  }

  // Sin Range no se puede adelantar dentro de un video de cuatro horas: el
  // navegador tendría que descargarlo entero para saltar al final.
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) {
      res.status(416).set('Content-Range', `bytes */${stat.size}`).end();
      return;
    }

    // "bytes=-500" NO es del byte 0 al 500: son los ÚLTIMOS 500 bytes. Tratarlo
    // como el caso normal devuelve el principio del archivo con un 206, o sea
    // datos equivocados presentados como correctos.
    let start: number;
    let end: number;
    if (!match[1]) {
      const sufijo = parseInt(match[2], 10);
      start = Math.max(0, stat.size - sufijo);
      end = stat.size - 1;
    } else {
      start = parseInt(match[1], 10);
      // El final sí se acota: pedir de más por el final es legítimo y la norma
      // dice que se sirva hasta donde llegue el archivo.
      end = match[2] ? Math.min(parseInt(match[2], 10), stat.size - 1) : stat.size - 1;
    }

    // Un inicio fuera del archivo se rechaza con 416, no se recorta: recortarlo
    // devolvía el último byte con un 206, haciendo pasar por buena una petición
    // que no lo era.
    if (start >= stat.size || start > end) {
      res.status(416).set('Content-Range', `bytes */${stat.size}`).end();
      return;
    }

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'video/mp4',
    });
    enviarArchivo(fs.createReadStream(filePath, { start, end }), res, filename);
    return;
  }

  res.writeHead(200, {
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes',
    'Content-Type': 'video/mp4',
  });
  enviarArchivo(fs.createReadStream(filePath), res, filename);
});

/**
 * Vuelca un archivo en la respuesta sin que un fallo de lectura tumbe el
 * servidor. Estos archivos los escribe MediaMTX como root y los lee esta app
 * como "node": un problema de permisos aparece a mitad del stream, no al
 * abrirlo, y un 'error' sin manejador en un stream mata el proceso entero. Que
 * un video no se pueda servir no puede sacar del aire la transmisión.
 */
function enviarArchivo(stream: fs.ReadStream, res: Response, filename: string): void {
  stream.on('error', (err: Error) => {
    console.error(`❌ Error sirviendo ${filename}: ${err.message}`);
    res.destroy();
  });
  // Si el visitante cierra el video a media descarga, el stream se queda abierto
  // consumiendo un descriptor. Con una jornada de 4 horas y varios curiosos,
  // eso se acumula.
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

// ─── Live Chat API ───────────────────────────────────────────────────────────

app.get('/api/chat/messages', (_req: Request, res: Response) => {
  res.json({ messages: chatMessages });
});

app.post('/api/chat/messages', (req: Request, res: Response) => {
  const { user, text, isVIP } = req.body;
  if (!user || !text) {
    res.status(400).json({ error: 'User and text are required' });
    return;
  }

  const newMsg: ChatMessage = {
    id: Date.now().toString(),
    user: String(user).trim(),
    text: String(text).trim(),
    timestamp: new Date().toISOString(),
    isVIP: !!isVIP,
  };

  chatMessages.push(newMsg);
  if (chatMessages.length > 100) chatMessages.shift();

  res.json({ message: 'Mensaje publicado', data: newMsg });
});

app.get('/api/devices', requireAdmin, (_req: Request, res: Response) => {
  res.json({ devices: listDshowDevices() });
});

// ─── HLS en vivo ─────────────────────────────────────────────────────────────
// Estas cabeceras las hacía nginx antes de que el despliegue pasara a contenedor;
// aquí importan MÁS, no menos, porque ahora el video lo sirve Node. Con "no-store"
// cada espectador pegaba contra el proceso cada 4 s y nada era cacheable: es lo
// que impide poner una CDN delante, y la CDN es lo único que sostiene un aforo
// grande. Los max-age son los que permiten colapsar miles de peticiones en una.
//
// El .ts NO se cachea "para siempre" a propósito: los nombres seg_00001.ts se
// reinician en cada emisión y un TTL largo serviría video de la jornada anterior.
app.use('/live', express.static(HLS_DIR, {
  setHeaders: (res, filePath) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (filePath.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'public, max-age=2');
    } else if (filePath.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=60');
    }
  },
}));

// Sin emisión activa la carpeta está vacía y la petición seguía hasta el catch-all
// del SPA: el reproductor recibía index.html con un 200 donde esperaba un playlist,
// así que el error que veía el usuario no tenía relación con la causa real.
app.use('/live', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'No hay transmisión activa.' });
});

// ─── Serve Frontend (production build) ───────────────────────────────────────
const DIST_DIR = path.resolve(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  // SPA catch-all: serve index.html for any non-API route
  app.get('*', (req: Request, res: Response) => {
    // Una ruta /api/ inexistente no puede caer en el SPA, pero antes tampoco se
    // respondía nada: la petición quedaba colgada hasta el timeout del cliente.
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: 'Endpoint no encontrado.' });
      return;
    }
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
  console.log(`📁 Serving frontend from: ${DIST_DIR}`);
}

// ─── Startup ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🎬  La Presa Streaming Server                               ║
║──────────────────────────────────────────────────────────────║
║  Port:            ${PORT}                                       ║
║  Retención:       ${RECORDINGS_MAX_AGE_DAYS} días (Autopurga activa)                ║
║  Frontend:        ${fs.existsSync(DIST_DIR) ? 'Serving from dist/' : 'Not found (API only)'}                        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log(`🎥 Fuente: ${STREAM_SOURCE}  ·  Salida: ${VIDEO_MAX_HEIGHT}p @ ${VIDEO_BITRATE}`);
  if (STREAM_SOURCE === 'rtmp') {
    console.log(`📡 Ingesta RTMP: ${redactCredentials(RTMP_INGEST_URL)} (reintento cada ${RTMP_RETRY_SECONDS}s)`);
  }

  cleanOldRecordings();
  setInterval(cleanOldRecordings, 12 * 60 * 60 * 1000);
});
