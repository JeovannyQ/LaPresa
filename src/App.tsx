import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { LiveStreamSection } from './components/LiveStreamSection';
import { FightClipsSection } from './components/FightClipsSection';
import { LocationContact } from './components/LocationContact';
import { Footer } from './components/Footer';
import { BroadcastPanel } from './components/BroadcastPanel';

export default function App() {
  const [isLive] = useState(true);
  const [broadcastPanelOpen, setBroadcastPanelOpen] = useState(false);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-red-600 selection:text-white">
      
      {/* Sticky Navigation */}
      <Navbar
        isLive={isLive}
        onScrollTo={handleScrollTo}
        onBroadcastClick={() => setBroadcastPanelOpen(true)}
      />

      {/* Main Content Sections */}
      <main>
        <Hero
          onWatchLiveClick={() => handleScrollTo('live-stream')}
        />

        <LiveStreamSection currentFightNumber={14} />

        <FightClipsSection />

        <LocationContact />
      </main>

      {/* Footer */}
      <Footer />

      {/* Admin Broadcast Panel (Slide-in Drawer) */}
      <BroadcastPanel
        isOpen={broadcastPanelOpen}
        onClose={() => setBroadcastPanelOpen(false)}
      />

    </div>
  );
}
