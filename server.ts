import express, { Request, Response } from 'express';
import { spawn, ChildProcess, execSync } from 'child_process';
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
const CLIPS_DIR = path.join(RECORDINGS_DIR, 'clips');
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

// Fuentes que ya entregan video comprimido: la grabación puede copiarse sin
// recodificar. Las demás (webcam, patrón de prueba) entregan cuadros crudos.
const SOURCE_IS_ENCODED = ['rtmp', 'rtsp', 'file'];

// ─── State ───────────────────────────────────────────────────────────────────
let ffmpegProcess: ChildProcess | null = null;
let streamStartTime: Date | null = null;
let streamStatus: 'idle' | 'starting' | 'live' | 'stopping' | 'error' = 'idle';
let streamError: string | null = null;
let currentRecordingFile: string | null = null;
// Con fuente RTMP el proceso se relanza solo hasta que el celular publique.
let keepStreaming = false;
let waitingForPublisher = false;
let rtmpRetryTimer: NodeJS.Timeout | null = null;

// Clip state
interface ActiveClip {
  fightNumber: number;
  title: string;
  startTime: Date;
  filename: string;
}
let activeClip: ActiveClip | null = null;

// Live Chat State (in-memory)
interface ChatMessage {
  id: string;
  user: string;
  text: string;
  timestamp: string;
  isVIP?: boolean;
}
const chatMessages: ChatMessage[] = [
  { id: '1', user: 'Gallero_Santiaguero', text: '¡Saludos desde Santiago! Listo para las peleas.', timestamp: new Date(Date.now() - 300000).toISOString(), isVIP: true },
  { id: '2', user: 'Pedro_LaPresa', text: 'Hoy promete ser una gran cartelera en la Presa de Tavera.', timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: '3', user: 'Manolo_Bonao', text: '¿En qué número de pelea van?', timestamp: new Date(Date.now() - 60000).toISOString() }
];

// Ensure directories exist
if (!fs.existsSync(RECORDINGS_DIR)) {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}
if (!fs.existsSync(CLIPS_DIR)) {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
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

function getRecordingFilename(): string {
  return `stream_${getTimestamp()}.mp4`;
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
    // Las grabaciones salen siempre como stream_<fecha>.mp4.
    purgeOldFiles(RECORDINGS_DIR, ['.mp4'], 'Grabacion');
    // Los clips son .webm o .mp4, cada uno con su .json de metadatos al lado.
    purgeOldFiles(CLIPS_DIR, ['.mp4', '.webm', '.json'], 'Clip');
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
  const recordingFile = getRecordingFilename();
  currentRecordingFile = recordingFile;

  const args: string[] = [];
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

  // ── Salida 1: HLS multicalidad (ABR) ──────────────────────────────────────
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

  // ── Salida 2: grabación en disco ──────────────────────────────────────────
  // Se mapea la ENTRADA otra vez (no una rama del filtro, que solo se puede
  // consumir una vez). Cuando la fuente ya viene comprimida —el celular manda
  // H.264— se copia tal cual: cero CPU y el archivo queda en calidad original.
  const recordingPath = ffmpegPath(path.join(RECORDINGS_DIR, recordingFile));
  args.push('-map', videoMap, '-map', audioMap);
  if (SOURCE_IS_ENCODED.includes(STREAM_SOURCE)) {
    args.push('-c', 'copy');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-b:v', VIDEO_BITRATE, '-c:a', 'aac', '-b:a', '128k');
  }
  args.push('-movflags', '+frag_keyframe+empty_moov', '-f', 'mp4', recordingPath);

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
  console.log('\n🎬 Starting FFmpeg:', ['ffmpeg', ...args].join(' '));

  const proc = spawn('ffmpeg', args, { cwd: RECORDINGS_DIR, stdio: ['pipe', 'pipe', 'pipe'] });
  ffmpegProcess = proc;

  proc.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString();
    if (msg.includes('frame=') || msg.includes('speed=')) {
      waitingForPublisher = false;
      if (streamStatus === 'starting') {
        streamStatus = 'live';
        streamStartTime = new Date();
        console.log('🔴 Stream is LIVE!');
      }
    }
  });

  // Sin este manejador, un fallo al lanzar el proceso (ffmpeg ausente, permisos)
  // emite un 'error' sin escuchar y tumba el servidor completo.
  proc.on('error', (err: Error) => {
    console.error(`❌ No se pudo lanzar ffmpeg: ${err.message}`);
    streamError = err.message;
    keepStreaming = false;
  });

  proc.on('close', (code: number | null) => {
    console.log(`⏹️ FFmpeg exited code ${code}`);
    ffmpegProcess = null;
    currentRecordingFile = null;

    if (keepStreaming && STREAM_SOURCE === 'rtmp') {
      waitingForPublisher = true;
      streamStatus = 'starting';
      streamStartTime = null;
      console.log(`📡 Sin señal en ${RTMP_INGEST_URL}. Reintento en ${RTMP_RETRY_SECONDS}s...`);
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
    currentRecordingFile,
    streamSource: STREAM_SOURCE,
    // La URL de publicación NO va aquí: este endpoint es público y quien la
    // conozca podría publicar en el canal. Solo se expone en /api/stream/config.
    waitingForPublisher,
    hlsUrl: HLS_URL,
    activeClip: activeClip ? {
      fightNumber: activeClip.fightNumber,
      title: activeClip.title,
      durationSeconds: Math.floor((Date.now() - activeClip.startTime.getTime()) / 1000),
      filename: activeClip.filename,
    } : null,
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
      recordingFile: currentRecordingFile,
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
    currentRecordingFile = null;
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

// ─── Fight Clips API (Manual Recording per Fight) ───────────────────────────

// Start Clip
app.post('/api/clips/start', requireAdmin, (req: Request, res: Response) => {
  const { fightNumber = 1, title = 'Combate en Vivo' } = req.body;
  
  if (activeClip) {
    res.status(409).json({ error: 'Ya hay un clip de pelea grabándose actualmente', activeClip });
    return;
  }

  const clipFilename = `clip_pelea_${fightNumber}_${getTimestamp()}.webm`;
  const clipPath = path.join(CLIPS_DIR, clipFilename);

  activeClip = {
    fightNumber: Number(fightNumber),
    title: String(title),
    startTime: new Date(),
    filename: clipFilename,
  };

  fs.writeFileSync(clipPath, '');

  console.log(`🎬 Clip iniciado para Pelea #${fightNumber}: "${title}" (${clipFilename})`);
  res.json({ message: 'Grabación de clip iniciada', clip: activeClip });
});

// Stop Clip
app.post('/api/clips/stop', requireAdmin, (req: Request, res: Response) => {
  if (!activeClip) {
    res.status(400).json({ error: 'No hay ningún clip activo grabándose' });
    return;
  }

  const clipPath = path.join(CLIPS_DIR, activeClip.filename);
  const duration = Math.floor((Date.now() - activeClip.startTime.getTime()) / 1000);

  const metaPath = clipPath.replace('.webm', '.json');
  const metadata = {
    fightNumber: activeClip.fightNumber,
    title: activeClip.title,
    createdAt: activeClip.startTime.toISOString(),
    completedAt: new Date().toISOString(),
    durationSeconds: duration,
    filename: activeClip.filename,
    expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  };
  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  console.log(`⏹️ Clip finalizado para Pelea #${activeClip.fightNumber} (${duration}s)`);
  const finishedClip = { ...activeClip, durationSeconds: duration };
  activeClip = null;

  const finalStat = fs.existsSync(clipPath) ? fs.statSync(clipPath) : null;
  res.json({ message: 'Clip de combate guardado correctamente', clip: finishedClip, sizeMB: finalStat ? Math.round((finalStat.size / (1024 * 1024)) * 100) / 100 : 0 });
});

// Upload Clip Chunk (from browser MediaRecorder)
app.post('/api/clips/upload-chunk', requireAdmin, (req: Request, res: Response) => {
  const { chunkBase64, filename } = req.body;
  if (!chunkBase64 || !filename) {
    res.status(400).json({ error: 'chunkBase64 and filename are required' });
    return;
  }

  try {
    const filePath = path.join(CLIPS_DIR, filename);
    const buffer = Buffer.from(chunkBase64, 'base64');
    fs.appendFileSync(filePath, buffer);
    const stat = fs.statSync(filePath);
    res.json({ success: true, bytesAdded: buffer.length, totalBytes: stat.size, file: filename });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List Clips
app.get('/api/clips', (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(CLIPS_DIR)) {
      res.json({ clips: [] });
      return;
    }

    const files = fs.readdirSync(CLIPS_DIR).filter(f => f.endsWith('.webm') || f.endsWith('.mp4'));
    const clips = files.map(filename => {
      const filePath = path.join(CLIPS_DIR, filename);
      const stat = fs.statSync(filePath);
      const metaPath = filePath.replace(/\.(webm|mp4)$/, '.json');
      
      let meta: any = {};
      if (fs.existsSync(metaPath)) {
        try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')); } catch {}
      }

      const createdAt = meta.createdAt || stat.birthtime.toISOString();
      const createdDate = new Date(createdAt);
      const expiresDate = new Date(createdDate.getTime() + 15 * 24 * 60 * 60 * 1000);
      const daysRemaining = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

      return {
        filename,
        fightNumber: meta.fightNumber || 1,
        title: meta.title || filename.replace(/\.(webm|mp4)$/, ''),
        sizeBytes: stat.size,
        sizeMB: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
        createdAt,
        expiresAt: expiresDate.toISOString(),
        daysRemaining,
        durationSeconds: meta.durationSeconds || 120,
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ clips, maxAgeDays: RECORDINGS_MAX_AGE_DAYS });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Clip Video
app.get('/api/clips/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = path.join(CLIPS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Clip no encontrado' });
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': filename.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': filename.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Delete Clip
app.delete('/api/clips/:filename', requireAdmin, (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = path.join(CLIPS_DIR, filename);
  const metaPath = filePath.replace(/\.(webm|mp4)$/, '.json');

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);

  res.json({ message: `Clip ${filename} eliminado` });
});

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

// ─── Recordings API ──────────────────────────────────────────────────────────

app.get('/api/recordings', requireAdmin, (_req: Request, res: Response) => {
  try {
    if (!fs.existsSync(RECORDINGS_DIR)) {
      res.json({ recordings: [] });
      return;
    }

    const files = fs.readdirSync(RECORDINGS_DIR)
      .filter(f => f.endsWith('.mp4') || f.endsWith('.webm'))
      .map(filename => {
        const filePath = path.join(RECORDINGS_DIR, filename);
        const stat = fs.statSync(filePath);
        return {
          filename,
          sizeBytes: stat.size,
          sizeMB: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
          createdAt: stat.birthtime.toISOString(),
          modifiedAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ recordings: files, directory: RECORDINGS_DIR });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recordings/:filename', requireAdmin, (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = path.join(RECORDINGS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  const stat = fs.statSync(filePath);
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': filename.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': filename.endsWith('.webm') ? 'video/webm' : 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

app.delete('/api/recordings/:filename', requireAdmin, (req: Request, res: Response) => {
  const { filename } = req.params;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    res.status(400).json({ error: 'Invalid filename' });
    return;
  }

  const filePath = path.join(RECORDINGS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Recording not found' });
    return;
  }

  fs.unlinkSync(filePath);
  res.json({ message: `Deleted ${filename}` });
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
║  🎬  La Presa Streaming & Clips Server                       ║
║──────────────────────────────────────────────────────────────║
║  Port:            ${PORT}                                       ║
║  Retención:       ${RECORDINGS_MAX_AGE_DAYS} días (Autopurga activa)                ║
║  Clips Dir:       ${CLIPS_DIR.slice(0, 40).padEnd(40)}║
║  Frontend:        ${fs.existsSync(DIST_DIR) ? 'Serving from dist/' : 'Not found (API only)'}                        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log(`🎥 Fuente: ${STREAM_SOURCE}  ·  Salida: ${VIDEO_MAX_HEIGHT}p @ ${VIDEO_BITRATE}`);
  if (STREAM_SOURCE === 'rtmp') {
    console.log(`📡 Ingesta RTMP: ${RTMP_INGEST_URL} (reintento cada ${RTMP_RETRY_SECONDS}s)`);
  }

  cleanOldRecordings();
  setInterval(cleanOldRecordings, 12 * 60 * 60 * 1000);
});
