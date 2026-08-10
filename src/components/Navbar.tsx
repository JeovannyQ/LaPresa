import React, { useState } from 'react';
import { Radio, ExternalLink, MapPin, Calendar, Phone, Menu, X, Play, Video, Film } from 'lucide-react';
import logoImg from '../assets/images/gallera_logo_new.jpeg';

interface NavbarProps {
  isLive: boolean;
  onScrollTo: (id: string) => void;
  onBroadcastClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isLive, onScrollTo, onBroadcastClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 text-zinc-100 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo & Branding */}
        <div 
          onClick={() => onScrollTo('hero')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img 
            src={logoImg} 
            alt="Gallera La Presa" 
            className="w-11 h-11 rounded-sm border border-zinc-700 object-cover shadow-sm group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.4em] font-extrabold text-red-500">
                TRADICIÓN DOMINICANA
              </span>
            </div>
            <span className="font-display text-lg sm:text-xl font-black uppercase italic tracking-tighter text-white">
              CLUB GALLÍSTICO <span className="text-red-600">LA PRESA</span>
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden xl:flex items-center gap-6">
          <button 
            onClick={() => onScrollTo('live-stream')}
            className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-white hover:text-red-500 transition-colors flex items-center gap-2"
          >
            <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>Transmisión en Vivo</span>
          </button>

          <button 
            onClick={() => onScrollTo('fight-clips')}
            className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-300 hover:text-red-500 transition-colors flex items-center gap-1.5"
          >
            <Film className="w-3.5 h-3.5 text-red-500" />
            <span>Clips & Combates</span>
          </button>

          <button 
            onClick={() => onScrollTo('location')}
            className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-300 hover:text-red-500 transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>Ubicación</span>
          </button>
        </nav>

        {/* Right Side Items */}
        <div className="flex items-center gap-3 ml-auto xl:ml-0">
          
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            <button
              onClick={onBroadcastClick}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase tracking-[0.1em] text-[10px] rounded-sm transition-all flex items-center gap-1.5 border border-zinc-700 shadow"
            >
              <Video className="w-3.5 h-3.5 text-red-500" />
              <span>Emitir (Admin)</span>
            </button>

            <a
              href="#live-stream"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-sm transition-all flex items-center gap-2 shadow"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Ver transmisión</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-zinc-200 hover:text-red-500 focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-zinc-950 border-b border-zinc-800 px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => { onScrollTo('live-stream'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2.5 px-3 rounded-sm bg-red-950/60 border border-red-800/60 text-red-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Radio className="w-4 h-4 text-red-500" /> Transmisión en Vivo
          </button>

          <button
            onClick={() => { onScrollTo('fight-clips'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2.5 px-3 rounded-sm text-zinc-200 hover:bg-zinc-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Film className="w-4 h-4 text-red-500" /> Clips & Combates
          </button>

          <button
            onClick={() => { onScrollTo('location'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2.5 px-3 rounded-sm text-zinc-200 hover:bg-zinc-900 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-red-500" /> Ubicación y Mapa
          </button>

          <button
            onClick={() => { onBroadcastClick(); setMobileMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-sm shadow mt-4 border border-zinc-700"
          >
            <Video className="w-4 h-4 text-red-500" />
            <span>Emitir Transmisión (Admin)</span>
          </button>

          <a
            href="#live-stream"
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-sm shadow mt-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Ver transmisión</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </header>
  );
};
