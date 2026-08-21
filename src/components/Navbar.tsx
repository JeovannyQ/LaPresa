import React from 'react';
import { Radio, FileText, Video } from 'lucide-react';
import logoImg from '../assets/images/gallera_logo_new.jpeg';
import type { Ruta } from '../App';

interface NavbarProps {
  rutaActiva: Ruta;
  onNavegar: (ruta: Ruta) => void;
  onBroadcastClick: () => void;
}

/**
 * Dos destinos y nada más: el en vivo y la ficha.
 *
 * Antes había menú desplegable para móvil porque los enlaces no cabían. Con dos
 * caben de sobra en cualquier pantalla, así que el desplegable sobra: un botón
 * menos que pulsar para llegar a lo mismo.
 */
export const Navbar: React.FC<NavbarProps> = ({ rutaActiva, onNavegar, onBroadcastClick }) => {
  // whitespace-nowrap: sin esto "En vivo" se parte en dos líneas en cuanto la
  // pantalla se estrecha, y la barra crece a lo alto.
  const claseEnlace = (ruta: Ruta) =>
    `px-2.5 sm:px-3 py-2 rounded-sm text-[11px] sm:text-xs font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 transition-colors ${
      rutaActiva === ruta
        ? 'bg-zinc-800 text-white'
        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <button
          onClick={() => onNavegar('portada')}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          <img
            src={logoImg}
            alt="Gallera La Presa"
            className="w-9 h-9 rounded-sm border border-zinc-700 object-cover shrink-0"
            referrerPolicy="no-referrer"
          />
          {/* El nombre se oculta en pantallas muy estrechas: compitiendo con los
              dos enlaces salía cortado ("LA PRE..."), que se ve peor que no
              estar. El logo ya identifica la gallera y sigue llevando al inicio. */}
          <span className="hidden sm:inline font-display text-base sm:text-lg font-black uppercase italic tracking-tighter text-white">
            LA <span className="text-red-600">PRESA</span>
          </span>
        </button>

        <nav className="flex items-center gap-1 ml-auto">
          {/* aria-current: cuál de los dos está abierto se dice aquí sólo con el
              fondo gris, que un lector de pantalla no ve. Sin esto los dos se
              anuncian igual y no hay forma de saber en cuál estás. */}
          <button
            onClick={() => onNavegar('portada')}
            className={claseEnlace('portada')}
            aria-current={rutaActiva === 'portada' ? 'page' : undefined}
          >
            <Radio className="w-3.5 h-3.5 text-red-500" />
            <span>En vivo</span>
          </button>

          <button
            onClick={() => onNavegar('ficha')}
            className={claseEnlace('ficha')}
            aria-current={rutaActiva === 'ficha' ? 'page' : undefined}
          >
            <FileText className="w-3.5 h-3.5 text-red-500" />
            <span>Ficha</span>
          </button>

          {/* El panel del operador. Discreto a propósito: no es para el público. */}
          <button
            onClick={onBroadcastClick}
            className="p-2 ml-1 text-zinc-500 hover:text-white transition-colors"
            title="Panel del operador"
            aria-label="Panel del operador"
          >
            <Video className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </header>
  );
};
