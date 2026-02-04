/**
 * NIST ACTOR: CREDENTIAL SERVICE PROVIDER (CSP)
 * Responsibilities:
 * - Cryptographic Operations (Hashing, Encryption, KeyGen)
 * - Credential Storage (Interface to Backend)
 * - Audit Logging
 */
class CredentialServiceProvider {
    constructor() {
        this.apiUrl = 'http://localhost:3000/api';
        this.isSimulated = false;
        this.init();
    }

    init() {
        // Check Web Crypto API
        if (!window.crypto || !window.crypto.subtle) {
            console.warn("CSP: Web Crypto API Unavailable. Simulation Mode.");
            this.isSimulated = true;
        }
        console.log("CSP: Connected to Backend at " + this.apiUrl);
    }

    // --- CRYPTO PRIMITIVES ---

    generateSalt() {
        return window.crypto.getRandomValues(new Uint8Array(16));
    }

    bufferToHex(buffer) {
        return [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    hexToBuffer(hex) {
        const tokens = hex.match(/.{1,2}/g);
        const buffer = new Uint8Array(tokens.map(t => parseInt(t, 16)));
        return buffer.buffer;
    }

    // --- HASHING ---
    async hashText(text, saltHex = '') {
        if (this.isSimulated) {
            let hash = 0;
            const str = text + saltHex;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }
            return "SIM_SHA256_" + Math.abs(hash).toString(16);
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(text + saltHex);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return this.bufferToHex(hashBuffer);
    }

    async verifyIntegrity(text, originalHash) {
        const newHash = await this.hashText(text);
        return newHash === originalHash;
    }

    // --- ENCRYPTION (AES-GCM) ---
    async generateKey() {
        if (this.isSimulated) return "SIMULATED_KEY_" + Date.now();

        const key = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        return key;
    }

    async exportKey(key) {
        if (this.isSimulated) return key;
        const exported = await window.crypto.subtle.exportKey("jwk", key);
        return JSON.stringify(exported);
    }

    async importKey(jsonStr) {
        if (this.isSimulated) return jsonStr;
        // HYBRID FIX: Handle simulated keys from seeded DB
        if (typeof jsonStr === 'string' && jsonStr.startsWith('SIMULATED_KEY')) {
            return jsonStr;
        }
        return await window.crypto.subtle.importKey(
            "jwk",
            JSON.parse(jsonStr),
            { name: "AES-GCM" },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async encryptData(text, key) {
        // HYBRID FIX: If key is a simulated string, use sim logic
        if (this.isSimulated || (typeof key === 'string' && key.startsWith('SIMULATED_KEY'))) {
            return { content: btoa(text), iv: "SIM_IV_" + Date.now() };
        }

        const encoder = new TextEncoder();
        const encoded = encoder.encode(text);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encoded
        );

        return {
            content: this.bufferToHex(encrypted),
            iv: this.bufferToHex(iv)
        };
    }

    async decryptData(encryptedHex, ivHex, key) {
        // HYBRID FIX: If key is a simulated string, use sim logic
        if (this.isSimulated || (typeof key === 'string' && key.startsWith('SIMULATED_KEY'))) {
            try { return atob(encryptedHex); } catch(e) { return "[Error]"; }
        }

        try {
            const encryptedBuffer = this.hexToBuffer(encryptedHex);
            const ivBuffer = this.hexToBuffer(ivHex);
            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: ivBuffer },
                key,
                encryptedBuffer
            );
            return new TextDecoder().decode(decrypted);
        } catch (e) {
            console.error(e);
            return "[Decryption Failed - Integrity Check Failed]";
        }
    }

    encodeBase64(str) { return btoa(str); }
    decodeBase64(str) { try { return atob(str); } catch(e) { return "Error"; } }

    // --- DATA MANAGEMENT (API CALLS) ---
    
    async getUserByEmail(email) {
        try {
            // We use the login endpoint to find the user by email for now, 
            // or we could add a specific search endpoint. 
            // The current flow calls 'authenticate' in Verifier.
            // Let's rely on the Verifier to call the API.
            // This method helps RA check if user exists.
            const res = await fetch(this.apiUrl + '/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, password: '' }) 
            });
            if(res.ok) return await res.json();
            return null; 
        } catch(e) { return null; }
    }

    async getUsers() {
        const res = await fetch(this.apiUrl + '/users');
        return await res.json();
    }

    async createUser(name, email, role, passwordHash, salt, bioEncoded) {
        const keyObj = await this.generateKey();
        const keyStr = await this.exportKey(keyObj);

        const res = await fetch(this.apiUrl + '/auth/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                name, email, role, passwordHash, salt, bioEncoded,
                encryptionKey: keyStr
            })
        });

        if(!res.ok) throw new Error("Registration Failed");
        const newUser = await res.json();
        this.log(newUser.id, 'REGISTER', `New user registered as ${role}`);
        return newUser;
    }

    async getMentorships() {
        const res = await fetch(this.apiUrl + '/mentorships');
        return await res.json();
    }

    async createMentorship(studentId, studentName, topic) {
        const res = await fetch(this.apiUrl + '/mentorships', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ studentId, studentName, topic })
        });
        return await res.json();
    }

    async approveMentorship(id) {
        await fetch(this.apiUrl + `/mentorships/${id}/approve`, { method: 'POST' });
    }

    async getReferrals() {
        const res = await fetch(this.apiUrl + '/referrals');
        return await res.json();
    }

    async createReferral(alumniId, alumniName, company, role, desc, hash) {
        const res = await fetch(this.apiUrl + '/referrals', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ alumniId, alumniName, company, role, desc, hash })
        });
        return await res.json();
    }

    async getMessages() {
        const res = await fetch(this.apiUrl + '/messages');
        return await res.json();
    }

    async createMessage(fromId, toId, encryptedContent, iv) {
        const res = await fetch(this.apiUrl + '/messages', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ fromId, toId, encryptedContent, iv })
        });
        return await res.json();
    }

    async getLogs() {
        const res = await fetch(this.apiUrl + '/logs');
        return await res.json();
    }

    async log(userId, action, details) {
        await fetch(this.apiUrl + '/logs', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId, action, details })
        });
    }

    // Demo Attack
    async corruptReferral(id) {
        // This would need a specific backend endpoint to simulate corruption
        // or we just modify the DOM/local state if strictly for demo.
        // For now, let's just log it.
        console.warn("Attack simulation requires backend support or local DOM manipulation.");
        this.log('ATTACKER', 'DATA_TAMPER', `Attempted corruption on Ref ${id}`);
    }
}

const csp = new CredentialServiceProvider();
