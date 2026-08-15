import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, Square, Play, Download, Trash2, Clock,
  HardDrive, AlertTriangle, CheckCircle2, Loader2,
  Video, X, ChevronDown, ChevronUp, Eye, Settings,
  Wifi, WifiOff, FileVideo, RefreshCw, Scissors, Film, Camera
} from 'lucide-react';

const getApiBase = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''; // Same origin — relative URLs on production (cPanel)
  }
  return 'http://localhost:3001';
};
const API_BASE = getApiBase();

/** Se lanza cuando el usuario cancela el prompt de la clave, para poder
 *  distinguirlo de un fallo real de red y no mostrarle un error que miente. */
export const ADMIN_KEY_CANCELLED = 'ADMIN_KEY_CANCELLED';

const adminFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const savedKey = window.sessionStorage.getItem('lapresa_admin_key');
  const key = savedKey || window.prompt('Ingresa la clave de administrador');
  if (!key) throw new Error(ADMIN_KEY_CANCELLED);
  window.sessionStorage.setItem('lapresa_admin_key', key);

  const res = await fetch(input, {
    ...init,
    headers: { ...init.headers, 'x-admin-key': key },
  });

  // Si la clave no sirve hay que olvidarla: si no, queda cacheada en la
  // sesion y el panel no vuelve a preguntar nunca, dejando al operador
  // trancado hasta que cierre la pestana.
  if (res.status === 401) window.sessionStorage.removeItem('lapresa_admin_key');

  return res;
};

interface StreamStatus {
  status: 'idle' | 'starting' | 'live' | 'stopping' | 'error';
  startTime: string | null;
  durationSeconds: number;
  error: string | null;
  currentRecordingFile: string | null;
  hasStreamKey: boolean;
  streamSource: string;
  // El servidor ya lo mandaba pero el panel lo ignoraba: es lo que distingue
  // "arrancando" de "esperando a que el celular publique", que son cosas muy
  // distintas para quien está operando.
  waitingForPublisher: boolean;
  activeClip: {
    fightNumber: number;
    title: string;
    durationSeconds: number;
    filename: string;
  } | null;
}

interface Recording {
  filename: string;
  sizeBytes: number;
  sizeMB: number;
  createdAt: string;
  modifiedAt: string;
}

interface HealthStatus {
  status: string;
  ffmpegInstalled: boolean;
  hasStreamKey: boolean;
  streamSource: string;
  recordingsDir: string;
  maxAgeDays: number;
}

interface BroadcastPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BroadcastPanel: React.FC<BroadcastPanelProps> = ({ isOpen, onClose }) => {
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecordings, setShowRecordings] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState(false);

  // Manual Clip Recording Form State
  const [clipFightNumber, setClipFightNumber] = useState<number>(14);
  const [clipTitle, setClipTitle] = useState<string>('Pelea #14 - Ruedo Principal');
  const [clipLoading, setClipLoading] = useState(false);
  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [clipElapsed, setClipElapsed] = useState(0);
  const [clipError, setClipError] = useState<string | null>(null);
  const [clipUploadedBytes, setClipUploadedBytes] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const clipFilenameRef = useRef<string | null>(null);
  const clipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/stream/status`);
      if (res.ok) {
        const data = await res.json();
        setStreamStatus(data);
        setServerOnline(true);
      }
    } catch {
      setServerOnline(false);
    }
  }, []);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/recordings`);
      if (res.ok) {
        const data = await res.json();
        setRecordings(data.recordings || []);
      }
    } catch (e) {
      // Este es el primer prompt que ve el operador al abrir el panel. Si lo
      // cancela, se cierra todo: antes quedaba el panel abierto y la pagina
      // de atras oscurecida, como "apagada".
      if (e instanceof Error && e.message === ADMIN_KEY_CANCELLED) onClose();
    }
  }, [onClose]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
        setServerOnline(true);
      }
    } catch {
      setServerOnline(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchRecordings();
      fetchHealth();

      pollRef.current = setInterval(() => {
        fetchStatus();
      }, 2000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, fetchStatus, fetchRecordings, fetchHealth]);

  const startStream = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${API_BASE}/api/stream/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Error al iniciar');
      await fetchStatus();
    } catch (e) {
      // Cancelar el prompt no es un error del servidor: se cierra el panel y
      // se deja la pagina como estaba, sin el fondo oscurecido.
      if (e instanceof Error && e.message === ADMIN_KEY_CANCELLED) { onClose(); return; }
      setError('No se pudo autenticar o conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const stopStream = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${API_BASE}/api/stream/stop`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) setError(data.error || 'Error al detener');
      await fetchStatus();
      setTimeout(() => fetchRecordings(), 2000);
    } catch {
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Manual Fight Clip Actions
  // Cleanup camera when panel closes
  useEffect(() => {
    if (!isOpen && isRecordingClip) {
      // Stop recording if panel is closed
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (clipTimerRef.current) clearInterval(clipTimerRef.current);
      setIsRecordingClip(false);
      setClipElapsed(0);
    }
  }, [isOpen]);

  const handleStartClip = async () => {
    setClipLoading(true);
    setClipError(null);
    setClipUploadedBytes(0);
    try {
      // 1. Request camera + microphone
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setClipError('Tu navegador no soporta acceso a la cámara. Asegúrate de usar HTTPS.');
        setClipLoading(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      mediaStreamRef.current = stream;

      // Show preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      // 2. Register clip on server
      const res = await adminFetch(`${API_BASE}/api/clips/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fightNumber: clipFightNumber, title: clipTitle }),
      });
      if (!res.ok) {
        const data = await res.json();
        setClipError(data.error || 'Error al registrar clip en el servidor');
        stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
        setClipLoading(false);
        return;
      }
      const clipData = await res.json();
      const filename = clipData.clip.filename;
      clipFilenameRef.current = filename;

      // 3. Start MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && clipFilenameRef.current) {
          try {
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              if (base64) {
                const uploadRes = await adminFetch(`${API_BASE}/api/clips/upload-chunk`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ chunkBase64: base64, filename: clipFilenameRef.current }),
                });
                if (uploadRes.ok) {
                  const uploadData = await uploadRes.json();
                  setClipUploadedBytes(uploadData.totalBytes || 0);
                }
              }
            };
            reader.readAsDataURL(e.data);
          } catch { /* chunk upload failed, continue */ }
        }
      };

      recorder.start(5000); // Send chunk every 5 seconds
      setIsRecordingClip(true);
      setClipElapsed(0);

      // Start elapsed timer
      clipTimerRef.current = setInterval(() => {
        setClipElapsed(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setClipError('Permiso de cámara denegado. Por favor permite el acceso a la cámara.');
      } else if (err.name === 'NotFoundError') {
        setClipError('No se encontró ninguna cámara disponible en este dispositivo.');
      } else {
        setClipError(err.message || 'Error al iniciar la grabación');
      }
    } finally {
      setClipLoading(false);
    }
  };

  const handleStopClip = async () => {
    setClipLoading(true);
    try {
      // Stop timer
      if (clipTimerRef.current) {
        clearInterval(clipTimerRef.current);
        clipTimerRef.current = null;
      }

      // Stop MediaRecorder (triggers final ondataavailable)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      // Wait a moment for the last chunk to upload
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Stop camera
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }

      // Finalize clip on server
      const res = await adminFetch(`${API_BASE}/api/clips/stop`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        setClipError(data.error || 'Error al finalizar clip');
      }

      setIsRecordingClip(false);
      setClipElapsed(0);
      setClipUploadedBytes(0);
      clipFilenameRef.current = null;
      await fetchStatus();
      await fetchRecordings();
    } catch {
      setClipError('Error de conexión con el servidor');
    } finally {
      setClipLoading(false);
    }
  };

  const deleteRecording = async (filename: string) => {
    if (!confirm(`¿Eliminar la grabación "${filename}"?`)) return;
    try {
      await adminFetch(`${API_BASE}/api/recordings/${filename}`, { method: 'DELETE' });
      await fetchRecordings();
    } catch {
      setError('Error al eliminar la grabación');
    }
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-DO', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  };

  const statusConfig = {
    idle: { color: 'bg-zinc-500', label: '', textColor: 'text-zinc-600', pulse: false },
    starting: { color: 'bg-amber-500', label: 'CONECTANDO...', textColor: 'text-amber-600', pulse: true },
    live: { color: 'bg-red-600', label: 'EN VIVO', textColor: 'text-red-600', pulse: true },
    stopping: { color: 'bg-amber-500', label: 'DETENIENDO...', textColor: 'text-amber-600', pulse: true },
    error: { color: 'bg-red-800', label: 'ERROR', textColor: 'text-red-700', pulse: false },
  };

  const currentStatus = streamStatus?.status || 'idle';
  const cfg = statusConfig[currentStatus];
  const isLive = currentStatus === 'live';
  const isBusy = currentStatus === 'starting' || currentStatus === 'stopping';

  // Con fuente RTMP, "starting" no es que algo esté fallando: ffmpeg reintenta
  // cada 5 s hasta que el celular publique, y puede quedarse ahí indefinidamente
  // porque el operador puede pulsar "iniciar" antes de encender Larix. Decir
  // "CONECTANDO..." dejaba al operador esperando algo que dependía de él.
  const waitingForPhone = currentStatus === 'starting' && !!streamStatus?.waitingForPublisher;
  const statusLabel = waitingForPhone ? 'ESPERANDO SEÑAL DEL CELULAR' : cfg.label;

  // La transmisión está viva en el servidor en todos estos estados, aunque aún no
  // haya imagen. Si aquí se mostrara "iniciar", pulsarlo devuelve 409 "Stream is
  // already active" y el operador se queda sin forma de detenerla.
  const streamIsActive = currentStatus !== 'idle' && currentStatus !== 'error';
  const activeClip = streamStatus?.activeClip;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 h-full w-full max-w-xl bg-zinc-950 text-white z-[70] shadow-2xl overflow-y-auto transition-transform"
      >
        {/* Header */}
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-600 animate-pulse' : 'bg-red-600'}`} />
              <h2 className="text-lg font-display font-black uppercase italic tracking-tighter">
                Panel de Transmisión & Clips
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-sm transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 text-[10px] uppercase tracking-widest font-bold text-zinc-400 font-mono">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>Emisión en Directo</span>
            </div>
            <span className="text-zinc-500 font-mono">Retención Nube: 15 Días</span>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">

          {/* ── Stream Status Card ── */}
          <div className={`p-6 rounded-sm border ${isLive ? 'border-red-600/50 bg-red-950/30' : 'border-zinc-800 bg-zinc-900'} transition-all`}>
            {cfg.label ? (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${cfg.color} ${cfg.pulse ? 'animate-pulse' : ''} shadow-lg`} />
                  <span className="text-sm font-black uppercase tracking-[0.2em] text-red-500">
                    {statusLabel}
                  </span>
                </div>
                {isLive && streamStatus && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-bold bg-red-950/50 px-3 py-1 rounded-sm border border-red-800/50">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuration(streamStatus.durationSeconds)}</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Error display */}
            {(error || streamStatus?.error) && (
              <div className="bg-red-950/40 border border-red-700/40 rounded-sm p-3 mb-5 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300/90 leading-relaxed">
                  {error || streamStatus?.error}
                </div>
              </div>
            )}

            {/* El servidor está listo y la pelota está en el celular. Sin este
                aviso el operador ve "conectando" indefinidamente y no tiene cómo
                saber que falta encender Larix. */}
            {waitingForPhone && (
              <div className="bg-amber-950/30 border border-amber-700/40 rounded-sm p-3 mb-5 flex items-start gap-3">
                <Radio className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  El servidor está listo y esperando. Abre <strong>Larix</strong> en
                  el celular y pulsa transmitir; la señal entrará en unos segundos.
                </div>
              </div>
            )}

            {/* Main action: start the self-hosted HLS stream */}
            {!streamIsActive ? (
              <div className="space-y-2">
                <button
                  onClick={startStream}
                  className="w-full py-4 rounded-sm font-black uppercase tracking-[0.25em] text-sm flex items-center justify-center gap-3 transition-all shadow-xl bg-red-600 hover:bg-red-500 text-white hover:shadow-red-600/30 active:scale-[0.98]"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  <span>INICIAR TRANSMISIÓN PROPIA</span>
                </button>

                <div className="flex items-center justify-center gap-4 text-xs pt-1">
                  <a
                    href="#live-stream"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white underline font-mono text-[11px]"
                  >
                    Configura la fuente RTSP o cámara antes de iniciar
                  </a>
                  <span className="text-zinc-600">•</span>
                  <a
                    href="#live-stream"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-white underline font-mono text-[11px]"
                  >
                    La señal se publicará como HLS en este sitio
                  </a>
                </div>

                <p className="text-[10px] text-zinc-500 text-center mt-2 leading-relaxed italic">
                  La transmisión se inicia en el servidor y se publica en el reproductor propio.
                </p>
              </div>
            ) : (
              <button
                onClick={stopStream}
                disabled={loading || currentStatus === 'stopping'}
                className={`w-full py-4 rounded-sm font-black uppercase tracking-[0.25em] text-sm flex items-center justify-center gap-3 transition-all shadow-xl
                  ${loading || currentStatus === 'stopping'
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-zinc-200 hover:bg-white text-zinc-900 active:scale-[0.98]'
                  }`}
              >
                {currentStatus === 'stopping' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>DETENIENDO...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-5 h-5 fill-current" />
                    <span>DETENER TRANSMISIÓN</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── MANUAL FIGHT CLIPS GENERATOR CARD ── */}
          <div className={`bg-zinc-900 border ${isRecordingClip ? 'border-red-600/60' : 'border-zinc-800'} rounded-sm p-6 space-y-4 transition-all`}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
                  Generador de Clips de Combates
                </h3>
              </div>
              <span className="text-[10px] bg-red-950 text-red-400 border border-red-800/40 px-2 py-0.5 rounded font-mono uppercase font-bold">
                Cámara del Dispositivo
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-editorial italic">
              Graba clips directamente con la cámara de tu celular o PC. El video se sube automáticamente al servidor.
            </p>

            {/* Error display */}
            {clipError && (
              <div className="bg-red-950/40 border border-red-700/40 rounded-sm p-3 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300/90 leading-relaxed">{clipError}</div>
              </div>
            )}

            {/* Fight info inputs (hidden while recording) */}
            {!isRecordingClip && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
                    Número de Pelea
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={clipFightNumber}
                    onChange={(e) => setClipFightNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white font-mono text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
                    Título / Peleadores
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Gallo Rojo vs Gallo Azul"
                    value={clipTitle}
                    onChange={(e) => setClipTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            )}

            {/* Video Preview (visible when recording) */}
            {isRecordingClip && (
              <div className="space-y-3">
                <div className="relative rounded-sm overflow-hidden border-2 border-red-600 shadow-lg shadow-red-900/30">
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full aspect-video bg-black object-cover"
                  />
                  {/* Recording overlay */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-sm">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">REC</span>
                  </div>
                  <div className="absolute top-3 right-3 bg-black/70 px-3 py-1.5 rounded-sm">
                    <span className="text-sm font-mono font-bold text-white">{formatDuration(clipElapsed)}</span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1.5 rounded-sm">
                    <span className="text-[10px] font-mono text-zinc-300">
                      Pelea #{clipFightNumber} • {clipTitle}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-black/70 px-3 py-1.5 rounded-sm">
                    <span className="text-[10px] font-mono text-emerald-400">
                      ↑ {(clipUploadedBytes / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Start / Stop Clip Action Buttons */}
            {!isRecordingClip ? (
              <button
                onClick={handleStartClip}
                disabled={clipLoading || !serverOnline}
                className={`w-full py-3 font-bold uppercase tracking-wider text-xs rounded-sm transition-colors flex items-center justify-center gap-2 shadow ${
                  !serverOnline || clipLoading
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-red-700 hover:bg-red-600 text-white'
                }`}
              >
                {clipLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Iniciando cámara...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>📹 INICIAR GRABACIÓN CON CÁMARA</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleStopClip}
                disabled={clipLoading}
                className={`w-full py-3 font-bold uppercase tracking-wider text-xs rounded-sm transition-colors flex items-center justify-center gap-2 shadow ${
                  clipLoading
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {clipLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>⏹️ FINALIZAR Y GUARDAR CLIP</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* ── Recordings List Section ── */}
          <div className="border border-zinc-800 rounded-sm overflow-hidden bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-red-500" />
                Grabaciones en Nube ({recordings.length})
              </h3>
              <button
                onClick={fetchRecordings}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                title="Actualizar lista"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {recordings.length === 0 ? (
              <p className="text-xs text-zinc-500 font-editorial italic text-center py-4">
                No hay grabaciones continuas acumuladas.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recordings.map((rec) => (
                  <div key={rec.filename} className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 text-xs flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-zinc-200 font-bold truncate max-w-[240px]">
                        {rec.filename}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {rec.sizeMB} MB • {formatDate(rec.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`${API_BASE}/api/recordings/${rec.filename}`}
                        download
                        className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded"
                        title="Descargar MP4"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                      </a>
                      <button
                        onClick={() => deleteRecording(rec.filename)}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
};
