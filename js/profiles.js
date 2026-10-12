
/*
 * PocketTrading — PHP Migration Profile Controller
 * File: js/profiles.js
 *
 * Staging version:
 * - Uses the PHPAuth adapter, not the old Supabase auth manager.
 * - Does not trust browser storage to establish a login.
 * - Does not fabricate balances, trade history, or activity.
 * - Does not claim unsupported KYC, password, support, or deletion
 *   operations have succeeded.
 *
 * Keep this file paired with the next profile.html script update.
 */

"use strict";

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userTrades = [];
        this.userActivities = [];
        this.pnlChart = null;
        this.distributionChart = null;
        this.init();
    }

    async init() {
        try {
            if (!window.PHPAuth ||
                typeof window.PHPAuth.currentUser !== "function") {
                this.showPageMessage(
                    "PHP authentication is not loaded. Please update profile.html before testing this page.",
                    "error"
                );
                return;
            }

            const response = await window.PHPAuth.currentUser();
            this.currentUser = response.user || response.data?.user || null;

            if (!this.currentUser) {
                window.location.href = "login.html";
                return;
            }

            this.normaliseUser();
            this.updateNavbar();
            this.setupSidebar();
            this.updateUI();
            this.renderDashboard();
            this.renderTradeHistory();
            this.initCharts();
            this.setupEventListeners();
            this.showUnavailableFeatureNotices();
        } catch (error) {
            console.error("Profile initialisation failed:", error);

            if (error && (
                error.status === 401 ||
                /unauthori[sz]ed|not authenticated|session/i.test(error.message || "")
            )) {
                window.location.href = "login.html";
                return;
            }

            this.showPageMessage(
                "Unable to load your account from the PHP API. Check the API deployment and try again.",
                "error"
            );
        }
    }

    normaliseUser() {
        if (!this.currentUser) return;

        // Accommodate common response field names without inventing data.
        this.currentUser.name =
            this.currentUser.name ||
            this.currentUser.full_name ||
            "";

        this.currentUser.email = this.currentUser.email || "";
        this.currentUser.balance = Number(this.currentUser.balance || 0);
    }

    isAdmin() {
        // Display convenience only. All real admin permissions must be
        // enforced by the PHP server, never by this browser check.
        return this.currentUser?.role === "admin" ||
            this.currentUser?.is_admin === true;
    }

    escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    updateNavbar() {
        const navLinks = document.getElementById("navLinks");
        const rightNav = document.getElementById("rightNav");
        const mobileMenu = document.getElementById("mobileMenu");

        const email = this.currentUser?.email || "";
        const name = this.currentUser?.name || email.split("@")[0] || "User";
        const safeName = this.escapeHTML(name);
        const firstLetter = this.escapeHTML(name.charAt(0).toUpperCase());
        const adminLink = this.isAdmin()
            ? '<a href="admin.html" class="admin-link">Admin Panel</a>'
            : "";

        if (navLinks) {
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link">Markets</a>
                <a href="trades.html" class="nav-link">Trades</a>
                <a href="profile.html" class="nav-link active">My Profile</a>
            `;
        }

        if (rightNav) {
            rightNav.innerHTML = `
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-avatar">${firstLetter}</div>
                        <div class="user-name">${safeName}</div>
                    </div>
                    ${adminLink}
                    <button type="button" class="logout-btn" id="profileLogoutBtn">
                        Logout
                    </button>
                </div>
            `;

            document.getElementById("profileLogoutBtn")
                ?.addEventListener("click", () => this.logout());
        }

        if (mobileMenu) {
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">Home</a>
                <a href="markets.html" class="mobile-nav-link">Markets</a>
                <a href="trades.html" class="mobile-nav-link">Trades</a>
                <a href="profile.html" class="mobile-nav-link">My Profile</a>
                ${this.isAdmin()
                    ? '<a href="admin.html" class="mobile-nav-link">Admin Panel</a>'
                    : ""}
                <button type="button" class="logout-btn" id="mobileProfileLogoutBtn">
                    Logout
                </button>
            `;

            document.getElementById("mobileProfileLogoutBtn")
                ?.addEventListener("click", () => this.logout());
        }

        const welcome = document.getElementById("welcomeMessage");
        if (welcome) {
            welcome.textContent = `Welcome back, ${name}!`;
        }

        const mobileBtn = document.getElementById("mobileMenuBtn");
        if (mobileBtn && mobileMenu && !mobileBtn.dataset.profileBound) {
            mobileBtn.dataset.profileBound = "true";
            mobileBtn.addEventListener("click", () => {
                mobileMenu.classList.toggle("show");
            });
        }
    }

    setupSidebar() {
        const items = document.querySelectorAll(".sidebar-item");

        items.forEach(item => {
            item.addEventListener("click", () => {
                const tab = item.dataset.tab;
                if (!tab) return;

                items.forEach(entry => entry.classList.remove("active"));
                item.classList.add("active");

                document.querySelectorAll(".tab-content").forEach(content => {
                    content.style.display = "none";
                });

                const selected = document.getElementById(`${tab}Tab`);
                if (selected) selected.style.display = "block";

                document.getElementById("profileSidebar")
                    ?.classList.remove("show");

                if (tab === "history") this.renderTradeHistory();
            });
        });

        const mobileBtn = document.getElementById("mobileMenuBtn");
        const sidebar = document.getElementById("profileSidebar");

        if (mobileBtn && sidebar && !mobileBtn.dataset.sidebarBound) {
            mobileBtn.dataset.sidebarBound = "true";
            mobileBtn.addEventListener("click", () => {
                sidebar.classList.toggle("show");
            });
        }
    }

    updateUI() {
        const user = this.currentUser || {};

        this.setText("displayName", user.name || "Not provided");
        this.setText("displayEmail", user.email || "Not available");
        this.setText(
            "displayMemberSince",
            user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "Not available"
        );

        this.setText(
            "profileBalance",
            `$${Number(user.balance || 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })}`
        );

        const kyc = document.getElementById("displayKyc");
        if (kyc) {
            // Show only a status supplied by the API.
            const status = String(user.kyc_status || "unknown").toLowerCase();
            kyc.textContent = status === "verified"
                ? "Verified"
                : status === "pending"
                    ? "Pending Review"
                    : status === "rejected"
                        ? "Rejected"
                        : "Not verified";

            kyc.className = "kyc-badge " +
                (status === "verified"
                    ? "kyc-verified"
                    : status === "pending"
                        ? "kyc-pending"
                        : "kyc-none");
        }

        const fullName = document.getElementById("updateFullName");
        const phone = document.getElementById("updatePhone");
        const country = document.getElementById("updateCountry");
        const kycName = document.getElementById("kycFullName");

        if (fullName) fullName.value = user.name || "";
        if (phone) phone.value = user.phone || "";
        if (country) country.value = user.country || "";
        if (kycName) kycName.value = user.name || "";
    }

    setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value ?? "");
    }

    renderDashboard() {
        // The current PHP API does not yet provide a confirmed profile
        // trade-history and activity response. Do not show invented totals.
        this.setText("dashBalance", "Not available");
        this.setText("dashTotalTrades", "—");
        this.setText("dashWinRate", "—");
        this.setText("statTotalTrades", "—");
        this.setText("statWinRate", "—");
        this.setText("statTotalVolume", "—");

        const pnl = document.getElementById("dashPnL");
        if (pnl) pnl.textContent = "Not available";

        const activity = document.getElementById("recentActivityList");
        if (activity) {
            activity.textContent =
                "Account activity will appear here after the PHP activity endpoint is implemented.";
        }
    }

    renderTradeHistory() {
        const tbody = document.getElementById("tradeHistoryBody");
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center;padding:32px;">
                    Trade history is not connected to the PHP API yet.
                </td>
            </tr>
        `;
    }

    initCharts() {
        const pnlEmpty = document.getElementById("pnlEmptyMessage");
        const distEmpty = document.getElementById("distEmptyMessage");

        if (pnlEmpty) {
            pnlEmpty.style.display = "block";
            pnlEmpty.textContent =
                "Chart unavailable until verified trade-history data is connected.";
        }

        if (distEmpty) {
            distEmpty.style.display = "block";
            distEmpty.textContent =
                "Chart unavailable until verified trade-history data is connected.";
        }

        if (this.pnlChart) {
            this.pnlChart.destroy();
            this.pnlChart = null;
        }

        if (this.distributionChart) {
            this.distributionChart.destroy();
            this.distributionChart = null;
        }
    }

    setupEventListeners() {
        const updateForm = document.getElementById("updateProfileForm");

        if (updateForm) {
            updateForm.addEventListener("submit", event => {
                event.preventDefault();
                this.updateProfile();
            });
        }
    }

    async updateProfile() {
        const nameInput = document.getElementById("updateFullName");
        const phoneInput = document.getElementById("updatePhone");
        const countryInput = document.getElementById("updateCountry");
        const currentPassword = document.getElementById("currentPassword");
        const newPassword = document.getElementById("newPassword");
        const confirmPassword = document.getElementById("confirmNewPassword");

        const name = nameInput?.value.trim() || "";
        const phone = phoneInput?.value.trim() || "";
        const country = countryInput?.value || "";
        const newPass = newPassword?.value || "";
        const confirmPass = confirmPassword?.value || "";

        if (!name) {
            this.showNotification("Please enter your full name.", "error");
            return;
        }

        if (newPass || confirmPass || (currentPassword?.value || "")) {
            this.showNotification(
                "Password changes are not enabled on this page yet. They must be implemented through a secure PHP endpoint.",
                "error"
            );
            return;
        }

        try {
            /*
             * This calls the existing PHP profile endpoint.
             * The PHP server must validate the session and permitted fields.
             * Do not treat phone/country as saved unless the API confirms it.
             */
            const result = await window.PHPAuth.request("profile/update", {
                method: "POST",
                body: {
                    name,
                    full_name: name,
                    phone,
                    country
                }
            });

            const updatedUser =
                result.user ||
                result.data?.user ||
                result.data ||
                {};

            this.currentUser = {
                ...this.currentUser,
                ...updatedUser,
                name: updatedUser.name ||
                    updatedUser.full_name ||
                    name
            };

            this.updateUI();
            this.updateNavbar();

            if (currentPassword) currentPassword.value = "";
            if (newPassword) newPassword.value = "";
            if (confirmPassword) confirmPassword.value = "";

            this.showNotification(
                "The PHP API accepted the profile update. Verify the saved fields after refreshing.",
                "success"
            );
        } catch (error) {
            console.error("Profile update failed:", error);
            this.showNotification(
                error.message || "Profile update failed. No change was confirmed.",
                "error"
            );
        }
    }

    async submitKYC() {
        this.showNotification(
            "KYC submission is not connected yet. Do not upload identity documents until secure PHP document storage and review endpoints are implemented.",
            "error"
        );
    }

    async sendSupport() {
        this.showNotification(
            "Support messages are not connected to a PHP support endpoint yet. Your message has not been sent.",
            "error"
        );
    }

    async deleteAccount() {
        this.showNotification(
            "Account deletion is not enabled. A secure server-side deletion endpoint and confirmation process are required.",
            "error"
        );
    }

    showUnavailableFeatureNotices() {
        const kycForm = document.getElementById("kycForm");
        if (kycForm) {
            const notice = document.createElement("p");
            notice.className = "migration-notice";
            notice.style.cssText =
                "padding:12px;margin:12px 0;border-radius:8px;background:rgba(255,165,2,.12);color:#FFA502;";
            notice.textContent =
                "KYC upload is temporarily unavailable while secure document handling is implemented.";
            kycForm.prepend(notice);
        }
    }

    async logout() {
        try {
            await window.PHPAuth.logout();
        } catch (error) {
            console.error("PHP logout request failed:", error);
        } finally {
            window.location.href = "login.html";
        }
    }

    showPageMessage(message, type = "info") {
        let box = document.getElementById("profileMigrationMessage");

        if (!box) {
            box = document.createElement("div");
            box.id = "profileMigrationMessage";
            box.style.cssText =
                "position:relative;margin:16px;padding:14px;border-radius:10px;z-index:10;";
            document.body.prepend(box);
        }

        box.style.background = type === "error"
            ? "rgba(255,71,87,.15)"
            : "rgba(0,216,151,.12)";
        box.style.color = type === "error" ? "#FF6B78" : "#00D897";
        box.textContent = message;
    }

    showNotification(message, type = "info") {
        let notification = document.getElementById("profileNotification");

        if (!notification) {
            notification = document.createElement("div");
            notification.id = "profileNotification";
            notification.style.cssText = [
                "position:fixed",
                "top:20px",
                "right:16px",
                "left:16px",
                "max-width:460px",
                "margin-left:auto",
                "padding:14px 16px",
                "border-radius:10px",
                "z-index:10000",
                "box-shadow:0 8px 24px rgba(0,0,0,.3)",
                "font-size:14px"
            ].join(";");
            document.body.appendChild(notification);
        }

        notification.style.background = type === "error"
            ? "#4a1d25"
            : "#123b31";
        notification.style.color = "#ffffff";
        notification.textContent = message;

        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        this.notificationTimeout = setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

let profileManager = null;

document.addEventListener("DOMContentLoaded", () => {
    profileManager = new ProfileManager();
});

window.submitKYC = () => profileManager?.submitKYC();
window.sendSupport = () => profileManager?.sendSupport();
window.deleteAccount = () => profileManager?.deleteAccount();
window.logout = () => profileManager?.logout();
