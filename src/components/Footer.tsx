import React from 'react';
import { MapPin, Radio, Heart, ExternalLink } from 'lucide-react';
import logoImg from '../assets/images/gallera_la_presa_logo_1784737350948.jpg';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-zinc-100 text-zinc-600 py-12 border-t border-zinc-200 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-zinc-200">
          
          {/* Logo & Info */}
          <div className="flex items-center gap-3 text-center md:text-left">
            <img 
              src={logoImg} 
              alt="Gallera La Presa" 
              className="w-11 h-11 rounded-sm border border-zinc-300 object-cover shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="font-display font-black text-lg text-zinc-900 uppercase italic tracking-tighter">
                CLUB GALLÍSTICO <span className="text-red-600">LA PRESA</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px] uppercase tracking-wider mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-red-600" />
                <span>Carretera principal de la Presa de Tavera</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold uppercase tracking-widest">
            <a
              href="https://twitch.tv/galleralapresa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 hover:text-red-600 transition-colors flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-red-600" />
              <span>Twitch Ruedo 1</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            <a
              href="https://twitch.tv/galleralapresa_ruedo2"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-900 hover:text-red-600 transition-colors flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-red-600" />
              <span>Twitch Ruedo 2</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
          <div>
            © {new Date().getFullYear()} Club Gallístico La Presa. Todos los derechos reservados.
          </div>
          <div>
            Carretera principal de la Presa de Tavera • República Dominicana
          </div>
        </div>

      </div>
    </footer>
  );
};
