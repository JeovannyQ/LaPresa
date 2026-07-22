import React from 'react';
import { Play, Radio, MapPin, ExternalLink, Video } from 'lucide-react';
import logoImg from '../assets/images/gallera_la_presa_logo_1784737350948.jpg';
import heroBgImg from '../assets/images/gallera_hero_bg_1784737363010.jpg';

interface HeroProps {
  onWatchLiveClick: () => void;
  onScheduleClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onWatchLiveClick, onScheduleClick }) => {
  return (
    <section id="hero" className="relative bg-zinc-50 text-zinc-900 overflow-hidden py-12 lg:py-20 border-b border-zinc-200">
      {/* Background image subtle ambient overlay */}
      <div className="absolute inset-0 z-0 opacity-10">
        <img 
          src={heroBgImg} 
          alt="Gallera La Presa" 
          className="w-full h-full object-cover filter contrast-125"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 via-zinc-50/90 to-zinc-50" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Main Info */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            
            {/* Tag badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              Presa de Tavera • Transmisión en Vivo por Twitch
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black font-display uppercase italic tracking-tighter text-zinc-900 leading-none">
              GALLERA <br />
              <span className="text-red-600">LA PRESA</span>
            </h1>

            {/* Subtitle / Description */}
            <p className="text-zinc-600 font-editorial italic text-lg sm:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Bienvenido al portal oficial. Sigue las jugadas tradicionales del Cibao en alta definición directamente desde la Presa de Tavera.
            </p>

            {/* Key details */}
            <div className="pt-1 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs font-mono text-zinc-700">
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-sm border border-zinc-200 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="font-semibold">Carretera Principal Presa de Tavera</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-sm border border-zinc-200 shadow-sm">
                <Video className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span className="font-semibold">Transmisión Twitch HD</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <button
                onClick={onWatchLiveClick}
                className="w-full sm:w-auto px-8 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-xs rounded-sm transition-all flex items-center justify-center gap-2.5 shadow-md shadow-red-600/25"
              >
                <Radio className="w-4 h-4 text-white animate-pulse" />
                <span>Ver Transmisión en Vivo</span>
              </button>

              <a
                href="https://twitch.tv/galleralapresa"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-zinc-100 text-zinc-900 font-bold uppercase tracking-widest text-xs rounded-sm border border-zinc-300 shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4 fill-current text-red-600" />
                <span>Twitch @galleralapresa</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>

          </div>

          {/* Prominent Logo & Photo Showcase */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-md bg-white rounded-md p-6 border border-zinc-200 shadow-lg text-center group">
              
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.3em] px-4 py-1 rounded-full shadow-sm">
                CLUB GALLÍSTICO
              </div>

              {/* Official Emblem Logo Image */}
              <div className="relative mx-auto w-full max-w-[280px] aspect-square rounded-md overflow-hidden bg-black p-2 border border-zinc-300 shadow-inner my-2">
                <img 
                  src={logoImg} 
                  alt="Club Gallístico La Presa - Logo Oficial" 
                  className="w-full h-full object-contain filter drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="pt-2">
                <h3 className="text-2xl font-black font-display uppercase italic tracking-tighter text-zinc-900">
                  CLUB GALLÍSTICO <span className="text-red-600">LA PRESA</span>
                </h3>
                <p className="text-xs font-editorial italic text-zinc-500 mt-1">
                  Presa de Tavera • Santiago / La Vega
                </p>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
