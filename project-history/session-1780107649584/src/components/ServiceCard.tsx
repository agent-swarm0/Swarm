import React from 'react';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: string; // Assuming a Font Awesome icon class or similar
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, icon }) => {
  return (
    <div className="relative bg-dark-bg border border-border-dark rounded-xl p-8 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-102 flex flex-col items-start text-left">
      <div className="text-soft-accent text-4xl mb-4">
        <i className={icon}></i>
      </div>
      <h3 className="text-2xl font-display font-semibold text-light-gray mb-3">{title}</h3>
      <p className="text-medium-gray text-base">{description}</p>
    </div>
  );
};

export default ServiceCard;