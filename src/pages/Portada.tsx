import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';
import { LiveStreamSection } from '../components/LiveStreamSection';
import { GALLERA } from '../data/gallera';

interface PortadaProps {
  onVerFicha: () => void;
}

/**
 * La portada hace una sola cosa: enseñar el en vivo.
 *
 * Todo lo demás —horarios, ubicación, jugadas anteriores— vive en la ficha
 * técnica. El público que entra aquí un domingo a las ocho viene a ver la
 * jugada, no a leer.
 */
export const Portada: React.FC<PortadaProps> = ({ onVerFicha }) => (
  <main className="bg-zinc-950 min-h-screen">
    <LiveStreamSection />

    <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12">
      <button
        onClick={onVerFicha}
        className="w-full flex items-center gap-3 px-4 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-sm text-left transition-colors"
      >
        <FileText className="w-5 h-5 text-red-500 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-white">Ficha de {GALLERA.nombre}</span>
          <span className="block text-xs text-zinc-400">
            Horarios, ubicación y jugadas anteriores
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0" />
      </button>
    </div>
  </main>
);
