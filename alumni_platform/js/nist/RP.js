/**
 * NIST ACTOR: RELYING PARTY (RP)
 * Responsibilities:
 * - Access Control (Authorization)
 * - Session Management
 * - Consuming Verified Identities
 */
class RelyingParty {
    
    // ACL Enforcement
    checkPermission(user, resource, action) {
        if (!user) return false;
        if (user.role === 'admin') return true; // Admin Override

        const permissions = {
            'student': {
                'mentorship': ['create', 'view'],
                'referrals': ['view'],
                'messages': ['send', 'receive']
            },
            'alumni': {
                'mentorship': ['approve', 'view'],
                'referrals': ['create', 'view'],
                'messages': ['send', 'receive']
            }
        };

        const resourcePerms = permissions[user.role] ? permissions[user.role][resource] : null;
        return resourcePerms && resourcePerms.includes(action);
    }

    // Session Management
    startSession(user) {
        sessionStorage.setItem('alumni_session', JSON.stringify(user));
        csp.log(user.id, 'LOGIN_SUCCESS', 'Session Started');
    }

    endSession(user) {
        if(user) csp.log(user.id, 'LOGOUT', 'Session Ended');
        sessionStorage.removeItem('alumni_session');
    }
}

const rp = new RelyingParty();
