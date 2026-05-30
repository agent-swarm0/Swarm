document.addEventListener('DOMContentLoaded', () => {
    // Current year for the footer
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Hamburger Menu Functionality
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    const body = document.body;

    if (hamburgerMenu && navLinks) {
        // Set initial aria-expanded state
        hamburgerMenu.setAttribute('aria-expanded', 'false');
        // Add aria-controls for accessibility, linking button to menu
        navLinks.setAttribute('id', 'mobile-navigation');
        hamburgerMenu.setAttribute('aria-controls', 'mobile-navigation');

        hamburgerMenu.addEventListener('click', () => {
            const isExpanded = hamburgerMenu.classList.toggle('active'); // Toggles 'active' and returns true if added, false if removed
            navLinks.classList.toggle('active');
            body.classList.toggle('no-scroll');

            // Accessibility: Update aria-expanded attribute
            hamburgerMenu.setAttribute('aria-expanded', isExpanded);

            // Optional: Manage focus for accessibility
            // When menu opens, focus the first link. When closes, return focus to hamburger.
            if (isExpanded) {
                // Delay focus to allow menu to render and become visible
                setTimeout(() => {
                    const firstLink = navLinks.querySelector('a');
                    if (firstLink) {
                        firstLink.focus();
                    }
                }, 100); // Short delay
            } else {
                hamburgerMenu.focus(); // Return focus to the hamburger button
            }
        });

        // Close menu when a navigation link is clicked (for single-page navigation)
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                if (navLinks.classList.contains('active')) {
                    hamburgerMenu.classList.remove('active');
                    navLinks.classList.remove('active');
                    body.classList.remove('no-scroll');
                    hamburgerMenu.setAttribute('aria-expanded', 'false');
                    // Immediately return focus to the hamburger button after closing
                    hamburgerMenu.focus(); 
                }
            });
        });

        // Close menu if ESC key is pressed
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && navLinks.classList.contains('active')) {
                hamburgerMenu.classList.remove('active');
                navLinks.classList.remove('active');
                body.classList.remove('no-scroll');
                hamburgerMenu.setAttribute('aria-expanded', 'false');
                hamburgerMenu.focus(); // Return focus to the hamburger button
            }
        });
    }

    // Scroll-triggered animations (fadeInUp)
    const fadeInElements = document.querySelectorAll('.fade-in-up');

    const observerOptions = {
        root: null, // relative to the viewport
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the item is visible
    };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once animated
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    fadeInElements.forEach(el => observer.observe(el));

    // Konami Code Easter Egg (retained functionality from previous steps with minimalistic feedback)
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiCodePosition = 0;

    document.addEventListener('keydown', (e) => {
        // If the pressed key matches the next key in the sequence
        if (e.key === konamiCode[konamiCodePosition]) {
            konamiCodePosition++;
            // If the entire sequence has been entered
            if (konamiCodePosition === konamiCode.length) {
                triggerEasterEgg();
                konamiCodePosition = 0; // Reset position after successful entry
            }
        } else {
            konamiCodePosition = 0; // Reset if the sequence is broken
        }
    });

    function triggerEasterEgg() {
        console.log('Konami Code Activated! Digital Alchemy secrets revealed!');
        // Providing a simple alert for visible feedback, consistent with minimalism.
        alert('Digital Alchemy: Secret Mode Activated!'); 
    }
});