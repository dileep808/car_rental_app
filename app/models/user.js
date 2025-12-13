// services/db connection
const db = require('../services/db');
const bcrypt = require("bcryptjs");

class User {

    id;
    fullName;
    email;
    phone;
    role;

    constructor({ fullName = null, email, phone = null, role = 'customer' }) {
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
    }

    // 🔹 Check if user exists by email
    async getIdFromEmail() {
        const sql = "SELECT id FROM users WHERE email = ?";
        const result = await db.query(sql, [this.email]);

        if (result.length > 0) {
            this.id = result[0].id;
            return this.id;
        }
        return false;
    }

    // 🔹 Create new user (Registration)
    async register(password) {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO users (full_name, email, phone, role, password)
            VALUES (?, ?, ?, ?, ?)
        `;

        const result = await db.query(sql, [
            this.fullName,
            this.email,
            this.phone,
            this.role,
            hashedPassword
        ]);

        this.id = result.insertId;
        return this.id;
    }

    // 🔹 Authenticate user (Login)
    async authenticate(submittedPassword) {
        const sql = "SELECT id, password FROM users WHERE email = ?";
        const result = await db.query(sql, [this.email]);

        if (result.length === 0) return false;

        this.id = result[0].id;
        const match = await bcrypt.compare(submittedPassword, result[0].password);

        return match;
    }

    // 🔹 Update password (optional future use)
    async updatePassword(newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const sql = "UPDATE users SET password = ? WHERE id = ?";
        await db.query(sql, [hashedPassword, this.id]);
        return true;
    }
}

module.exports = {
    User
};
