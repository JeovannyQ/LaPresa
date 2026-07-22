import React, { useState } from 'react';
import { Radio, ExternalLink, MapPin, Calendar, Phone, Menu, X, Play } from 'lucide-react';
import logoImg from '../assets/images/gallera_la_presa_logo_1784737350948.jpg';

interface NavbarProps {
  isLive: boolean;
  onNavigateToTwitch: () => void;
  onScrollTo: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isLive, onNavigateToTwitch, onScrollTo }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 text-zinc-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo & Branding */}
        <div 
          onClick={() => onScrollTo('hero')} 
          className="flex items-center gap-3 cursor-pointer group"
        >
          <img 
            src={logoImg} 
            alt="Gallera La Presa" 
            className="w-11 h-11 rounded-sm border border-zinc-300 object-cover shadow-sm group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.4em] font-extrabold text-red-600">
                TRADICIÓN DOMINICANA
              </span>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest bg-red-600 text-white animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  VIVO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Twitch HD
                </span>
              )}
            </div>
            <span className="font-display text-lg sm:text-xl font-black uppercase italic tracking-tighter text-zinc-900">
              GALLERA <span className="text-red-600">LA PRESA</span>
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => onScrollTo('live-stream')}
            className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-900 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>Transmisión en Vivo</span>
          </button>

          <button 
            onClick={() => onScrollTo('schedule')}
            className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-700 hover:text-red-600 transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-red-600" />
            <span>Jugadas & Cartelera</span>
          </button>

          <button 
            onClick={() => onScrollTo('location')}
            className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-zinc-700 hover:text-red-600 transition-colors flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-red-600" />
            <span>Ubicación</span>
          </button>
        </nav>

        {/* Right Action Button - Twitch Direct */}
        <div className="hidden sm:flex items-center gap-3">
          <a
            href="https://twitch.tv/galleralapresa"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-[0.2em] text-[11px] rounded-sm transition-all flex items-center gap-2 shadow-md shadow-red-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Ver en Twitch</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>
        </div>

        {/* Mobile menu trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-zinc-700 hover:text-red-600 focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-zinc-200 px-4 pt-3 pb-6 space-y-3">
          <button
            onClick={() => { onScrollTo('live-stream'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2.5 px-3 rounded-sm bg-red-50 border border-red-200 text-red-600 font-bold text-xs uppercase tracking-widest flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-600" /> Transmisión en Vivo
            </span>
            <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black">VIVO</span>
          </button>

          <button
            onClick={() => { onScrollTo('schedule'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2.5 px-3 rounded-sm text-zinc-800 hover:bg-zinc-100 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-red-600" /> Jugadas & Cartelera
          </button>

          <button
            onClick={() => { onScrollTo('location'); setMobileMenuOpen(false); }}
            className="w-full text-left py-2.5 px-3 rounded-sm text-zinc-800 hover:bg-zinc-100 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <MapPin className="w-4 h-4 text-red-600" /> Ubicación y Mapa
          </button>

          <a
            href="https://twitch.tv/galleralapresa"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-sm shadow mt-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Abrir en Twitch TV</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
    </header>
  );
};
