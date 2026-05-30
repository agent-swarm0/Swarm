import React from 'react';
import ServiceCard from './ServiceCard';
import CodeIcon from './icons/CodeIcon';
import DesignIcon from './icons/DesignIcon';
import ConsultancyIcon from './icons/ConsultancyIcon';

const Services: React.FC = () => {
  const services = [
    { icon: CodeIcon, title: 'Software Development', description: 'Crafting robust, scalable, and high-performance software solutions tailored to your unique business needs.', iconColorClass: 'text-primary-accent' },
    { icon: DesignIcon, title: 'Creative Design', description: 'Transforming complex ideas into intuitive, engaging, and visually stunning user experiences and brand identities.', iconColorClass: 'text-secondary-accent' },
    { icon: ConsultancyIcon, title: 'Strategic Consultancy', description: 'Providing expert guidance and strategic insights to optimize your tech stack, processes, and digital roadmap.', iconColorClass: 'text-tertiary-accent' },
  ];

  return (
    <section className="py-20 bg-dark-bg text-white px-4">
      <div className="max-w-6xl mx-auto text-center mb-16">
        <h2 className="font-display text-4xl md:text-5xl font-extrabold mb-6 animate-fadeInUp opacity-0">
          Our <span className="text-secondary-accent">Expertise</span>
        </h2>
        <p className="text-xl text-gray-300 animate-fadeInUp opacity-0 delay-[200ms]">
          Specializing in delivering cutting-edge solutions across the digital spectrum.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
        {services.map((service, index) => (
          <ServiceCard
            key={service.title}
            icon={service.icon}
            title={service.title}
            description={service.description}
            iconColorClass={service.iconColorClass}
            animationDelay={`${index * 0.2 + 0.4}s`} // Staggered animation
          />
        ))}
      </div>
    </section>
  );
};

export default Services;