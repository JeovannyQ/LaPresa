import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { LiveStreamSection } from './components/LiveStreamSection';
import { EventsSchedule } from './components/EventsSchedule';
import { LocationContact } from './components/LocationContact';
import { Footer } from './components/Footer';
import { INITIAL_EVENTS } from './data/mockData';

export default function App() {
  const [isLive] = useState(true);

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-red-600 selection:text-white">
      
      {/* Sticky Navigation */}
      <Navbar
        isLive={isLive}
        onNavigateToTwitch={() => window.open('https://twitch.tv/galleralapresa', '_blank')}
        onScrollTo={handleScrollTo}
      />

      {/* Main Content Sections */}
      <main>
        <Hero
          onWatchLiveClick={() => handleScrollTo('live-stream')}
          onScheduleClick={() => handleScrollTo('schedule')}
        />

        <LiveStreamSection currentFightNumber={14} />

        <EventsSchedule
          events={INITIAL_EVENTS}
          onWatchLive={() => handleScrollTo('live-stream')}
        />

        <LocationContact />
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
