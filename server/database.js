const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/alumni_connect";
        await mongoose.connect(uri); // No deprecated options needed for Mongoose 6+
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1);
    }
};

// --- MODELS ---

// 1. User Schema
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Using String ID for compatibility with frontend
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['student', 'alumni', 'admin'], required: true },
    passwordHash: { type: String, required: true },
    salt: { type: String },
    bioEncoded: { type: String },
    encryptionKey: { type: String }
});

// 2. Mentorship Schema
const MentorshipSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    studentId: { type: String, required: true },
    studentName: { type: String, required: true },
    topic: { type: String, required: true },
    status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] },
    timestamp: { type: Date, default: Date.now }
});

// 3. Referral Schema
const ReferralSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    alumniId: { type: String, required: true },
    alumniName: { type: String, required: true },
    company: { type: String, required: true },
    role: { type: String, required: true },
    desc: { type: String },
    hash: { type: String }, // For integrity check
    timestamp: { type: Date, default: Date.now }
});

// 4. Message Schema
const MessageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    fromId: { type: String, required: true },
    toId: { type: String, required: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

// 5. Log Schema
const LogSchema = new mongoose.Schema({
    userId: { type: String },
    action: { type: String, required: true },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Mentorship = mongoose.model('Mentorship', MentorshipSchema);
const Referral = mongoose.model('Referral', ReferralSchema);
const Message = mongoose.model('Message', MessageSchema);
const Log = mongoose.model('Log', LogSchema);

module.exports = {
    connectDB,
    User,
    Mentorship,
    Referral,
    Message,
    Log
};
