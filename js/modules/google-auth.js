/* google-auth.js — Google OAuth 2.0 Authentication */
const GoogleAuth = {
  // Google OAuth Configuration
  CLIENT_ID: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com',
  REDIRECT_URI: window.location.origin + '/auth/google/callback',
  SCOPES: 'openid profile email',
  
  // Auth state for PKCE flow
  _authState: null,
  _codeVerifier: null,

  async init() {
    // Load Google API client
    this.loadGoogleAPI();
  },

  loadGoogleAPI() {
    // Create script tag for Google Identity Services
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('✓ Google Identity Services loaded');
    };
    document.head.appendChild(script);
  },

  async login() {
    try {
      // For demo: Simulate OAuth flow
      const result = await this.showGoogleSignInDialog();
      if (result) {
        // Process login
        await this.processGoogleLogin(result);
      }
    } catch(e) {
      console.error('Google login error:', e);
      App.toast('❌ Google 登入失敗: ' + e.message, 'error');
    }
  },

  async showGoogleSignInDialog() {
    // Mock Google login - in production, redirect to OAuth endpoint
    const email = prompt('📧 輸入您的 Email (或留空使用示範帳號)');
    
    if (email === null) return null; // Cancelled
    
    // Use provided email or mock
    const mockEmail = email || 'user-' + Math.random().toString(36).substr(2, 9) + '@gmail.com';
    const mockName = mockEmail.split('@')[0];
    
    return {
      email: mockEmail,
      name: mockName,
      picture: this.getAvatarUrl(mockName),
      id: this.hashEmail(mockEmail)
    };
  },

  mockGoogleLogin(email, name, callback) {
    // Mock Google user data
    const userData = {
      email,
      name,
      picture: this.getAvatarUrl(name),
      id: this.hashEmail(email)
    };
    
    App.closeModal();
    callback(userData);
  },

  getAvatarUrl(name) {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random`;
  },

  hashEmail(email) {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  },

  async processGoogleLogin(googleUser) {
    try {
      const email = googleUser.email;
      const name = googleUser.name;
      const googleId = googleUser.id;

      // Find or create user
      let user = await DB.Users.all().then(users => 
        users.find(u => u.email === email)
      );

      if (!user) {
        // Create new user from Google login
        const role = email.includes('admin') ? 'admin' : 
                    email.includes('tech') ? 'technician' : 'operator';
        
        const newUser = {
          username: email.split('@')[0],
          email,
          name,
          role,
          googleId,
          avatar: googleUser.picture,
          createdAt: new Date().toISOString()
        };

        user = await DB.Users.add(newUser);
        App.toast(`✅ 新用戶已建立: ${name}`, 'success');
      } else {
        // Update user with Google info
        user.googleId = googleId;
        user.avatar = googleUser.picture;
        user.lastLogin = new Date().toISOString();
        await DB.Users.put(user);
      }

      // Set session
      App.state.user = user;
      App.state.userId = user.id;
      
      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('lastLoginMethod', 'google');

      // Update sidebar
      document.getElementById('sidebar-username').textContent = user.name || user.username;
      document.getElementById('sidebar-role').textContent = 
        { admin: '管理者', technician: '技師', operator: '操作員' }[user.role];
      document.getElementById('sidebar-avatar').textContent = (user.name || user.username)[0].toUpperCase();

      // Hide login screen
      document.getElementById('login-screen').classList.add('hidden');
      document.getElementById('app-shell').classList.remove('hidden');

      // Navigate to dashboard
      window.location.hash = '#/';
      
      App.toast(`✅ 歡迎 ${user.name || user.username}！`, 'success');
    } catch(e) {
      console.error('Process login error:', e);
      App.toast('❌ 登入處理失敗: ' + e.message, 'error');
    }
  },

  async logout() {
    // Clear Google session (in production)
    localStorage.removeItem('lastLoginMethod');
    // Standard logout flow continues
  },

  // Real OAuth implementation reference
  getOAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.REDIRECT_URI,
      response_type: 'code',
      scope: this.SCOPES,
      access_type: 'offline',
      prompt: 'consent'
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },

  async handleOAuthCallback(code) {
    // This would be called on the callback page after OAuth redirect
    try {
      // Exchange code for token
      const response = await fetch('/auth/google/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!response.ok) throw new Error('Token exchange failed');

      const { access_token, user_info } = await response.json();
      
      // Store token
      localStorage.setItem('google_access_token', access_token);
      
      // Process login
      await this.processGoogleLogin(user_info);
    } catch(e) {
      console.error('OAuth callback error:', e);
      throw e;
    }
  }
};
