import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {}

const DesignIcon: React.FC<IconProps> = (props) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v18"></path>
    <path d="M9.663 17a4.673 4.673 0 104.673 0M12 3v18"></path>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.373A8.001 8.001 0 0113 21H7a8.001 8.001 0 014-15.627z"></path>
  </svg>
);

export default DesignIcon;