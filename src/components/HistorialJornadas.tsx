import React, { useEffect, useState } from 'react';
import { Play, X, Info, Loader2, CalendarX, Download } from 'lucide-react';
import { getApiBase, formatDuracion, fechaCorta, fechaLarga, diasRestantes, formatTamano, type Jornada } from '../lib/api';

interface HistorialJornadasProps {
  apiBase?: string;
}

export const HistorialJornadas: React.FC<HistorialJornadasProps> = ({ apiBase = getApiBase() }) => {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [maxAgeDays, setMaxAgeDays] = useState(15);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viendo, setViendo] = useState<{ jornada: Jornada; parte: number } | null>(null);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/historial`);
        if (!res.ok) throw new Error('No se pudo cargar el historial');
        const data = await res.json();
        if (cancelado) return;
        setJornadas(data.jornadas || []);
        setMaxAgeDays(data.maxAgeDays ?? 15);
      } catch {
        if (!cancelado) setError('No se pudo cargar el historial de jugadas.');
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    // Si el visitante cambia de pantalla antes de que responda el servidor, sin
    // esto React avisa de un setState sobre un componente ya desmontado.
    return () => {
      cancelado = true;
    };
  }, [apiBase]);

  // Esc para cerrar: en móvil no, pero en PC es lo primero que se pulsa.
  useEffect(() => {
    if (!viendo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViendo(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viendo]);

  const urlParte = (filename: string) => `${apiBase}/api/historial/${filename}`;
  const urlDescarga = (filename: string) => `${urlParte(filename)}?descargar=1`;

  return (
    <section id="historial" className="py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-6">
          <h2 className="text-xl sm:text-2xl font-display font-black uppercase italic tracking-tighter text-white">
            Historial de jugadas
          </h2>
          <span className="text-sm text-zinc-400 font-editorial italic">
            (últimos {maxAgeDays} días)
          </span>
        </div>

        {cargando ? (
          <div className="flex items-center gap-3 text-zinc-400 text-sm py-10 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Cargando jugadas anteriores...</span>
          </div>
        ) : error ? (
          <div className="border border-amber-800 bg-amber-950/40 text-amber-200 text-sm p-4 rounded-sm">
            {error}
          </div>
        ) : jornadas.length === 0 ? (
          <div className="border border-zinc-800 bg-zinc-900/60 rounded-sm p-8 text-center">
            <CalendarX className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-300 font-bold">Todavía no hay jugadas grabadas</p>
            <p className="text-zinc-500 text-sm mt-1 font-editorial italic">
              Las transmisiones aparecen aquí automáticamente al terminar la noche.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {jornadas.map((jornada) => {
              const { dia, mes, anio } = fechaCorta(jornada.fecha);
              const restantes = diasRestantes(jornada.fecha, maxAgeDays);

              return (
                <article
                  key={jornada.fecha}
                  className="flex items-stretch gap-3 sm:gap-4 bg-zinc-900/80 border border-zinc-800 rounded-sm overflow-hidden hover:border-zinc-700 transition-colors"
                >
                  {/* Bloque de fecha */}
                  <div className="shrink-0 w-16 sm:w-20 bg-zinc-950/60 flex flex-col items-center justify-center py-3 border-r border-zinc-800">
                    <span className="text-2xl sm:text-3xl font-display font-black italic tracking-tighter text-white leading-none">
                      {dia}
                    </span>
                    <span className="text-[11px] uppercase font-bold text-red-500 tracking-wider mt-0.5">{mes}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{anio}</span>
                  </div>

                  {/* Miniatura del video */}
                  <button
                    onClick={() => setViendo({ jornada, parte: 0 })}
                    className="relative shrink-0 w-28 sm:w-44 my-2 rounded-sm overflow-hidden bg-black group focus:outline-none focus:ring-2 focus:ring-red-600"
                    aria-label={`Ver la jugada del ${fechaLarga(jornada.fecha)}`}
                  >
                    {/* preload="metadata" + #t=60 pinta un cuadro del minuto uno sin
                        descargar el video entero: son archivos de varias horas. */}
                    <video
                      src={`${urlParte(jornada.partes[0].filename)}#t=60`}
                      preload="metadata"
                      muted
                      playsInline
                      className="w-full h-full object-cover aspect-video opacity-70 group-hover:opacity-90 transition-opacity"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-9 h-9 rounded-full bg-black/70 border border-white/30 flex items-center justify-center group-hover:bg-red-600 transition-colors">
                        <Play className="w-4 h-4 fill-current text-white ml-0.5" />
                      </span>
                    </span>
                    <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-sm">
                      {formatDuracion(jornada.durationSeconds)}
                    </span>
                  </button>

                  {/* Datos */}
                  <div className="flex-1 min-w-0 py-3 pr-3 flex flex-col justify-center">
                    <p className="font-bold text-white text-sm">En vivo</p>
                    <p className="text-zinc-400 text-xs sm:text-sm truncate">{fechaLarga(jornada.fecha)}</p>

                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-zinc-500">
                      {/* Una noche partida en varios archivos es una reconexión del
                          celular, no dos jugadas. Se dice, para que no parezca un error. */}
                      {jornada.partes.length > 1 && (
                        <span>{jornada.partes.length} partes</span>
                      )}
                      <span>{formatTamano(jornada.sizeBytes)}</span>
                      <span>{restantes === 0 ? 'Se elimina hoy' : `Se elimina en ${restantes} d.`}</span>
                    </div>

                    {/* Con una sola parte se descarga directo. Con varias no se
                        puede: son archivos distintos y el navegador no los junta,
                        así que se abre el reproductor, que sí deja elegir cuál. */}
                    {jornada.partes.length === 1 ? (
                      <a
                        href={urlDescarga(jornada.partes[0].filename)}
                        download
                        className="mt-2 self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Descargar
                      </a>
                    ) : (
                      <button
                        onClick={() => setViendo({ jornada, parte: 0 })}
                        className="mt-2 self-start inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        Descargar partes
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="flex items-start gap-2 text-[11px] sm:text-xs text-zinc-500 mt-6 leading-relaxed">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-600" />
          <span>
            Los videos se mantienen por {maxAgeDays} días. Luego se eliminan automáticamente.
          </span>
        </p>
      </div>

      {/* Reproductor */}
      {viendo && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-3 sm:p-6"
          onClick={() => setViendo(null)}
        >
          <div
            className="w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
              <div className="min-w-0">
                <p className="font-bold text-white text-sm truncate">
                  Jugada del {fechaLarga(viendo.jornada.fecha)}
                </p>
                <p className="text-[11px] text-zinc-500">
                  {formatDuracion(viendo.jornada.partes[viendo.parte].durationSeconds)}
                  {viendo.jornada.partes.length > 1 && ` · parte ${viendo.parte + 1} de ${viendo.jornada.partes.length}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={urlDescarga(viendo.jornada.partes[viendo.parte].filename)}
                  download
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-300 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Descargar</span>
                  <span className="text-zinc-500 font-normal normal-case tracking-normal">
                    {formatTamano(viendo.jornada.partes[viendo.parte].sizeBytes)}
                  </span>
                </a>

                <button
                  onClick={() => setViendo(null)}
                  className="p-2 text-zinc-400 hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <video
              key={viendo.jornada.partes[viendo.parte].filename}
              src={urlParte(viendo.jornada.partes[viendo.parte].filename)}
              controls
              autoPlay
              playsInline
              className="w-full aspect-video bg-black"
            />

            {/* Selector de partes: solo aparece si la noche se cortó. */}
            {viendo.jornada.partes.length > 1 && (
              <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-zinc-800">
                {viendo.jornada.partes.map((parte, i) => (
                  <button
                    key={parte.filename}
                    onClick={() => setViendo({ ...viendo, parte: i })}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                      i === viendo.parte
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    Parte {i + 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
