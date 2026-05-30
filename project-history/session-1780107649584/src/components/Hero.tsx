import React from 'react';

const Hero: React.FC = () => {
  return (
    <section className="relative h-screen flex items-center justify-center text-center overflow-hidden bg-gradient-to-br from-gray-950 to-black text-white px-4">
      {/* Background Gradient Animation */}
      <div className="absolute inset-0 z-0 opacity-20" style={{
          background: 'linear-gradient(270deg, #1f2937, #0f172a, #1f2937)',
          backgroundSize: '200% 200%',
          animation: 'backgroundShift 15s ease infinite'
      }}></div>

      {/* Abstract Shapes */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-secondary-accent rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulseGlow delay-[1000ms]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-primary-accent rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulseGlow delay-[2000ms]"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 animate-fadeInUp opacity-0 delay-[500ms]">
          Innovate. <span className="text-primary-accent">Design.</span> Elevate.
        </h1>
        <p className="text-lg md:text-xl lg:text-2xl text-gray-300 mb-10 animate-fadeInUp opacity-0 delay-[1000ms]">
          We are a premium software agency crafting bespoke solutions that drive growth and redefine possibilities.
        </p>
        <a
          href="mailto:anointingting@gmail.com"
          className="inline-block bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-primary-accent/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 animate-fadeInUp opacity-0 delay-[1500ms]"
        >
          Get in Touch
        </a>
      </div>
    </section>
  );
};

export default Hero;