
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#0b0e11">
    <title>Cryptocurrency Markets | PocketTrading</title>
    <meta name="description" content="Explore cryptocurrency markets, track prices, and search digital assets on PocketTrading.">

    <style>
        :root {
            --bg: #0b0e11;
            --panel: #151a21;
            --panel-hover: #1b222d;
            --border: #252d38;
            --text: #f1f5f9;
            --muted: #8b98a9;
            --green: #00d897;
            --red: #ff5964;
            --blue: #6c8cff;
            --radius: 14px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background: var(--bg);
            color: var(--text);
            font-family: Inter, -apple-system, BlinkMacSystemFont,
                "Segoe UI", Roboto, Arial, sans-serif;
            line-height: 1.5;
            min-height: 100vh;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        button, input {
            font: inherit;
        }

        button {
            cursor: pointer;
        }

        .navbar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(11, 14, 17, 0.96);
            border-bottom: 1px solid var(--border);
            backdrop-filter: blur(14px);
        }

        .nav-container {
            width: min(1200px, calc(100% - 40px));
            min-height: 72px;
            margin: auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 21px;
            font-weight: 800;
            letter-spacing: -0.7px;
            white-space: nowrap;
        }

        .logo-icon {
            display: grid;
            place-items: center;
            width: 38px;
            height: 38px;
            border-radius: 11px;
            color: #06140f;
            background: var(--green);
            font-weight: 900;
        }

        .logo span:last-child {
            color: var(--green);
        }

        #navLinks {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .nav-link {
            padding: 10px 13px;
            border-radius: 9px;
            color: var(--muted);
            font-size: 14px;
            font-weight: 600;
            transition: .2s;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--green);
            background: rgba(0, 216, 151, 0.08);
        }

        #rightNav {
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }

        .guest-buttons {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .btn-login,
        .btn-register {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 39px;
            padding: 9px 15px;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 700;
        }

        .btn-login {
            color: var(--text);
            border: 1px solid var(--border);
        }

        .btn-register {
            color: #06140f;
            background: var(--green);
        }

        .user-section {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 14px;
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 9px;
        }

        .user-avatar {
            display: grid;
            place-items: center;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            color: #06140f;
            background: var(--green);
            font-weight: 800;
        }

        .user-name {
            max-width: 150px;
            overflow-wrap: anywhere;
            font-size: 13px;
            font-weight: 600;
        }

        .admin-badge {
            display: inline-block;
            margin-left: 5px;
            padding: 2px 5px;
            border-radius: 5px;
            background: rgba(108, 140, 255, .15);
            color: #91a8ff;
            font-size: 10px;
        }

        .admin-link {
            color: var(--blue);
            font-size: 12px;
            font-weight: 700;
        }

        .logout-btn {
            padding: 8px 11px;
            color: var(--red);
            background: transparent;
            border: 1px solid rgba(255, 89, 100, .3);
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
        }

        .mobile-menu-btn {
            display: none;
            width: 42px;
            height: 42px;
            color: var(--text);
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 9px;
            font-size: 22px;
        }

        #mobileMenu {
            display: none;
            padding: 12px 20px 18px;
            border-top: 1px solid var(--border);
        }

        #mobileMenu.show {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .mobile-nav-link {
            padding: 11px 12px;
            border-radius: 8px;
            color: var(--muted);
            font-size: 14px;
        }

        .mobile-nav-link:hover {
            color: var(--green);
            background: rgba(0, 216, 151, .08);
        }

        .mobile-menu-note {
            padding: 8px 12px;
            color: var(--muted);
            font-size: 12px;
        }

        .container {
            width: min(1200px, calc(100% - 40px));
            margin: auto;
        }

        .page-header {
            padding: 38px 0 25px;
        }

        .eyebrow {
            margin-bottom: 8px;
            color: var(--green);
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        h1 {
            margin-bottom: 9px;
            font-size: clamp(27px, 4vw, 38px);
            line-height: 1.2;
            letter-spacing: -1.1px;
        }

        .page-subtitle {
            max-width: 650px;
            color: var(--muted);
            font-size: 14px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 16px;
            margin-bottom: 28px;
        }

        .stat-card {
            min-width: 0;
            padding: 20px;
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: var(--radius);
        }

        .stat-label {
            margin-bottom: 12px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 600;
        }

        .stat-value {
            overflow-wrap: anywhere;
            font-size: clamp(19px, 2.4vw, 27px);
            font-weight: 800;
            letter-spacing: -.5px;
        }

        .stat-change {
            margin-top: 8px;
            color: var(--muted);
            font-size: 12px;
        }

        .positive {
            color: var(--green) !important;
        }

        .negative {
            color: var(--red) !important;
        }

        .market-panel {
            overflow: hidden;
            margin-bottom: 30px;
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: var(--radius);
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding: 22px 22px 18px;
        }

        .panel-title {
            font-size: 19px;
            font-weight: 800;
        }

        .panel-description {
            margin-top: 4px;
            color: var(--muted);
            font-size: 12px;
        }

        .live-indicator {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            color: var(--muted);
            font-size: 11px;
            white-space: nowrap;
        }

        .live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--green);
            box-shadow: 0 0 9px rgba(0, 216, 151, .45);
        }

        .market-controls {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 0 22px 20px;
        }

        .search-wrap {
            position: relative;
            width: 100%;
        }

        .search-icon {
            position: absolute;
            top: 50%;
            left: 14px;
            color: var(--muted);
            transform: translateY(-50%);
            pointer-events: none;
        }

        #marketSearch {
            width: 100%;
            min-height: 46px;
            padding: 12px 14px 12px 42px;
            color: var(--text);
            background: #0e1218;
            border: 1px solid var(--border);
            border-radius: 10px;
            outline: none;
            font-size: 14px;
        }

        #marketSearch:focus {
            border-color: var(--green);
            box-shadow: 0 0 0 3px rgba(0, 216, 151, .08);
        }

        #marketSearch::placeholder {
            color: #697586;
        }

        .filter-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        .filter-btn {
            min-height: 36px;
            padding: 8px 14px;
            color: var(--muted);
            background: #10151c;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            transition: .2s;
        }

        .filter-btn:hover {
            color: var(--text);
            border-color: #465364;
        }

        .filter-btn.active {
            color: #06140f;
            background: var(--green);
            border-color: var(--green);
        }

        .table-wrap {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .markets-table {
            width: 100%;
            min-width: 690px;
            border-collapse: collapse;
            text-align: left;
        }

        .markets-table thead {
            background: #10151c;
        }

        .markets-table th {
            padding: 14px 20px;
            color: var(--muted);
            border-top: 1px solid var(--border);
            border-bottom: 1px solid var(--border);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .8px;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .markets-table td {
            padding: 16px 20px;
            border-bottom: 1px solid rgba(37, 45, 56, .75);
            font-size: 13px;
            white-space: nowrap;
        }

        .markets-table tbody tr {
            transition: background .15s;
        }

        .markets-table tbody tr:hover {
            background: var(--panel-hover);
        }

        .markets-table tbody tr:last-child td {
            border-bottom: none;
        }

        .coin-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .coin-icon {
            display: grid;
            place-items: center;
            flex: 0 0 38px;
            width: 38px;
            height: 38px;
            overflow: hidden;
            color: var(--green);
            background: #202a32;
            border-radius: 50%;
            font-size: 17px;
            font-weight: 800;
        }

        .coin-name {
            color: var(--text);
            font-size: 13px;
            font-weight: 800;
        }

        .coin-symbol {
            margin-top: 3px;
            color: var(--muted);
            font-size: 11px;
        }

        .tradingview-btn {
            padding: 8px 11px;
            color: var(--green);
            background: rgba(0, 216, 151, .08);
            border: 1px solid rgba(0, 216, 151, .24);
            border-radius: 7px;
            font-size: 11px;
            font-weight: 800;
        }

        .tradingview-btn:hover {
            background: rgba(0, 216, 151, .15);
        }

        .table-message {
            padding: 38px 20px !important;
            color: var(--muted);
            text-align: center;
            white-space: normal !important;
        }

        .flash-green {
            animation: flashGreen .7s ease;
        }

        .flash-red {
            animation: flashRed .7s ease;
        }

        @keyframes flashGreen {
            0% { background: rgba(0, 216, 151, .17); }
            100% { background: transparent; }
        }

        @keyframes flashRed {
            0% { background: rgba(255, 89, 100, .17); }
            100% { background: transparent; }
        }

        .panel-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            padding: 15px 22px;
            background: #10151c;
            border-top: 1px solid var(--border);
            color: var(--muted);
            font-size: 11px;
        }

        .footer {
            padding: 25px 0 35px;
            color: var(--muted);
            text-align: center;
            font-size: 12px;
        }

        @media (max-width: 1000px) {
            .nav-container {
                gap: 12px;
            }

            #navLinks {
                gap: 2px;
            }

            .nav-link {
                padding: 9px;
                font-size: 12px;
            }

            .admin-link {
                display: none;
            }

            .stats-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
        }

        @media (max-width: 720px) {
            .nav-container {
                width: calc(100% - 28px);
                min-height: 64px;
            }

            .logo {
                font-size: 18px;
            }

            .logo-icon {
                width: 34px;
                height: 34px;
            }

            #navLinks {
                display: none;
            }

            #rightNav {
                margin-left: auto;
            }

            .user-section {
                gap: 8px;
            }

            .user-info {
                display: none;
            }

            .logout-btn {
                padding: 8px;
            }

            .mobile-menu-btn {
                display: block;
            }

            .container {
                width: calc(100% - 28px);
            }

            .page-header {
                padding: 28px 0 20px;
            }

            .stats-grid {
                gap: 10px;
                margin-bottom: 20px;
            }

            .stat-card {
                padding: 15px;
            }

            .stat-label {
                margin-bottom: 8px;
                font-size: 11px;
            }

            .stat-value {
                font-size: 21px;
            }

            .market-panel {
                margin-bottom: 20px;
            }

            .panel-header {
                align-items: flex-start;
                padding: 17px 15px;
            }

            .panel-title {
                font-size: 17px;
            }

            .market-controls {
                padding: 0 15px 16px;
            }

            .filter-row {
                gap: 7px;
            }

            .filter-btn {
                padding: 8px 11px;
            }

            .markets-table th,
            .markets-table td {
                padding: 13px 14px;
            }

            .panel-footer {
                padding: 13px 15px;
            }
        }

        @media (max-width: 380px) {
            .stats-grid {
                grid-template-columns: 1fr 1fr;
            }

            .stat-card {
                padding: 12px;
            }

            .stat-value {
                font-size: 18px;
            }

            .live-indicator {
                font-size: 10px;
            }
        }
    </style>
</head>

<body>
    <header class="navbar">
        <div class="nav-container">
            <a class="logo" href="index.html" aria-label="PocketTrading home">
                <span class="logo-icon">P</span>
                <span>Pocket<span>Trading</span></span>
            </a>

            <nav id="navLinks" aria-label="Main navigation">
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link active">Markets</a>
                <a href="trades.html" class="nav-link">Trades</a>
            </nav>

            <div id="rightNav">
                <div class="guest-buttons">
                    <a href="login.html" class="btn-login">Login</a>
                    <a href="login.html" class="btn-register">Register</a>
                </div>
            </div>

            <button id="mobileMenuBtn" class="mobile-menu-btn"
                type="button" aria-label="Toggle mobile menu"
                aria-controls="mobileMenu" aria-expanded="false">☰</button>
        </div>

        <nav id="mobileMenu" aria-label="Mobile navigation">
            <a href="index.html" class="mobile-nav-link">🏠 Home</a>
            <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
            <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
            <a href="login.html" class="mobile-nav-link">🔐 Login / Register</a>
        </nav>
    </header>

    <main class="container">
        <section class="page-header">
            <div class="eyebrow">Market overview</div>
            <h1>Cryptocurrency Markets</h1>
            <p class="page-subtitle">
                Explore digital assets, compare price movements, and search
                cryptocurrency markets in one place.
            </p>
        </section>

        <section class="stats-grid" aria-label="Market overview statistics">
            <article class="stat-card">
                <div class="stat-label">Total Market Cap</div>
                <div class="stat-value" id="totalMarketCap">—</div>
                <div class="stat-change" id="marketCapChange">Awaiting market data</div>
            </article>

            <article class="stat-card">
                <div class="stat-label">24h Trading Volume</div>
                <div class="stat-value" id="totalVolume">—</div>
                <div class="stat-change">Reported market volume</div>
            </article>

            <article class="stat-card">
                <div class="stat-label">BTC Price</div>
                <div class="stat-value" id="btcPrice">—</div>
                <div class="stat-change" id="btcChange">Awaiting market data</div>
            </article>

            <article class="stat-card">
                <div class="stat-label">Assets Displayed</div>
                <div class="stat-value" id="assetCount">—</div>
                <div class="stat-change">Available in this market list</div>
            </article>
        </section>

        <section class="market-panel" aria-labelledby="marketsTitle">
            <div class="panel-header">
                <div>
                    <h2 class="panel-title" id="marketsTitle">All Markets</h2>
        
