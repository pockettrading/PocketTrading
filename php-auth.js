 
/* PocketTrading PHP Authentication Adapter
   Staging only — preserves the existing Supabase files.
*/
window.PHPAuth = {
  async request(action, options = {}) {
    const response = await fetch(`/api/${action}`, {
      method: options.method || "GET",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...(options.body !== undefined
        ? { body: JSON.stringify(options.body) }
        : {})
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
  },

  async login(email, password) {
    return this.request("auth/login", {
      method: "POST",
      body: { email, password }
    });
  },

  async register(fullName, email, password) {
    return this.request("auth/register", {
      method: "POST",
      body: {
        full_name: fullName,
        email,
        password
      }
    });
  },

  async currentUser() {
    return this.request("auth/me");
  },

  async logout() {
    return this.request("auth/logout", {
      method: "POST",
      body: {}
    });
  }
};
