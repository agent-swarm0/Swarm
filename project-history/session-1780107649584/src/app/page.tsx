import React from 'react';
import HeroSection from '../components/HeroSection';
import ServicesSection from '../components/ServicesSection';
import FooterSection from '../components/FooterSection';

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-bg text-light-gray font-sans">
      <HeroSection />
      <ServicesSection />
      <FooterSection />
    </div>
  );
}