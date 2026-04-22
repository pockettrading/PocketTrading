// js/dashboard.js
// Dashboard functionality with chart and real-time data

class DashboardManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user'));
        this.transactions = JSON.parse(localStorage.getItem('pocket_transactions') || '[]');
        this.cryptoData = this.getCryptoData();
        this.chart = null;
        this.init();
    }

    init() {
        this.updateUserInfo
