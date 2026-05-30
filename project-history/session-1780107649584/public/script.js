document.addEventListener('DOMContentLoaded', () => {
    // --- Navbar Responsiveness and Hamburger Menu ---
    const menuToggle = document.getElementById('menu-toggle');
    const navbarLinks = document.getElementById('navbar-links');

    if (menuToggle && navbarLinks) {
        menuToggle.addEventListener('click', () => {
            navbarLinks.classList.toggle('navbar-open');
            // Toggle hamburger icon (e.g., bars to times)
            const icon = menuToggle.querySelector('i');
            if (navbarLinks.classList.contains('navbar-open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
                menuToggle.setAttribute('aria-expanded', 'true');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when a nav link is clicked (for smooth single-page navigation)
        navbarLinks.querySelectorAll('.nav-link, .cta-button').forEach(link => {
            link.addEventListener('click', () => {
                if (navbarLinks.classList.contains('navbar-open')) {
                    navbarLinks.classList.remove('navbar-open');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            });
        });

        // Close menu on window resize if it becomes desktop size (768px is Tailwind's 'md' breakpoint)
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) {
                if (navbarLinks.classList.contains('navbar-open')) {
                    navbarLinks.classList.remove('navbar-open');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                    menuToggle.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    // --- Scroll-triggered fade-in-up animation for service cards ---
    const serviceCards = document.querySelectorAll('.service-card');
    const fadeInObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the item is visible

    serviceCards.forEach(card => {
        fadeInObserver.observe(card);
    });

    // --- Konami Code Easter Egg (retained from previous versions) ---
    const konamiCode = [
        'ArrowUp', 'ArrowUp',
        'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight',
        'ArrowLeft', 'ArrowRight',
        'b', 'a'
    ];
    let konamiCodePosition = 0;

    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiCodePosition]) {
            konamiCodePosition++;
            if (konamiCodePosition === konamiCode.length) {
                // Minimalistic feedback for Konami Code activation
                alert('Konami Code Activated! Welcome to the Matrix of Digital Alchemy!');
                konamiCodePosition = 0; // Reset for next time
            }
        } else {
            konamiCodePosition = 0; // Reset if incorrect key is pressed
        }
    });

});