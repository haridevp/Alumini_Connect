const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB, User, Mentorship, Referral, Message, Log } = require('./database');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

const allowedOrigins = ['https://haridevp.dev', 'https://haridevp.github.io', 'https://alumini-connect-kpel.onrender.com', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// --- UTILS ---
const generateId = () => Date.now().toString();

// --- AUTH ROUTES ---

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found" });

        // For this transition phase, we return the user object so the frontend Verifier can check the hash.
        // We'll map the mongoose object to a plain object.
        const userData = user.toObject();
        // Ensure ID is a string for frontend compatibility
        userData.id = userData.id || userData._id.toString(); 
        
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Register
app.post('/api/auth/register', async (req, res) => {
    console.log("Register Request Body:", req.body);
    const { name, email, role, passwordHash, salt, bioEncoded } = req.body;
    const id = generateId(); // Use our string ID generator 
    const encryptionKey = req.body.encryptionKey || "SERVER_GENERATED_KEY"; 

    try {
        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            console.log("User already exists:", email);
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            id,
            name,
            email,
            role,
            passwordHash,
            salt,
            bioEncoded,
            encryptionKey
        });

        console.log("User created successfully:", user.id);
        res.status(201).json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get All Users (for Chat Contacts)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'id name email role encryptionKey'); // Select specific fields
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MENTORSHIP ROUTES ---

app.get('/api/mentorships', async (req, res) => {
    try {
        const mentorships = await Mentorship.find().sort({ timestamp: -1 });
        res.json(mentorships);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mentorships', async (req, res) => {
    const { studentId, studentName, topic } = req.body;
    const id = generateId();

    try {
        const newMentorship = await Mentorship.create({
            id,
            studentId,
            studentName,
            topic
        });
        res.status(201).json(newMentorship);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mentorships/:id/approve', async (req, res) => {
    const { id } = req.params;
    try {
        const updated = await Mentorship.findOneAndUpdate(
            { id: id }, 
            { status: 'Approved' }, 
            { new: true }
        );
        if(!updated) return res.status(404).json({ error: "Mentorship not found" });
        res.json({ success: true, data: updated });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REFERRAL ROUTES ---

app.get('/api/referrals', async (req, res) => {
    try {
        const referrals = await Referral.find().sort({ timestamp: -1 });
        res.json(referrals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/referrals', async (req, res) => {
    const { alumniId, alumniName, company, role, desc, hash } = req.body;
    const id = generateId();

    try {
        const newReferral = await Referral.create({
            id,
            alumniId,
            alumniName,
            company,
            role,
            desc,
            hash
        });
        res.status(201).json(newReferral);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- MESSAGE ROUTES ---

app.get('/api/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({ timestamp: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/messages', async (req, res) => {
    const { fromId, toId, encryptedContent, iv } = req.body;
    const id = generateId();

    try {
        const newMessage = await Message.create({
            id,
            fromId,
            toId,
            encryptedContent,
            iv
        });
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- LOGGING ROUTES ---
app.get('/api/logs', async (req, res) => {
    try {
        const logs = await Log.find().sort({ timestamp: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/logs', async (req, res) => {
    const { userId, action, details } = req.body;

    try {
        await Log.create({
            userId,
            action,
            details
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
