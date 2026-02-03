const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Connect to database (creates file if not exists)
const dbPath = path.resolve(__dirname, 'alumni.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Could not connect to database', err);
    } else {
        console.log('Connected to SQLite database');
    }
});

db.serialize(() => {
    // 1. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        role TEXT,
        passwordHash TEXT,
        salt TEXT,
        bioEncoded TEXT,
        encryptionKey TEXT
    )`);

    // 2. Mentorships Table
    db.run(`CREATE TABLE IF NOT EXISTS mentorships (
        id TEXT PRIMARY KEY,
        studentId TEXT,
        studentName TEXT,
        topic TEXT,
        status TEXT,
        timestamp TEXT
    )`);

    // 3. Referrals Table
    db.run(`CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        alumniId TEXT,
        alumniName TEXT,
        company TEXT,
        role TEXT,
        desc TEXT,
        hash TEXT,
        timestamp TEXT
    )`);

    // 4. Messages Table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        fromId TEXT,
        toId TEXT,
        encryptedContent TEXT,
        iv TEXT,
        timestamp TEXT
    )`);

    // 5. Logs Table
    db.run(`CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        action TEXT,
        details TEXT,
        timestamp TEXT
    )`);

    // --- SEED DATA (Only if empty) ---
    db.get("SELECT count(*) as count FROM users", [], (err, row) => {
        if (err) return console.error(err.message);
        if (row.count === 0) {
            console.log("Seeding database with sample data...");
            
            // Users
            const users = [
                {
                    id: "1", name: "Super Admin", email: "admin@focs.com", role: "admin",
                    passwordHash: "SIM_SHA256_471ef857", salt: "abc123salt",
                    bioEncoded: "U3lzdGVtIEFkbWluaXN0cmF0b3IgZm9yIEFsdW1uaSBDb25uZWN0", encryptionKey: "SIMULATED_KEY_ADMIN"
                },
                {
                    id: "2", name: "Jane Doe", email: "alumni@focs.com", role: "alumni",
                    passwordHash: "SIM_SHA256_4c3c3a38", salt: "alumnisalt",
                    bioEncoded: "U29mdHdhcmUgRW5naW5lZXIgYXQgR29vZ2xlIHwgQmF0Y2ggb2YgMjAyMA==", encryptionKey: "SIMULATED_KEY_ALUMNI"
                },
                {
                    id: "3", name: "John Smith", email: "student@focs.com", role: "student",
                    passwordHash: "SIM_SHA256_3d2a0566", salt: "studentsalt",
                    bioEncoded: "RmluYWwgeWVhciBDU0Ugc3R1ZGVudCBpbnRlcmVzdGVkIGluIEN5YmVyc2VjdXJpdHk=", encryptionKey: "SIMULATED_KEY_STUDENT"
                }
            ];
            
            const insertUser = db.prepare("INSERT INTO users (id, name, email, role, passwordHash, salt, bioEncoded, encryptionKey) VALUES (?,?,?,?,?,?,?,?)");
            users.forEach(u => insertUser.run(u.id, u.name, u.email, u.role, u.passwordHash, u.salt, u.bioEncoded, u.encryptionKey));
            insertUser.finalize();

            // Mentorships
            const mentorships = [
                { id: "m1", studentId: "3", studentName: "John Smith", topic: "Career advice in Cybersecurity", status: "Pending", timestamp: "2026-01-28T10:00:00.000Z" },
                { id: "m2", studentId: "3", studentName: "John Smith", topic: "Backend Development Tips", status: "Approved", timestamp: "2026-01-27T14:30:00.000Z" }
            ];
            const insertMentorship = db.prepare("INSERT INTO mentorships (id, studentId, studentName, topic, status, timestamp) VALUES (?,?,?,?,?,?)");
            mentorships.forEach(m => insertMentorship.run(m.id, m.studentId, m.studentName, m.topic, m.status, m.timestamp));
            insertMentorship.finalize();

            // Referrals
            const referrals = [
                { id: "r1", alumniId: "2", alumniName: "Jane Doe", company: "Google", role: "Software Engineer Intern", desc: "Looking for passionate developers for our summer internship program.", hash: "SIM_SHA256_4e8a2", timestamp: "2026-01-28T09:15:00.000Z" }
            ];
            const insertRef = db.prepare("INSERT INTO referrals (id, alumniId, alumniName, company, role, desc, hash, timestamp) VALUES (?,?,?,?,?,?,?,?)");
            referrals.forEach(r => insertRef.run(r.id, r.alumniId, r.alumniName, r.company, r.role, r.desc, r.hash, r.timestamp));
            insertRef.finalize();

            console.log("Database seeded successfully.");
        }
    });
});

module.exports = db;
