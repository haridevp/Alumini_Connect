/**
 * NIST ACTOR: REGISTRATION AUTHORITY (RA)
 * Responsibilities:
 * - Identity Proofing (Verify user exists/valid)
 * - Credential Issuance Request
 */
class RegistrationAuthority {
    
    async processRegistration(name, email, password, role, bio) {
        console.log("DEBUG: RA.processRegistration start");
        // 1. Identity Proofing
        if (!email.includes('@')) throw new Error("Invalid Email Format");
        
        console.log("DEBUG: Checking if user exists...");
        const existing = await csp.getUserByEmail(email);
        console.log("DEBUG: User exists check result:", existing);
        if (existing) throw new Error("User already registered (Identity Conflict)");

        // 2. Prepare Credentials
        console.log("DEBUG: Preparing credentials...");
        const salt = csp.bufferToHex(csp.generateSalt());
        const passwordHash = await csp.hashText(password, salt);
        const bioEncoded = csp.encodeBase64(bio);

        // 3. Issue Credential via CSP
        console.log("DEBUG: Issuing credential via CSP...");
        return await csp.createUser(name, email, role, passwordHash, salt, bioEncoded);
    }
}

const ra = new RegistrationAuthority();
