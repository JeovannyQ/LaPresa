import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Radio, RefreshCw, ShieldCheck, Video } from 'lucide-react';
import { LiveChat } from './LiveChat';

interface LiveStreamSectionProps {
  apiBase?: string;
}

interface StreamStatus {
  status: 'idle' | 'starting' | 'live' | 'stopping' | 'error';
  durationSeconds: number;
  hlsUrl?: string;
}

const getApiBase = () => (
  typeof window !== 'undefined' && !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? ''
    : 'http://localhost:3001'
);

export const LiveStreamSection: React.FC<LiveStreamSectionProps> = ({
  apiBase = getApiBase(),
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${apiBase}/api/stream/status`);
      if (response.ok) setStreamStatus(await response.json());
    } catch {
      setStreamStatus(null);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = window.setInterval(fetchStatus, 5000);
    return () => window.clearInterval(interval);
  }, [apiBase]);

  useEffect(() => {
    const video = videoRef.current;
    const hlsUrl = streamStatus?.hlsUrl;
    if (!video || !hlsUrl || streamStatus.status !== 'live') return;

    const source = `${apiBase}${hlsUrl}`;
    setPlayerError(null);
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.play().catch(() => undefined);
      return;
    }

    if (!Hls.isSupported()) {
      setPlayerError('Este navegador no puede reproducir la transmisión en vivo.');
      return;
    }

    const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
    hlsRef.current = hls;
    hls.loadSource(source);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => undefined));
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) setPlayerError('La señal se está reconectando. Intenta actualizar en unos segundos.');
    });

    return () => {
      hls.destroy();
      hlsRef.current = null;
    };
  }, [apiBase, streamStatus?.hlsUrl, streamStatus?.status]);

  const isLive = streamStatus?.status === 'live';
  const duration = streamStatus?.durationSeconds || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <section id="live-stream" className="py-16 bg-zinc-950 text-white border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Transmisión oficial en vivo</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-white">
              RUEDO EN <span className="text-red-600">DIRECTO</span>
            </h2>
            <p className="text-zinc-400 font-editorial italic text-base mt-1">
              Señal propia de La Presa, sin plataformas externas.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2 rounded-sm border border-zinc-800 shadow-sm">
            <span className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-600 animate-ping' : 'bg-zinc-500'}`} />
            <div className="text-xs font-bold uppercase tracking-widest text-white">
              {isLive ? `EN VIVO (${minutes}:${seconds.toString().padStart(2, '0')})` : 'SEÑAL FUERA DE AIRE'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-zinc-800 shadow-2xl">
              {isLive ? (
                <video ref={videoRef} controls playsInline className="w-full h-full object-contain" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <Video className="w-12 h-12 text-red-500 mb-4" />
                  <h3 className="text-xl font-display font-black uppercase italic">Próxima transmisión</h3>
                  <p className="text-zinc-400 text-sm mt-2 max-w-md">La señal aparecerá aquí cuando el operador inicie la emisión.</p>
                </div>
              )}
              {/* Aquí iba también "Pelea #N", pero el número venía cableado en
                  App.tsx y no lo movía nadie: decía "Pelea #14" toda la noche,
                  cualquier noche. Un dato inventado en pantalla es peor que
                  ninguno, así que se quedó solo el estado de la señal. */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-sm border border-white/20 text-[10px] font-bold tracking-widest uppercase">
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-red-600 animate-ping' : 'bg-zinc-500'}`} />
                <span>{isLive ? 'En vivo' : 'Disponible pronto'}</span>
              </div>
            </div>

            {playerError && (
              <div className="flex items-center gap-3 p-4 border border-amber-800 bg-amber-950/40 text-amber-200 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" /><span>{playerError}</span>
                <button onClick={fetchStatus} className="ml-auto p-1 hover:text-white" aria-label="Reintentar"><RefreshCw className="w-4 h-4" /></button>
              </div>
            )}

            <div className="bg-zinc-900 p-4 rounded-sm border border-zinc-800 flex items-center gap-3 text-xs text-zinc-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>La transmisión se distribuye desde la infraestructura propia de La Presa.</span>
            </div>
          </div>

          <div className="lg:col-span-4"><LiveChat apiBase={apiBase} /></div>
        </div>
      </div>
    </section>
  );
};
