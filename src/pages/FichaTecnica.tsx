import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Radio, ExternalLink, MessageSquare } from 'lucide-react';
import { HistorialJornadas } from '../components/HistorialJornadas';
import { GALLERA, whatsappUrl } from '../data/gallera';
import { getApiBase } from '../lib/api';
import fotoGallera from '../assets/images/gallera_logo_new.jpeg';

interface FichaTecnicaProps {
  onIrAlVivo: () => void;
}

export const FichaTecnica: React.FC<FichaTecnicaProps> = ({ onIrAlVivo }) => {
  const apiBase = getApiBase();
  const [enVivo, setEnVivo] = useState(false);

  // El distintivo "EN VIVO" consulta el estado real. Un badge rojo fijo diría
  // que hay jugada un martes a las diez de la mañana.
  useEffect(() => {
    let cancelado = false;

    const consultar = async () => {
      try {
        const res = await fetch(`${apiBase}/api/stream/status`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelado) setEnVivo(data.status === 'live');
      } catch {
        if (!cancelado) setEnVivo(false);
      }
    };

    consultar();
    const id = window.setInterval(consultar, 15000);
    return () => {
      cancelado = true;
      window.clearInterval(id);
    };
  }, [apiBase]);

  return (
    <main className="bg-zinc-950 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-sm overflow-hidden">
          {/* Cabecera.
              object-CONTAIN, no cover: lo que hay en assets es el logo del club,
              y recortarlo para llenar un marco apaisado le corta la cresta al
              gallo y las letras de los lados. Cuando el cliente mande la foto
              real de la gallera (la del techado con el letrero, como en su
              diseño), esto pasa a object-cover y el marco se llena de verdad. */}
          {/* Alto fijo y bajo, no un 16/7: el logo es cuadrado y en un marco
              apaisado quedaban 250 px de negro muerto a cada lado, que se lee
              como una foto rota. Una banda estrecha se lee como cabecera. El
              degradado evita que el fondo sea un rectángulo negro plano. */}
          <div className="relative h-36 sm:h-44 bg-[radial-gradient(ellipse_at_center,#27272a_0%,#000000_70%)] flex items-center justify-center p-3">
            <img
              src={fotoGallera}
              alt={`Gallera ${GALLERA.nombre}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Identidad */}
          <div className="px-4 sm:px-6 pt-4 pb-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-black uppercase italic tracking-tighter text-white leading-none">
                  {GALLERA.nombre}
                </h1>
                <p className="text-zinc-400 text-sm mt-1">{GALLERA.ciudad}</p>
              </div>

              <span
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  enVivo ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${enVivo ? 'bg-white animate-pulse' : 'bg-zinc-500'}`} />
                {enVivo ? 'En vivo' : 'Fuera de aire'}
              </span>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800 border-y border-zinc-800 mt-4">
              <div className="flex items-start gap-2.5 py-3 sm:pr-4">
                <Calendar className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Días de actividad</p>
                  <p className="text-sm text-white font-semibold">{GALLERA.diasActividad}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-3 sm:px-4">
                <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Recepción</p>
                  <p className="text-sm text-white font-semibold">{GALLERA.recepcion}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 py-3 sm:pl-4">
                <Clock className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Inicio</p>
                  <p className="text-sm text-white font-semibold">{GALLERA.inicio}</p>
                </div>
              </div>
            </div>

            {/* Ubicación */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-zinc-800">
              <div className="flex items-start gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-white">{GALLERA.direccion}</p>
                  <p className="text-[11px] text-zinc-500">{GALLERA.direccionDetalle}</p>
                </div>
              </div>

              <a
                href={GALLERA.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-sm text-xs font-bold text-white transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Ver en Maps
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>

            {/* Llamada a la acción */}
            <button
              onClick={onIrAlVivo}
              className="w-full mt-4 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-sm rounded-sm flex items-center justify-center gap-2.5 transition-colors shadow-lg shadow-red-600/20"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Ir al en vivo
            </button>

            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-2 px-6 py-2.5 bg-transparent hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-widest text-xs rounded-sm border border-zinc-700 flex items-center justify-center gap-2 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <HistorialJornadas apiBase={apiBase} />
    </main>
  );
};
