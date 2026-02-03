/**
 * NIST ACTOR: REGISTRATION AUTHORITY (RA)
 * Responsibilities:
 * - Identity Proofing (Verify user exists/valid)
 * - Credential Issuance Request
 */
class RegistrationAuthority {
    
    async processRegistration(name, email, password, role, bio) {
        // 1. Identity Proofing
        if (!email.includes('@')) throw new Error("Invalid Email Format");
        
        const existing = await csp.getUserByEmail(email);
        if (existing) throw new Error("User already registered (Identity Conflict)");

        // 2. Prepare Credentials
        const salt = csp.bufferToHex(csp.generateSalt());
        const passwordHash = await csp.hashText(password, salt);
        const bioEncoded = csp.encodeBase64(bio);

        // 3. Issue Credential via CSP
        return await csp.createUser(name, email, role, passwordHash, salt, bioEncoded);
    }
}

const ra = new RegistrationAuthority();
