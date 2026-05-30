import React from 'react';
import ServiceCard from './ServiceCard';

const services = [
  {
    title: 'Software Development',
    description: 'Crafting robust, scalable, and intuitive software solutions tailored to your unique business needs.',
    icon: 'fa-solid fa-code',
  },
  {
    title: 'Creative Design',
    description: 'Designing captivating user interfaces and brand experiences that resonate with your audience and leave a lasting impression.',
    icon: 'fa-solid fa-palette',
  },
  {
    title: 'Strategic Consultancy',
    description: 'Guiding your digital journey with expert insights, strategic planning, and innovative solutions for sustainable growth.',
    icon: 'fa-solid fa-lightbulb',
  },
];

const ServicesSection: React.FC = () => {
  return (
    <section id="services" className="py-20 bg-dark-bg px-4">
      <div className="container mx-auto text-center">
        <h2 className="text-5xl font-display font-bold text-light-gray mb-16 animate-fadeInUp-slow">Our Expertise</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {services.map((service, index) => (
            <div key={service.title} className="animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
              <ServiceCard {...service} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;