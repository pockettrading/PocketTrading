<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pocket Trading - Register</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary: #F7931A;
            --primary-dark: #e67e22;
            --primary-light: #f8b45a;
            --dark-bg: #0A0E17;
            --darker-bg: #06090F;
            --card-bg: #151E2C;
            --card-hover: #1A2535;
            --text-primary: #FFFFFF;
            --text-secondary: #A0AAB5;
            --text-tertiary: #6B7A8A;
            --success: #00D897;
            --danger: #FF4757;
            --warning: #FFA502;
            --border: #2A3545;
            --shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
            color: var(--text-primary);
            line-height: 1.5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .auth-container {
            width: 100%;
            max-width: 1200px;
            margin: 2rem;
            background: var(--card-bg);
            border-radius: 24px;
            overflow: hidden;
            box-shadow: var(--shadow);
        }

        .auth-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 600px;
        }

        /* Left Branding Section */
        .auth-branding {
            background: linear-gradient(135deg, rgba(247, 147, 26, 0.95) 0%, rgba(230, 126, 34, 0.95) 100%);
            padding: 3rem;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }

        .auth-branding::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1%, transparent 1%);
            background-size: 50px 50px;
            animation: moveBackground 20s linear infinite;
        }

        @keyframes moveBackground {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }

        .brand-content {
            color: white;
            position: relative;
            z-index: 1;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 2rem;
        }

        .logo svg {
            width: 40px;
            height: 40px;
        }

        .logo span {
            font-size: 1.5rem;
            font-weight: 700;
        }

        .brand-title {
            font-size: 2.5rem;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 1rem;
        }

        .brand-description {
            font-size: 1.1rem;
            opacity: 0.95;
            margin-bottom: 2rem;
        }

        .feature-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .feature-item {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1rem;
            padding: 0.5rem;
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }

        .feature-icon {
            font-size: 1.2rem;
        }

        /* Right Form Section */
        .auth-form-container {
            padding: 3rem;
            display: flex;
            align-items: center;
            background: var(--card-bg);
        }

        .form-wrapper {
            width: 100%;
            max-width: 400px;
            margin: 0 auto;
        }

        .form-header {
            margin-bottom: 2rem;
        }

        .form-header h2 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }

        .form-header p {
            color: var(--text-secondary);
        }

        /* Input Groups */
        .input-group {
            margin-bottom: 1.5rem;
        }

        .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .input-group input {
            width: 100%;
            padding: 12px 16px;
            background: var(--darker-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 1rem;
            transition: all 0.3s;
        }

        .input-group input:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.1);
        }

        /* Password Strength */
        .password-strength {
            margin-top: 0.5rem;
            font-size: 0.8rem;
        }

        .strength-bar-container {
            margin-top: 8px;
            height: 4px;
            background: var(--border);
            border-radius: 2px;
            overflow: hidden;
        }

        .strength-bar {
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 2px;
        }

        .strength-weak {
            color: var(--danger);
        }

        .strength-weak ~ .strength-bar-container .strength-bar,
        .strength-weak + .strength-bar-container .strength-bar {
            background: var(--danger);
        }

        .strength-medium {
            color: var(--warning);
        }

        .strength-medium ~ .strength-bar-container .strength-bar,
        .strength-medium + .strength-bar-container .strength-bar {
            background: var(--warning);
        }

        .strength-strong {
            color: var(--success);
        }

        .strength-strong ~ .strength-bar-container .strength-bar,
        .strength-strong + .strength-bar-container .strength-bar {
            background: var(--success);
        }

        /* Form Options */
        .form-options {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        .checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 0.85rem;
        }

        .checkbox input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--primary);
        }

        .checkbox span a {
            color: var(--primary);
            text-decoration: none;
        }

        .checkbox span a:hover {
            text-decoration: underline;
        }

        /* Buttons */
        .btn-primary {
            background: var(--primary);
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            width: 100%;
        }

        .btn-primary:hover {
            background: var(--primary-dark);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(247, 147, 26, 0.3);
        }

        /* Divider */
        .divider {
            text-align: center;
            margin: 1.5rem 0;
            position: relative;
        }

        .divider::before,
        .divider::after {
            content: '';
            position: absolute;
            top: 50%;
            width: 45%;
            height: 1px;
            background: var(--border);
        }

        .divider::before {
            left: 0;
        }

        .divider::after {
            right: 0;
        }

        .divider span {
            background: var(--card-bg);
            padding: 0 10px;
            color: var(--text-secondary);
            font-size: 0.85rem;
        }

        /* Social Login */
        .social-login {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .btn-social {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 12px;
            background: var(--darker-bg);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text-primary);
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-social:hover {
            background: var(--card-hover);
            transform: translateY(-2px);
            border-color: var(--primary);
        }

        .btn-social svg {
            width: 20px;
            height: 20px;
        }

        /* Form Footer */
        .form-footer {
            text-align: center;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .form-footer a {
            color: var(--primary);
            text-decoration: none;
            font-weight: 600;
        }

        .form-footer a:hover {
            text-decoration: underline;
        }

        /* Notification */
        .auth-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: 500;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        /* Responsive */
        @media (max-width: 968px) {
            .auth-grid {
                grid-template-columns: 1fr;
            }
            
            .auth-branding {
                padding: 2rem;
            }
            
            .auth-form-container {
                padding: 2rem;
            }
            
            .brand-title {
                font-size: 2rem;
            }
        }

        @media (max-width: 480px) {
            .form-header h2 {
                font-size: 1.5rem;
            }
            
            .auth-container {
                margin: 1rem;
            }
            
            .auth-branding,
            .auth-form-container {
                padding: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <div class="auth-grid">
            <!-- Left Side - Branding Section -->
            <div class="auth-branding">
                <div class="brand-content">
                    <div class="logo">
                        <svg viewBox="0 0 40 40" fill="none">
                            <rect width="40" height="40" rx="10" fill="#F7931A"/>
                            <path d="M20 10L25 15L20 20L15 15L20 10Z" fill="white"/>
                            <path d="M20 20L25 25L20 30L15 25L20 20Z" fill="white"/>
                        </svg>
                        <span>Pocket<span style="color: rgba(255,255,255,0.9);">Trading</span></span>
                    </div>
                    
                    <h1 class="brand-title">Your Trusted<br>Trading Platform</h1>
                    <p class="brand-description">Trade smarter with real-time insights, advanced charts, and professional tools.</p>
                    
                    <div class="feature-list">
                        <div class="feature-item">
                            <div class="feature-icon">📊</div>
                            <span>Real-time market data</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">📈</div>
                            <span>Advanced charting tools</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">🔒</div>
                            <span>Secure & reliable</span>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">💬</div>
                            <span>24/7 customer support</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Side - Registration Form -->
            <div class="auth-form-container">
                <div class="form-wrapper">
                    <div class="form-header">
                        <h2>Create Account</h2>
                        <p>Start trading with $10,000 demo funds for free</p>
                    </div>

                    <form id="registerForm">
                        <div class="input-group">
                            <label>Email Address</label>
                            <input type="email" id="email" placeholder="Enter your email" required autocomplete="email">
                        </div>

                        <div class="input-group">
                            <label>Password</label>
                            <input type="password" id="password" placeholder="Create a password" required autocomplete="new-password">
                            <div class="password-strength" id="passwordStrength"></div>
                        </div>

                        <div class="input-group">
                            <label>Confirm Password</label>
                            <input type="password" id="confirmPassword" placeholder="Confirm your password" required autocomplete="new-password">
                        </div>

                        <div class="form-options">
                            <label class="checkbox">
                                <input type="checkbox" id="termsAgree" required>
                                <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
                            </label>
                        </div>

                        <button type="submit" class="btn-primary">Create Account</button>

                        <div class="divider">
                            <span>OR</span>
                        </div>

                        <div class="social-login">
                            <button type="button" class="btn-social" id="googleRegister">
                                <svg viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Sign up with Google
                            </button>
                            <button type="button" class="btn-social" id="appleRegister">
                                <svg viewBox="0 0 24 24">
                                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" fill="#000"/>
                                </svg>
                                Sign up with Apple
                            </button>
                        </div>

                        <div class="form-footer">
                            Already have an account? <a href="login.html">Login</a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <script src="js/register.js"></script>
</body>
</html>
