import React, { useState, useEffect } from 'react';
import { Film, Play, Download, Clock, Calendar, ShieldCheck, X } from 'lucide-react';

interface FightClip {
  filename: string;
  fightNumber: number;
  title: string;
  sizeBytes: number;
  sizeMB: number;
  createdAt: string;
  expiresAt: string;
  daysRemaining: number;
  durationSeconds: number;
}

interface FightClipsSectionProps {
  apiBase?: string;
}

const getApiBase = (customApiBase?: string) => {
  if (customApiBase && customApiBase !== 'http://localhost:3001') return customApiBase;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return ''; // Same origin — relative URLs on production (cPanel)
  }
  return 'http://localhost:3001';
};

export const FightClipsSection: React.FC<FightClipsSectionProps> = ({ apiBase: customApiBase }) => {
  const apiBase = getApiBase(customApiBase);
  const [clips, setClips] = useState<FightClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<FightClip | null>(null);

  const fetchClips = async () => {
    try {
      const res = await fetch(`${apiBase}/api/clips`);
      if (res.ok) {
        const data = await res.json();
        setClips(data.clips || []);
      }
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClips();
    const interval = setInterval(fetchClips, 5000);
    return () => clearInterval(interval);
  }, [apiBase]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')} min`;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('es-DO', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const handleDeleteClip = async (filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`¿Deseas eliminar el clip "${filename}"?`)) return;
    try {
      await fetch(`${apiBase}/api/clips/${filename}`, { method: 'DELETE' });
      fetchClips();
      if (selectedClip?.filename === filename) setSelectedClip(null);
    } catch {
      alert('Error al eliminar el clip');
    }
  };

  return (
    <section id="fight-clips" className="py-16 bg-zinc-950 text-white border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-1">
              <Film className="w-3.5 h-3.5" />
              <span>Clips de Combates Grabados</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-white">
              VIDEOS Y CLIPS DE <span className="text-red-600">PELEAS</span>
            </h2>
            <p className="text-zinc-400 font-editorial italic text-base mt-1">
              Accede directamente a los segmentos grabados de cada combate sin buscar en la transmisión completa.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-red-950/60 text-red-300 px-4 py-2 rounded-sm border border-red-800/60 shadow-sm text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-red-500 shrink-0" />
            <span>Retención en Nube: <strong>15 Días</strong> (Purga Automática)</span>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-zinc-500 font-mono text-sm">
            Cargando clips de combates...
          </div>
        ) : clips.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-sm p-12 text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400">
              <Film className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-display font-black uppercase tracking-tight text-white">
              No hay clips grabados aún
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-editorial italic">
              Los administradores pueden presionar "🔴 Iniciar Clip" en el panel durante una pelea para generar el video del combate automáticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clips.map((clip) => (
              <div
                key={clip.filename}
                onClick={() => setSelectedClip(clip)}
                className="group bg-zinc-900 border border-zinc-800 hover:border-red-600/60 rounded-sm overflow-hidden shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-zinc-800">
                  <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>

                  <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm shadow">
                    Pelea #{clip.fightNumber}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/80 text-zinc-300 text-[10px] font-mono font-bold px-2 py-1 rounded-sm border border-white/10 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-red-500" />
                    <span>{formatDuration(clip.durationSeconds)}</span>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display font-black uppercase italic tracking-tighter text-white text-base group-hover:text-red-500 transition-colors line-clamp-1">
                      {clip.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-1">
                      <Calendar className="w-3 h-3 text-zinc-500" />
                      <span>{formatDate(clip.createdAt)}</span>
                      <span>•</span>
                      <span>{clip.sizeMB} MB</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-sm">
                      Expira en {clip.daysRemaining} días
                    </div>

                    <div className="flex items-center gap-1">
                      <a
                        href={`${apiBase}/api/clips/${clip.filename}`}
                        download={clip.filename}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded transition-colors"
                        title="Descargar clip MP4"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClip && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-sm max-w-4xl w-full overflow-hidden shadow-2xl space-y-0">
            <div className="bg-zinc-900 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-red-500 text-[10px] font-mono font-bold uppercase tracking-widest">
                  Pelea #{selectedClip.fightNumber} • Segmento de Combate
                </span>
                <h3 className="text-lg font-display font-black uppercase italic tracking-tighter text-white">
                  {selectedClip.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedClip(null)}
                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="aspect-video bg-black relative">
              <video
                src={`${apiBase}/api/clips/${selectedClip.filename}`}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-4">
                <span>Duración: <strong>{formatDuration(selectedClip.durationSeconds)}</strong></span>
                <span>Tamaño: <strong>{selectedClip.sizeMB} MB</strong></span>
                <span className="text-amber-400">Caduca el: {formatDate(selectedClip.expiresAt)}</span>
              </div>

              <a
                href={`${apiBase}/api/clips/${selectedClip.filename}`}
                download={selectedClip.filename}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Video MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
