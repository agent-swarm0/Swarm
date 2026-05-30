import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-10 bg-gradient-to-t from-gray-950 to-black text-gray-400 text-center px-4">
      <div className="max-w-6xl mx-auto">
        <p className="mb-4 text-lg animate-fadeInUp opacity-0 delay-[200ms]">
          Ready to elevate your digital presence?
        </p>
        <a
          href="mailto:anointingting@gmail.com"
          className="inline-block bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-primary-accent/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 mb-8 animate-fadeInUp opacity-0 delay-[400ms]"
        >
          Start Your Project Today
        </a>
        <p className="text-sm animate-fadeInUp opacity-0 delay-[600ms]">
          &copy; {new Date().getFullYear()} Premium Software Agency. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;