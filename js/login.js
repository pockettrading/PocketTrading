// Login page specific enhancements - PocketTrading
// File: js/login.js

(function() {
    'use strict';

    // Wait for DOM and auth to be ready
    document.addEventListener('DOMContentLoaded', async () => {
        // Wait a bit for auth to initialize
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // If user is already logged in, redirect to home
        if (typeof auth !== 'undefined' && auth.isLoggedIn()) {
            window.location.href = 'home.html';
            return;
        }
        
        setupPageEnhancements();
    });

    function setupPageEnhancements() {
        // Add enter key support
        setupEnterKeySupport();
        
        // Add input animations
        addInputFocusEffects();
        
        // Pre-fill demo credentials in development
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            addDemoCredentialsButton();
        }
        
        // Add password toggle functionality if not already present
        enhancePasswordToggles();
    }

    function setupEnterKeySupport() {
        const inputs = document.querySelectorAll('#loginForm input, #registerForm input');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const activeForm = document.querySelector('.auth-form.active');
                    const submitBtn = activeForm?.querySelector('.submit-btn');
                    if (submitBtn) submitBtn.click();
                }
            });
        });
    }

    function addInputFocusEffects() {
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
        });
    }

    function addDemoCredentialsButton() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm && !document.querySelector('.demo-credentials-btn')) {
            const demoBtn = document.createElement('button');
            demoBtn.type = 'button';
            demoBtn.className = 'demo-credentials-btn';
            demoBtn.textContent = '🔑 Demo: Admin Login';
            demoBtn.style.cssText = `
                width: 100%;
                margin-top: 12px;
                padding: 10px;
                background: rgba(0, 216, 151, 0.1);
                border: 1px solid rgba(0, 216, 151, 0.3);
                border-radius: 40px;
                color: #00D897;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            `;
            demoBtn.onmouseenter = () => {
                demoBtn.style.background = 'rgba(0, 216, 151, 0.2)';
            };
            demoBtn.onmouseleave = () => {
                demoBtn.style.background = 'rgba(0, 216, 151, 0.1)';
            };
            demoBtn.onclick = () => {
                const emailField = document.getElementById('loginEmail');
                const passwordField = document.getElementById('loginPassword');
                if (emailField && passwordField) {
                    emailField.value = 'ephremgojo@gmail.com';
                    passwordField.value = 'Admin123';
                    if (typeof showNotification === 'function') {
                        showNotification('Demo admin credentials filled!', 'info');
                    }
                    // Trigger input events to update validation styles
                    emailField.dispatchEvent(new Event('input'));
                    passwordField.dispatchEvent(new Event('input'));
                }
            };
            loginForm.appendChild(demoBtn);
        }
    }

    function enhancePasswordToggles() {
        // Ensure all password toggles work
        const toggles = document.querySelectorAll('.password-toggle');
        toggles.forEach(toggle => {
            if (!toggle.hasAttribute('data-enhanced')) {
                toggle.setAttribute('data-enhanced', 'true');
                // The click handler is already set in the HTML
            }
        });
    }

    // Add CSS for focus effects
    const style = document.createElement('style');
    style.textContent = `
        .form-group.focused label {
            color: #00D897;
        }
        .form-group input:focus {
            transform: scale(1.01);
        }
        .demo-credentials-btn:hover {
            transform: translateY(-1px);
        }
    `;
    document.head.appendChild(style);
})();

// Ensure togglePassword is globally available
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.type = field.type === 'password' ? 'text' : 'password';
    }
};
