/**
 * APP LOGIC (SUBSCRIBER INTERFACE)
 * Handles UI interactions and calls NIST Modules (RA, CSP, Verifier, RP)
 */
const app = {
    currentUser: null,
    mfaCode: null,
    pendingUser: null, // User waiting for MFA
    activeChatPartner: null,

    init() {
        this.checkSession();
        window.handleImageError = function(img) {
            img.style.display = 'none';
            img.nextElementSibling.style.display = 'flex';
        };
    },

    checkSession() {
        const sess = sessionStorage.getItem('alumni_session');
        if (sess) {
            this.currentUser = JSON.parse(sess);
            this.showDashboard();
        }
    },

    toggleAuthMode() {
        const loginForm = document.getElementById('login-form');
        const regForm = document.getElementById('register-form');
        const title = document.getElementById('auth-title');
        const subtitle = document.getElementById('auth-subtitle');
        
        if (loginForm.classList.contains('hidden')) {
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
            title.innerText = "Welcome Back";
            subtitle.innerText = "Enter your credentials to access your account.";
        } else {
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
            title.innerText = "Create Account";
            subtitle.innerText = "Join the alumni network today.";
        }
    },

    // --- AUTH FLOW ---

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        try {
            // NIST ACTOR: VERIFIER
            const user = await verifier.authenticate(email, pass);
            
            // Step 2: Trigger MFA (Subscriber Action)
            this.pendingUser = user;
            this.triggerMFA();
        } catch (err) {
            alert(err.message);
        }
    },

    triggerMFA() {
        this.mfaCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Send Real Email (using EmailJS)
        this.sendRealEmail('haridevnarayananivas@gmail.com', this.mfaCode);
        
        document.getElementById('mfa-modal').classList.remove('hidden');
    },

    sendRealEmail(email, code) {
        this.showNotification("Sending Email...", "Connecting to SMTP Server...");
        
        const myEmail = 'haridevnarayananivas@gmail.com';
        const templateParams = {
            to_email: myEmail,
            email: myEmail,
            user_email: myEmail,
            recipient: myEmail,
            reply_to: myEmail,
            message: code,
            otp_code: code,
            code: code,
            passcode: code,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        };

        emailjs.send('service_zgei7hx', 'template_t4mbvgm', templateParams)
            .then(() => {
                this.showNotification("Email Sent! 📧", `Verification code sent to haridev...`);
            }, (error) => {
                console.warn('EMAIL JS FAILED:', error);
                this.showNotification("Offline Mode Active 🌐", "Network unavailable. Using Secure Local Display.");
            });
    },

    async verifyMFA() {
        const input = document.getElementById('mfa-input').value;
        if (input === this.mfaCode) {
            // Success
            this.currentUser = this.pendingUser;
            // NIST ACTOR: RELYING PARTY (Session Start)
            rp.startSession(this.currentUser);
            
            document.getElementById('mfa-modal').classList.add('hidden');
            this.showDashboard();
        } else {
            alert("Incorrect MFA Code");
            await csp.log(this.pendingUser.id, 'LOGIN_FAIL', 'MFA failed');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;
        const bio = document.getElementById('reg-bio').value;

        try {
            // NIST ACTOR: REGISTRATION AUTHORITY (RA)
            await ra.processRegistration(name, email, pass, role, bio);
            alert("Registration Successful! Please Login.");
            this.toggleAuthMode();
        } catch (err) {
            alert(err.message);
        }
    },

    async logout() {
        // NIST ACTOR: RELYING PARTY
        rp.endSession(this.currentUser);
        this.currentUser = null;
        location.reload();
    },

    showNotification(title, msg) {
        const area = document.getElementById('notification-area');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i class="fas fa-envelope"></i>
            <div class="toast-content">
                <span class="toast-title">${title}</span>
                <span class="toast-msg">${msg}</span>
            </div>
        `;
        area.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    // --- NAVIGATION & UI ---

    showDashboard() {
        document.getElementById('auth-view').classList.add('hidden');
        document.getElementById('dashboard-view').classList.remove('hidden');
        
        document.getElementById('sidebar-name').innerText = this.currentUser.name;
        document.getElementById('sidebar-role').innerText = this.currentUser.role;
        document.getElementById('welcome-name').innerText = this.currentUser.name;

        // NIST ACTOR: RELYING PARTY (Authorization)
        if (this.currentUser.role === 'admin') {
            document.getElementById('nav-admin').classList.remove('hidden');
            document.getElementById('nav-policy').classList.remove('hidden');
        } else {
            document.getElementById('nav-admin').classList.add('hidden');
            document.getElementById('nav-policy').classList.add('hidden');
        }

        this.navigate('home');
    },

    navigate(view) {
        ['sec-home', 'sec-mentorship', 'sec-referrals', 'sec-messages', 'sec-policy', 'sec-admin'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('hidden');
        });
        
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const activeLink = Array.from(document.querySelectorAll('.nav-link')).find(l => l.getAttribute('onclick')?.includes(view));
        if (activeLink) activeLink.classList.add('active');

        const selected = document.getElementById(`sec-${view}`);
        if(selected) selected.classList.remove('hidden');

        const titles = {
            'home': 'Dashboard',
            'mentorship': 'Mentorship Programs',
            'referrals': 'Job Referrals',
            'messages': 'Secure Messages',
            'policy': 'Access Control Policy',
            'admin': 'Security Audit Logs'
        };
        document.getElementById('page-title').innerText = titles[view];

        if (view === 'home') this.loadHome();
        if (view === 'mentorship') this.loadMentorship();
        if (view === 'referrals') this.loadReferrals();
        if (view === 'messages') this.loadMessagesView();
        if (view === 'policy') this.loadPolicy();
        if (view === 'admin') this.loadAdmin();
    },

    // --- FEATURE IMPLEMENTATIONS ---

    loadHome() {
        // NIST ACTOR: CSP (Decoding)
        const decodedBio = csp.decodeBase64(this.currentUser.bioEncoded);
        document.getElementById('display-bio').innerText = decodedBio;
    },

    // 1. MENTORSHIP
    async loadMentorship() {
        // NIST ACTOR: RP (Check Permission)
        const canCreate = rp.checkPermission(this.currentUser, 'mentorship', 'create');
        const canApprove = rp.checkPermission(this.currentUser, 'mentorship', 'approve');

        if (canCreate) document.getElementById('student-mentor-actions').classList.remove('hidden');
        else document.getElementById('student-mentor-actions').classList.add('hidden');

        const list = document.getElementById('mentorship-list');
        list.innerHTML = 'Loading...';
        
        const mentorships = await csp.getMentorships();
        list.innerHTML = '';
        
        mentorships.forEach(req => {
            const div = document.createElement('div');
            div.className = 'card';
            div.style.borderTop = req.status === 'Approved' ? '4px solid var(--success)' : '4px solid var(--warning)';
            div.innerHTML = `
                <div class="card-header">
                    <h3>${req.topic}</h3>
                    <span class="badge" style="background:${req.status === 'Approved' ? '#ecfdf5; color:#059669' : '#fffbeb; color:#b45309'}">${req.status}</span>
                </div>
                <div class="card-body">
                    <p style="margin-bottom:1rem; color:var(--text-secondary)">Requested by: <strong>${req.studentName}</strong></p>
                    ${canApprove && req.status === 'Pending' ? 
                      `<button class="btn btn-primary btn-block" onclick="app.approveMentorship('${req.id}')">Approve Request</button>` : ''}
                </div>
            `;
            list.appendChild(div);
        });
    },

    async handleMentorshipRequest(e) {
        e.preventDefault();
        const topic = document.getElementById('mentor-topic').value;
        
        await csp.createMentorship(this.currentUser.id, this.currentUser.name, topic);
        await csp.log(this.currentUser.id, 'MENTOR_REQ', `Requested: ${topic}`);
        
        this.loadMentorship();
        document.getElementById('mentor-topic').value = '';
    },

    async approveMentorship(id) {
        await csp.approveMentorship(id);
        await csp.log(this.currentUser.id, 'MENTOR_APPROVE', `Approved req: ${id}`);
        this.loadMentorship();
    },

    // 2. REFERRALS
    async loadReferrals() {
        const canCreate = rp.checkPermission(this.currentUser, 'referrals', 'create');
        if (canCreate) document.getElementById('alumni-referral-actions').classList.remove('hidden');
        else document.getElementById('alumni-referral-actions').classList.add('hidden');

        const list = document.getElementById('referral-list');
        list.innerHTML = 'Loading...';

        const referrals = await csp.getReferrals();
        list.innerHTML = '';

        for (const ref of referrals) {
            const dataString = ref.company + ref.role + ref.desc;
            // NIST ACTOR: CSP (Integrity Check)
            const isValid = await csp.verifyIntegrity(dataString, ref.hash);

            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `
                <div class="card-header">
                    <h3>${ref.role}</h3>
                    ${isValid ? 
                        '<span class="badge badge-enc"><i class="fas fa-check-circle"></i> Verified</span>' : 
                        '<span class="badge" style="background:#fee2e2; color:#b91c1c"><i class="fas fa-exclamation-triangle"></i> TAMPERED</span>'}
                </div>
                <h4 style="color:var(--primary); margin-bottom:0.5rem;">${ref.company}</h4>
                <p style="color:var(--text-secondary); margin-bottom:1rem;">${ref.desc}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f3f4f6; padding-top:1rem; font-size:0.85rem;">
                    <span><i class="fas fa-user-tie"></i> ${ref.alumniName}</span>
                    <span style="font-family:monospace; color:#9ca3af" title="${ref.hash}">Sig: ${ref.hash.substring(0, 10)}...</span>
                </div>
            `;
            list.appendChild(div);
        }
    },

    async handleReferralPost(e) {
        e.preventDefault();
        const company = document.getElementById('ref-company').value;
        const role = document.getElementById('ref-role').value;
        const desc = document.getElementById('ref-desc').value;

        const dataString = company + role + desc;
        // NIST ACTOR: CSP (Signing)
        const hash = await csp.hashText(dataString); 

        await csp.createReferral(this.currentUser.id, this.currentUser.name, company, role, desc, hash);
        await csp.log(this.currentUser.id, 'REF_POST', `Posted referral for ${company}`);
        
        this.loadReferrals();
        e.target.reset();
    },

    // 3. MESSAGES
    loadMessagesView() {
        this.renderChatContacts();
        if (this.activeChatPartner) {
            this.renderChatWindow(this.activeChatPartner);
        } else {
            document.getElementById('chat-window-header').innerHTML = '<p class="text-center" style="width:100%; color:var(--text-secondary)">Select a contact to start chatting</p>';
            document.getElementById('chat-messages').innerHTML = '';
        }
    },

    async renderChatContacts() {
        const container = document.getElementById('chat-contacts');
        container.innerHTML = 'Loading...';
        
        const users = await csp.getUsers();
        container.innerHTML = '';
        
        users.forEach(u => {
            if (u.id === this.currentUser.id) return;
            const div = document.createElement('div');
            div.className = `contact-item ${this.activeChatPartner === u.id ? 'active' : ''}`;
            div.onclick = () => {
                this.activeChatPartner = u.id;
                this.loadMessagesView();
            };
            div.innerHTML = `
                <div class="avatar-small">${this.getInitials(u.name)}</div>
                <div class="contact-info">
                    <h4>${u.name}</h4>
                    <span class="role-badge">${u.role}</span>
                </div>
            `;
            container.appendChild(div);
        });
    },

    async renderChatWindow(partnerId) {
        const users = await csp.getUsers();
        const partner = users.find(u => u.id === partnerId);
        
        document.getElementById('chat-window-header').innerHTML = `
            <div class="avatar-small" style="background:var(--accent)">${this.getInitials(partner.name)}</div>
            <div>
                <h3 style="margin:0">${partner.name}</h3>
                <small style="color:var(--text-secondary)">Secure Channel • AES-256</small>
            </div>
        `;

        const allMessages = await csp.getMessages();
        const messages = allMessages.filter(m => 
            (m.fromId === this.currentUser.id && m.toId === partnerId) ||
            (m.fromId === partnerId && m.toId === this.currentUser.id)
        ).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

        const chatContainer = document.getElementById('chat-messages');
        chatContainer.innerHTML = '';
        
        for (const msg of messages) {
            const isMe = msg.fromId === this.currentUser.id;
            let text = "";
            try {
                // NIST ACTOR: CSP (Decryption)
                const keyToUse = isMe ? partner.encryptionKey : this.currentUser.encryptionKey;
                const keyObj = await csp.importKey(keyToUse);
                text = await csp.decryptData(msg.encryptedContent, msg.iv, keyObj);
            } catch(e) { text = "Error decrypting"; }

            const bubble = document.createElement('div');
            bubble.className = `message-bubble ${isMe ? 'me' : 'them'}`;
            const time = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            bubble.innerHTML = `
                <div class="msg-avatar">${this.getInitials(isMe ? this.currentUser.name : partner.name)}</div>
                <div class="msg-content">
                    <p>${text}</p>
                    <span class="msg-time">${time}</span>
                </div>
            `;
            chatContainer.appendChild(bubble);
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;
    },

    async handleChatSend(e) {
        e.preventDefault();
        if (!this.activeChatPartner) return;
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        const users = await csp.getUsers();
        const partner = users.find(u => u.id === this.activeChatPartner);
        
        // NIST ACTOR: CSP (Encryption)
        const recipientKey = await csp.importKey(partner.encryptionKey);
        const encryptedData = await csp.encryptData(text, recipientKey);

        await csp.createMessage(this.currentUser.id, this.activeChatPartner, encryptedData.content, encryptedData.iv);
        this.renderChatWindow(this.activeChatPartner);
        input.value = '';
    },

    loadPolicy() {
        const policyData = [
            { resource: "Mentorship Requests", action: "Create", subjects: ["Student"], justification: "Students initiate requests for guidance." },
            { resource: "Mentorship Requests", action: "Approve", subjects: ["Alumni"], justification: "Only Alumni can accept mentees." },
            { resource: "Job Referrals", action: "Post (Create)", subjects: ["Alumni"], justification: "Alumni provide opportunities from their companies." },
            { resource: "Job Referrals", action: "View", subjects: ["Student", "Alumni"], justification: "Public info available to all verified users." },
            { resource: "Secure Messages", action: "Send/Read", subjects: ["Student", "Alumni"], justification: "Private encrypted communication channel." },
            { resource: "System Logs", action: "View", subjects: ["Admin"], justification: "Security auditing is restricted to administrators." },
            { resource: "Security Policy", action: "View", subjects: ["Admin"], justification: "Access control rules are managed by Admin." }
        ];

        const tbody = document.getElementById('policy-body');
        tbody.innerHTML = '';
        policyData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.resource}</strong></td>
                <td>${row.action}</td>
                <td>${row.subjects.map(s => `<span class="badge" style="background:${s==='Admin'?'#f3f4f6':'#eef2ff'}; color:${s==='Admin'?'#374151':'#4f46e5'}">${s}</span>`).join(' ')}</td>
                <td style="color:var(--text-secondary); font-size:0.9rem;">${row.justification}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async loadAdmin() {
        if (this.currentUser.role !== 'admin') return;
        const tbody = document.getElementById('logs-body');
        tbody.innerHTML = 'Loading...';
        
        const logs = await csp.getLogs();
        const users = await csp.getUsers(); // To Map Names
        
        tbody.innerHTML = '';
        logs.forEach(log => {
            const user = users.find(u => u.id === log.userId);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-family:monospace">${new Date(log.timestamp).toLocaleTimeString()}</span></td>
                <td><strong>${user ? user.name : 'System'}</strong></td>
                <td><span class="badge" style="background:#f3f4f6; color:#374151">${log.action}</span></td>
                <td>${log.details}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    }
};

document.getElementById('login-form').addEventListener('submit', (e) => app.handleLogin(e));
document.getElementById('register-form').addEventListener('submit', (e) => app.handleRegister(e));

app.init();
