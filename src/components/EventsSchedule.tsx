import React from 'react';
import { Calendar, Trophy, Radio, MapPin, Clock, ArrowRight, Share2, Bell } from 'lucide-react';
import { FightEvent } from '../types';

interface EventsScheduleProps {
  events: FightEvent[];
  onWatchLive: () => void;
}

export const EventsSchedule: React.FC<EventsScheduleProps> = ({ events, onWatchLive }) => {
  return (
    <section id="schedule" className="py-20 bg-zinc-50 text-zinc-900 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendario Oficial</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-zinc-900">
            PRÓXIMAS <span className="text-red-600">JUGADAS</span> Y TORNEOS
          </h2>
          <p className="text-zinc-600 font-editorial italic text-base sm:text-lg mt-2">
            No te pierdas ninguna jornada. Todas las grandes jugadas de Gallera La Presa se transmiten en vivo desde nuestra plataforma.
          </p>
        </div>

        {/* Events Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {events.map((evt) => (
            <div
              key={evt.id}
              className={`bg-white rounded-sm p-6 border transition-all duration-300 flex flex-col justify-between relative shadow-sm hover:shadow-md hover:-translate-y-1 ${
                evt.isLive
                  ? 'border-red-600 ring-2 ring-red-600/20'
                  : 'border-zinc-200 hover:border-red-600/50'
              }`}
            >
              {evt.isLive && (
                <div className="absolute -top-3 right-6 bg-red-600 text-white font-black text-[9px] uppercase tracking-[0.25em] px-3 py-1 rounded-sm shadow-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>TRANSMITIENDO EN VIVO</span>
                </div>
              )}

              <div>
                {/* Date & Time Header */}
                <div className="flex items-center gap-2 text-red-600 text-xs font-mono font-bold mb-3 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{evt.date} • {evt.time}</span>
                </div>

                {/* Event Name */}
                <h3 className="text-2xl font-display font-black uppercase italic tracking-tighter text-zinc-900 leading-tight mb-3">
                  {evt.title}
                </h3>

                <p className="text-xs text-zinc-600 font-editorial italic leading-relaxed mb-5">
                  {evt.description}
                </p>

                {/* Prize Pool Badge */}
                {evt.prizePool && (
                  <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs font-mono font-bold px-3 py-1.5 rounded-sm mb-6 uppercase tracking-wider">
                    <Trophy className="w-3.5 h-3.5 text-red-600" />
                    <span>{evt.prizePool}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-zinc-200 space-y-2">
                <button
                  onClick={onWatchLive}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-sm shadow-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Radio className="w-3.5 h-3.5 text-white" />
                  <span>Ver transmisión</span>
                </button>

                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`📢 ¡Acompáñanos a la jugada de Gallera La Presa! Evento: ${evt.title} - ${evt.date}. Transmisión: ${window.location.origin}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-zinc-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Invitar por WhatsApp</span>
                </a>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
