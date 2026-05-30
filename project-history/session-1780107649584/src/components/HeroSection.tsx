import React from 'react';

const HeroSection: React.FC = () => {
  return (
    <section className="relative h-screen flex items-center justify-center text-center overflow-hidden bg-dark-bg px-4">
      <div className="relative z-10 max-w-4xl mx-auto">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-extrabold text-light-gray leading-tight mb-6 animate-fadeInUp">
          Digital Alchemy Agency
        </h1>
        <p className="text-lg md:text-xl text-medium-gray mb-10 max-w-2xl mx-auto animate-fadeInUp animation-delay-300">
          Transforming Visions into Digital Realities with Precision and Innovation.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fadeInUp animation-delay-600">
          <a
            href="mailto:anointingting@gmail.com"
            className="px-8 py-3 bg-light-gray text-dark-bg font-bold rounded-full shadow-lg hover:bg-medium-gray transition-colors duration-300 transform hover:scale-105"
          >
            Get in Touch
          </a>
          <a
            href="#services"
            className="px-8 py-3 border border-medium-gray text-light-gray font-bold rounded-full hover:bg-soft-accent hover:border-soft-accent transition-colors duration-300 transform hover:scale-105"
          >
            Our Services
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;