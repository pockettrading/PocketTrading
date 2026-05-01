// login.js - Page-specific enhancements for login/register page
// File: js/login.js

(function() {
    'use strict';

    // Page-specific initialization
    function initLoginPage() {
        // Add any page-specific animations or effects
        animateCardsOnScroll();
        
        // Pre-fill demo credentials for testing (remove in production)
        setupDemoCredentials();
        
        // Track page view for analytics
        trackPageView();
        
        // Add input animations
        addInputAnimations();
    }

    // Animate elements on scroll
    function animateCardsOnScroll() {
        const cards = document.querySelectorAll('.feature-card, .stat-card');
        if (cards.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease-out';
            observer.observe(card);
        });
    }

    // Setup demo credentials (for testing only - remove in production)
    function setupDemoCredentials() {
        // Check if we're on a development environment
        const isDev = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
        
        if (isDev) {
            const loginEmail = document.getElementById('loginEmail');
            const loginPassword = document.getElementById('loginPassword');
            const demoHint = document.createElement('div');
            
            demoHint.style.cssText = `
                background: rgba(0, 216, 151, 0.1);
                padding: 12px;
                border-radius: 12px;
                margin-top: 16px;
                font-size: 12px;
                color: #00D897;
                text-align: center;
                cursor: pointer;
            `;
            demoHint.innerHTML = '🔑 Demo: Click to fill test credentials (Admin: ephremgojo@gmail.com)';
            demoHint.onclick = () => {
                if (loginEmail) loginEmail.value = 'ephremgojo@gmail.com';
                if (loginPassword) loginPassword.value = 'Admin123';
                auth.showSuccess('Demo credentials filled! Click Login to continue.');
            };
            
            const formSide = document.querySelector('.form-side');
            if (formSide && !document.querySelector('.demo-hint')) {
                demoHint.className = 'demo-hint';
                formSide.appendChild(demoHint);
            }
        }
    }

    // Track page views
    function trackPageView() {
        console.log('Login page viewed');
        // Add your analytics tracking here
        // Example: gtag('event', 'page_view', { page: 'login' });
    }

    // Add input animations
    function addInputAnimations() {
        const inputs = document.querySelectorAll('.form-group input');
        
        inputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement?.parentElement?.classList.add('focused');
            });
            
            input.addEventListener('blur', () => {
                if (!input.value) {
                    input.parentElement?.parentElement?.classList.remove('focused');
                }
            });
            
            // Check if input has value on load
            if (input.value) {
                input.parentElement?.parentElement?.classList.add('focused');
            }
        });
    }

    // Add custom CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .form-group {
            transition: all 0.3s ease;
        }
        
        .form-group.focused label {
            color: #00D897;
        }
        
        .form-group input:focus {
            transform: scale(1.01);
        }
        
        .submit-btn {
            position: relative;
            overflow: hidden;
        }
        
        .submit-btn::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.6s, height 0.6s;
        }
        
        .submit-btn:active::after {
            width: 300px;
            height: 300px;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        .input-error {
            animation: shake 0.3s ease-in-out;
            border-color: #FF4757 !important;
        }
        
        .demo-hint:hover {
            background: rgba(0, 216, 151, 0.2) !important;
            transform: scale(1.02);
            transition: all 0.2s;
        }
        
        /* Social login buttons (optional) */
        .social-login {
            margin-top: 32px;
            text-align: center;
        }
        
        .social-divider {
            position: relative;
            text-align: center;
            margin: 20px 0;
        }
        
        .social-divider::before,
        .social-divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: calc(50% - 30px);
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
        }
        
        .social-divider::before { left: 0; }
        .social-divider::after { right: 0; }
        
        .social-divider span {
            background: #1E2A3A;
            padding: 0 16px;
            font-size: 12px;
            color: #8B93A5;
        }
        
        .social-buttons {
            display: flex;
            gap: 16px;
            justify-content: center;
        }
        
        .social-btn {
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 20px;
            text-decoration: none;
        }
        
        .social-btn:hover {
            background: rgba(0, 216, 151, 0.1);
            border-color: #00D897;
            transform: translateY(-2px);
        }
    `;
    document.head.appendChild(style);

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLoginPage);
    } else {
        initLoginPage();
    }

    // Export any necessary functions globally
    window.togglePassword = function(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.type = field.type === 'password' ? 'text' : 'password';
        }
    };
})();
