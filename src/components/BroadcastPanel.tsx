import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, Square, Download, Clock, HardDrive,
  AlertTriangle, Loader2, X, RefreshCw
} from 'lucide-react';
import { formatDuracion, fechaLarga, diasRestantes, formatTamano, type Jornada } from '../lib/api';

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
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [maxAgeDays, setMaxAgeDays] = useState(15);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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

  // Las jornadas las escribe MediaMTX en recordings/jornadas/, no esta app.
  // El panel leia la raiz de recordings/, donde ya no cae nada nuevo, asi que
  // ensenaba una lista vacia mientras la ficha publica listaba las tres. Ahora
  // los dos preguntan a /api/historial, que es publico y no pide clave.
  const fetchJornadas = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/historial`);
      if (res.ok) {
        const data = await res.json();
        setJornadas(data.jornadas || []);
        setMaxAgeDays(data.maxAgeDays ?? 15);
      }
    } catch {
      // El aviso de servidor caido ya lo da fetchStatus; aqui basta con no
      // dejar una lista a medias.
      setJornadas([]);
    }
  }, []);

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
      fetchJornadas();
      fetchHealth();

      pollRef.current = setInterval(() => {
        fetchStatus();
      }, 2000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isOpen, fetchStatus, fetchJornadas, fetchHealth]);

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
      setTimeout(() => fetchJornadas(), 2000);
    } catch {
      setError('No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
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
                Panel de Transmisión
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

          {/* ── Jornadas grabadas ── */}
          <div className="border border-zinc-800 rounded-sm overflow-hidden bg-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-display font-black uppercase tracking-wider text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-red-500" />
                Jornadas grabadas ({jornadas.length})
              </h3>
              <button
                onClick={fetchJornadas}
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
                title="Actualizar lista"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Se graban solas mientras el celular emita, sin pulsar nada, y se borran
              a los {maxAgeDays} días.
            </p>

            {jornadas.length === 0 ? (
              <p className="text-xs text-zinc-500 font-editorial italic text-center py-4">
                Todavía no hay ninguna jornada grabada.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {jornadas.map((j) => (
                  <div key={j.fecha} className="bg-zinc-950 p-3 rounded-sm border border-zinc-800 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-zinc-200 font-bold truncate">
                          {fechaLarga(j.fecha)}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {formatDuracion(j.durationSeconds)} • {formatTamano(j.sizeBytes)}
                          {j.partes.length > 1 && ` • ${j.partes.length} partes`}
                          {' • '}se borra en {diasRestantes(j.fecha, maxAgeDays)} d.
                        </div>
                      </div>

                      {/* Una noche pesa varios gigas y se descarga por el mismo VPS
                          que sirve el directo. Un solo enlace por parte, sin
                          "descargar todo", para que nadie arranque cinco a la vez. */}
                      <div className="flex items-center gap-1 shrink-0">
                        {j.partes.map((parte, i) => (
                          <a
                            key={parte.filename}
                            href={`${API_BASE}/api/historial/${parte.filename}?descargar=1`}
                            download
                            className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded flex items-center gap-1"
                            title={`Descargar ${j.partes.length > 1 ? `parte ${i + 1} (${formatTamano(parte.sizeBytes)})` : formatTamano(parte.sizeBytes)}`}
                          >
                            <Download className="w-4 h-4 text-emerald-400" />
                            {j.partes.length > 1 && (
                              <span className="text-[10px] font-mono text-zinc-400">{i + 1}</span>
                            )}
                          </a>
                        ))}
                      </div>
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
