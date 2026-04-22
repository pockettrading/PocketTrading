// js/deposit.js
class DepositManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user'));
        this.init();
    }

    init() {
        document.querySelectorAll('.method-card').forEach(card => {
            card.addEventListener('click', () => this.showDepositForm(card.dataset.method));
        });
    }

    showDepositForm(method) {
        const formContainer = document.getElementById('depositForm');
        
        const forms = {
            crypto: `
                <h2>Deposit with Cryptocurrency</h2>
                <div class="crypto-address">
                    <p>Send funds to this address:</p>
                    <code>0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0</code>
                    <button onclick="copyAddress()" class="btn-secondary">Copy Address</button>
                </div>
                <div class="min-deposit">
                    <p>Minimum deposit: 0.001 BTC / 0.01 ETH</p>
                    <p>Estimated arrival: 10-30 minutes</p>
                </div>
            `,
            card: `
                <h2>Credit/Debit Card Deposit</h2>
                <form id="cardDepositForm">
                    <div class="form-group">
                        <label>Card Number</label>
                        <input type="text" placeholder="1234 5678 9012 3456" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Expiry Date</label>
                            <input type="text" placeholder="MM/YY" required>
                        </div>
                        <div class="form-group">
                            <label>CVV</label>
                            <input type="text" placeholder="123" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Amount (USD)</label>
                        <input type="number" id="cardAmount" min="10" required>
                    </div>
                    <button type="submit" class="btn-primary">Deposit</button>
                </form>
            `,
            bank: `
                <h2>Bank Transfer</h2>
                <div class="bank-details">
                    <p><strong>Bank Name:</strong> Pocket Trading Bank</p>
                    <p><strong>Account Name:</strong> Pocket Trading Ltd</p>
                    <p><strong>Account Number:</strong> 1234567890</p>
                    <p><strong>Routing Number:</strong> 021000021</p>
                    <p><strong>SWIFT Code:</strong> PTBKUS33</p>
                    <div class="form-group">
                        <label>Amount (USD)</label>
                        <input type="number" id="bankAmount" min="100" required>
                    </div>
                    <button onclick="processBankDeposit()" class="btn-primary">Confirm Transfer</button>
                </div>
            `
        };
        
        formContainer.innerHTML = forms[method];
        formContainer.style.display = 'block';
        
        if (method === 'card') {
            document.getElementById('cardDepositForm').addEventListener('submit', (e) => {
                e.preventDefault();
                this.processCardDeposit();
            });
        }
        
        // Scroll to form
        formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    processCardDeposit() {
        const amount = parseFloat(document.getElementById('cardAmount').value);
        if (amount < 10) {
            alert('Minimum deposit is $10');
            return;
        }
        
        this.user.balance += amount;
        this.updateBalance();
        this.addTransaction('deposit', amount, 'card');
        alert(`Successfully deposited $${amount}!`);
        window.location.href = 'dashboard.html';
    }

    processBankDeposit() {
        const amount = parseFloat(document.getElementById('bankAmount').value);
        if (amount < 100) {
            alert('Minimum bank transfer is $100');
            return;
        }
        
        this.user.balance += amount;
        this.updateBalance();
        this.addTransaction('deposit', amount, 'bank');
        alert(`Bank transfer of $${amount} initiated! Funds will be available within 1-3 business days.`);
        window.location.href = 'dashboard.html';
    }

    updateBalance() {
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.user.id);
        if (userIndex !== -1) {
            users[userIndex] = this.user;
            localStorage.setItem('pocket_users', JSON.stringify(users));
            localStorage.setItem('pocket_user', JSON.stringify(this.user));
        }
    }

    addTransaction(type, amount, method) {
        const transactions = JSON.parse(localStorage.getItem('pocket_transactions') || '[]');
        transactions.push({
            id: Date.now(),
            type: type,
            amount: amount,
            method: method,
            status: 'completed',
            date: new Date().toISOString()
        });
        localStorage.setItem('pocket_transactions', JSON.stringify(transactions));
    }
}

const deposit = new DepositManager();

function copyAddress() {
    const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';
    navigator.clipboard.writeText(address);
    alert('Address copied to clipboard!');
}

function processBankDeposit() {
    deposit.processBankDeposit();
}
