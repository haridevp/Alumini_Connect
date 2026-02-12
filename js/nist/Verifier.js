/**
 * NIST ACTOR: VERIFIER
 * Responsibilities:
 * - Authentication (Check Credentials)
 * - Verify Bindings (Hash Checks)
 */
class Verifier {
    
    async authenticate(email, password) {
        // 1. Retrieve Credential Info from CSP
        // NOTE: In the current backend implementation, sending the password to the 
        // login endpoint might already perform the check on the server.
        // However, to keep the NIST actor logic separated as per the original design:
        // We will fetch the user data (which acts as retrieving the 'Credential Info')
        // and then perform the hash verification here on the client side (Verifier Actor).
        
        const user = await csp.getUserByEmail(email);
        if (!user) throw new Error("User not found");

        // 2. Perform Verification Calculation
        const hashToCheck = await csp.hashText(password, user.salt);

        // 3. Compare
        if (hashToCheck === user.passwordHash) {
            // Success
            return user;
        } else {
            // Fail
            await csp.log(user.id, 'LOGIN_FAIL', 'Invalid Password Attempt');
            throw new Error("Invalid Credentials");
        }
    }
}

const verifier = new Verifier();
