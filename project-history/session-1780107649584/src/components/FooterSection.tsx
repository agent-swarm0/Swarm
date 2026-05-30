import React from 'react';

const FooterSection: React.FC = () => {
  return (
    <footer className="bg-dark-bg py-10 border-t border-border-dark text-center px-4">
      <div className="container mx-auto">
        <p className="text-medium-gray text-sm">
          &copy; {new Date().getFullYear()} Digital Alchemy Agency. All rights reserved.
        </p>
        <p className="text-medium-gray text-xs mt-2">
          Crafted with care and precision.
        </p>
      </div>
    </footer>
  );
};

export default FooterSection;