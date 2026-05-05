// Login Page Controller - PocketTrading
// File: js/login.js
// Pure Supabase - No localStorage

(function() {
    'use strict';

    let currentUser = null;

    // Initialize page
    document.addEventListener('DOMContentLoaded', async () => {
        await waitForAuth();
        
        currentUser = auth.getUser();
        
        if (currentUser) {
            window.location.href = 'index.html';
            return;
        }
        
        setupEventListeners();
        setupRealTimeValidation();
    });

    // Wait for auth to be ready
    function waitForAuth() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof auth !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    // Toggle password visibility
    window.togglePassword = function(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.type = field.type === 'password' ? 'text' : 'password';
        }
    };

    // Close forgot password modal
    window.closeForgotModal = function() {
        const modal = document.getElementById('forgotModal');
        if (modal) modal.style.display = 'none';
        const resetEmail = document.getElementById('resetEmail');
        if (resetEmail) resetEmail.value = '';
    };

    // Send reset link
    window.sendResetLink = async function() {
        const email = document.getElementById('resetEmail').value.trim();
        
        if (!email) {
            showNotification('Please enter your email', 'error');
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        try {
            if (typeof supabaseDB !== 'undefined') {
                const user = await supabaseDB.getUserByEmail(email);
                if (user) {
                    showNotification(`Password reset link sent to ${email}. Check your inbox.`, 'success');
                    closeForgotModal();
                } else {
                    showNotification('No account found with this email', 'error');
                }
            } else {
                showNotification('System loading. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error sending reset link:', error);
            showNotification('Failed to send reset link', 'error');
        }
    };

    // Setup event listeners
    function setupEventListeners() {
        // Login button
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', handleLogin);
        }
        
        // Register button
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', handleRegister);
        }
        
        // Enter key support
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        
        if (loginEmail) {
            loginEmail.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }
        if (loginPassword) {
            loginPassword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleLogin();
            });
        }
        
        // Forgot password link
        const forgotLink = document.getElementById('forgotPassword');
        if (forgotLink) {
            forgotLink.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('forgotModal');
                if (modal) modal.style.display = 'flex';
            });
        }
        
        // Close modal on outside click
        const modal = document.getElementById('forgotModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeForgotModal();
            });
        }
        
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const loginForm = document.getElementById('loginForm');
                const registerForm = document.getElementById('registerForm');
                
                if (tab === 'login') {
                    loginForm.classList.add('active');
                    registerForm.classList.remove('active');
                } else {
                    loginForm.classList.remove('active');
                    registerForm.classList.add('active');
                }
            });
        });
    }

    // Handle login
    async function handleLogin() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // Validate inputs
        if (!email || !password) {
            showNotification('Please enter email and password', 'error');
            return;
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            showNotification('Please enter a valid email address', 'error');
            return;
        }
        
        if (password.length < 1) {
            showNotification('Please enter your password', 'error');
            return;
        }
        
        // Disable button to prevent double submission
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.disabled = true;
        loginBtn.textContent = 'Logging in...';
        
        try {
            const success = await auth.login(email, password, rememberMe);
            
            if (success) {
                showNotification('Login successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                loginBtn.disabled = false;
                loginBtn.textContent = 'Login →';
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please try again.', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Login →';
        }
    }

    // Handle registration
    async function handleRegister() {
        const fullName = document.getElementById('regFullName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;
        const termsAgree = document.getElementById('termsAgree').checked;
        
        // Validate full name
        const nameParts = fullName.split(/\s+/);
        if (nameParts.length < 2) {
            showNotification('Please enter your full name (first and last name)', 'error');
            document.getElementById('regFullName').focus();
            return;
        }
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showNotification('Please enter a valid email address', 'error');
            document.getElementById('regEmail').focus();
            return;
        }
        
        // Validate password length
        if (password.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            document.getElementById('regPassword').focus();
            return;
        }
        
        // Validate password match
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            document.getElementById('regConfirmPassword').focus();
            return;
        }
        
        // Validate terms
        if (!termsAgree) {
            showNotification('Please agree to the Terms of Service', 'error');
            return;
        }
        
        // Disable button
        const registerBtn = document.getElementById('registerBtn');
        registerBtn.disabled = true;
        registerBtn.textContent = 'Creating Account...';
        
        try {
            const success = await auth.register(fullName, email, password);
            
            if (success) {
                showNotification('Registration successful! Redirecting...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1500);
            } else {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account →';
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed. Please try again.', 'error');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account →';
        }
    }

    // Real-time validation for register form
    function setupRealTimeValidation() {
        const regFullName = document.getElementById('regFullName');
        const regEmail = document.getElementById('regEmail');
        const regPassword = document.getElementById('regPassword');
        const regConfirmPassword = document.getElementById('regConfirmPassword');
        
        if (regFullName) {
            regFullName.addEventListener('input', () => {
                const nameParts = regFullName.value.trim().split(/\s+/);
                const nameError = document.getElementById('nameError');
                if (nameParts.length < 2 && regFullName.value.length > 0) {
                    regFullName.classList.add('error');
                    regFullName.classList.remove('valid');
                    nameError.style.display = 'block';
                } else if (regFullName.value.length === 0) {
                    regFullName.classList.remove('error', 'valid');
                    nameError.style.display = 'none';
                } else {
                    regFullName.classList.remove('error');
                    regFullName.classList.add('valid');
                    nameError.style.display = 'none';
                }
            });
        }
        
        if (regEmail) {
            regEmail.addEventListener('input', () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const emailError = document.getElementById('emailError');
                if (!emailRegex.test(regEmail.value) && regEmail.value.length > 0) {
                    regEmail.classList.add('error');
                    regEmail.classList.remove('valid');
                    emailError.style.display = 'block';
                } else if (regEmail.value.length === 0) {
                    regEmail.classList.remove('error', 'valid');
                    emailError.style.display = 'none';
                } else {
                    regEmail.classList.remove('error');
                    regEmail.classList.add('valid');
                    emailError.style.display = 'none';
                }
            });
        }
        
        if (regPassword) {
            regPassword.addEventListener('input', () => {
                const passwordError = document.getElementById('passwordError');
                if (regPassword.value.length < 8 && regPassword.value.length > 0) {
                    regPassword.classList.add('error');
                    regPassword.classList.remove('valid');
                    passwordError.style.display = 'block';
                } else if (regPassword.value.length >= 8) {
                    regPassword.classList.remove('error');
                    regPassword.classList.add('valid');
                    passwordError.style.display = 'none';
                } else {
                    regPassword.classList.remove('error', 'valid');
                    passwordError.style.display = 'none';
                }
                
                // Also check confirm password match
                if (regConfirmPassword && regConfirmPassword.value.length > 0) {
                    const confirmError = document.getElementById('confirmError');
                    if (regPassword.value !== regConfirmPassword.value) {
                        regConfirmPassword.classList.add('error');
                        regConfirmPassword.classList.remove('valid');
                        confirmError.style.display = 'block';
                    } else {
                        regConfirmPassword.classList.remove('error');
                        regConfirmPassword.classList.add('valid');
                        confirmError.style.display = 'none';
                    }
                }
            });
        }
        
        if (regConfirmPassword) {
            regConfirmPassword.addEventListener('input', () => {
                const confirmError = document.getElementById('confirmError');
                if (regPassword.value !== regConfirmPassword.value && regConfirmPassword.value.length > 0) {
                    regConfirmPassword.classList.add('error');
                    regConfirmPassword.classList.remove('valid');
                    confirmError.style.display = 'block';
                } else if (regConfirmPassword.value.length === 0) {
                    regConfirmPassword.classList.remove('error', 'valid');
                    confirmError.style.display = 'none';
                } else {
                    regConfirmPassword.classList.remove('error');
                    regConfirmPassword.classList.add('valid');
                    confirmError.style.display = 'none';
                }
            });
        }
    }

    // Show notification
    function showNotification(message, type) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
})();
