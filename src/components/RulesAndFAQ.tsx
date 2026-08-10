import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ShieldAlert, Radio, Scale, MessageSquare } from 'lucide-react';

export const RulesAndFAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "¿Dónde puedo ver las transmisiones en vivo?",
      a: "Puedes ver las peleas totalmente en vivo directamente desde esta página web."
    },
    {
      q: "¿Cuáles son los días de jugada en Gallera La Presa?",
      a: "Nuestras jugadas habituales se realizan los días Viernes y Sábados a partir de las 3:00 PM, además de torneos especiales los Domingos según calendario."
    },
    {
      q: "¿Cómo puedo inscribir mi traba o reservar gallos?",
      a: "Para pesar e inscribir gallos o apartar jaulas, puedes escribir directamente a nuestro número de WhatsApp o acudir al área de pesaje a partir de la 1:00 PM los días de evento."
    },
    {
      q: "¿Cuál es la ubicación exacta de la gallera?",
      a: "Estamos ubicados en la Carretera principal de la Presa de Tavera, con parqueo privado y fácil acceso vial desde Santiago, La Vega y Moca."
    }
  ];

  return (
    <section className="py-16 bg-[#0c0c0c] text-white border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-red-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Información Útil</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-black uppercase italic tracking-tighter text-white">
            PREGUNTAS <span className="text-red-600">FRECUENTES</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="bg-[#151515] rounded-sm border border-white/10 overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full p-4 text-left font-bold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center justify-between gap-4 hover:text-red-500 transition-colors"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-red-600 transition-transform duration-200 ${openIdx === idx ? 'rotate-180' : ''}`} />
              </button>

              {openIdx === idx && (
                <div className="px-4 pb-4 text-xs sm:text-sm text-zinc-400 font-editorial italic border-t border-white/10 pt-3 leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
