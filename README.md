# Alumni Connect: Secure Alumni-Student Networking Platform

Project for the course 23CSE313 - Foundations of Cyber Security for Lab Evaluation 1

## Project Overview

**Alumni Connect** is a secure, role-based networking system designed to facilitate mentorship and job referrals between students and alumni. The application ensures that personal communications are encrypted, credentials are identity-proofed, and critical data like job referrals are tamper-evident.

This project was developed to demonstrate practical implementation of core security concepts: Authentication, Authorization (Access Control), Encryption, Hashing, and Encoding, strictly following the **NIST SP 800-63-2** architecture.

## Key Features & Security Implementation
This application implements all required security components as defined in the evaluation rubric.

### 1. Authentication (NIST SP 800-63-2 Compliant)
- **Single-Factor Authentication (SFA):** Username and Password login. Passwords are hashed using **SHA-256** with a unique random **Salt** for every user before verification.
- **Multi-Factor Authentication (MFA):** Implemented Out-of-Band (OOB) authentication using **Email OTP** (simulated/EmailJS) to achieve **Level of Assurance (LOA) 2**. The login flow enforces a two-step verification process.
- **NIST Architecture:** The authentication flow is split between specific actors:
    - **Claimant:** The user providing credentials.
    - **Verifier:** The module that cryptographically verifies the hash.
    - **CSP (Credential Service Provider):** The module that manages the salt and hash storage.

### 2. Authorization & Access Control (RBAC)
- **Access Control Matrix:**
- **Subjects (Roles):**
    - **Student:** Can WRITE (Request) mentorships, READ referrals, and SEND encrypted messages.
    - **Alumni:** Can APPROVE mentorships, WRITE (Post) job referrals, and READ messages.
    - **Admin:** Can VIEW system logs and AUDIT security policies. Cannot view private encrypted messages.
- **Objects:** Mentorship Requests, Job Referrals, Secure Messages, System Logs.
- **Enforcement:** The **Relying Party (RP)** actor enforces an Access Control List (ACL) before any UI component is rendered or action is permitted.

### 3. Encryption & Decryption (AES-GCM)
- **Data in Transit/Rest:** Private messages are encrypted using **AES-GCM (256-bit)** via the Web Crypto API.
- **Confidentiality:** The server (SQLite) stores only the *ciphertext* and the *Initialization Vector (IV)*. It never sees the plaintext message.
- **Key Management:** Each user acts as a node with a specific **AES-GCM Key** generated during registration.

### 4. Key Exchange Mechanism
- **Mechanism:** Simulated Key Directory.
- **Implementation:**
    - The CSP maintains a directory of user keys (stored as JWK).
    - When User A sends a message to User B, the CSP retrieves User B's **Encryption Key**.
    - The message is encrypted client-side before transmission.
    - *Note:* For this lab simulation, we use a shared directory model to demonstrate the flow of key retrieval and usage.

### 5. Data Integrity & Tamper Detection (Digital Signatures)
- **Hashing:** Critical data (Job Referrals) is signed using a **SHA-256** hash of the content (`Company + Role + Description`).
- **Tamper Detection:** The application calculates the hash of the data on load and compares it with the stored signature.
- **Attack Simulation:** A dedicated **"Simulate Attack"** feature allows the Admin to modify a database record *without* updating the signature, instantly triggering a "TAMPERED" warning in the UI.

### 6. Encoding
- **Base64:** User Bio information is encoded into **Base64** strings by the Registration Authority (RA) before storage. This ensures safe handling of special characters and demonstrates encoding vs. encryption.

## Tech Stack
- **Frontend Architecture:** Vanilla JS (Implementing NIST Actors: RA, CSP, RP, Verifier)
- **Backend:** Node.js + Express.js
- **Database:** SQLite (File-based, persistent)
- **Cryptography:** Web Crypto API (Browser Native)

## Running the Application

### 1. Install Dependencies
Navigate to the server directory and install the required Node.js packages:
```bash
cd server
npm install
```

### 2. Start the Backend
Start the Express server (runs on port 3000):
```bash
node index.js
# Or
npm start
```

### 3. Access the Frontend
1. Open the `alumni_platform` folder.
2. Open `index.html` in your web browser.
3. Login with the default credentials:
   - **Admin:** `admin@focs.com` / `password`
   - **Student:** `student@focs.com` / `password`

## Environment Setup
The project comes pre-seeded with a SQLite database (`server/alumni.sqlite`). No manual database configuration is required.
