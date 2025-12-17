const db = require('../services/db');

class Car {

    id;
    make;
    model;
    year;
    daily_rate;
    location;
    status;

    constructor({
        id = null,
        make = null,
        model = null,
        year = null,
        daily_rate = null,
        location = null,
        status = 'available'
    }) {
        this.id = id;
        this.make = make;
        this.model = model;
        this.year = year;
        this.daily_rate = daily_rate;
        this.location = location;
        this.status = status;
    }

    // 🔹 Get all cars
    static async getAll() {
        return await db.query("SELECT * FROM cars ORDER BY created_at DESC");
    }

    // 🔹 Get car by ID
    async getById() {
        const result = await db.query(
            "SELECT * FROM cars WHERE id = ?",
            [this.id]
        );

        return result.length ? result[0] : null;
    }

    // 🔹 Create car
    async create() {
        const result = await db.query(`
            INSERT INTO cars (make, model, year, daily_rate, location, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            this.make,
            this.model,
            this.year,
            this.daily_rate,
            this.location,
            this.status
        ]);

        this.id = result.insertId;
        return this.id;
    }

    // 🔹 Update car
    async update() {
        await db.query(`
            UPDATE cars
            SET make=?, model=?, year=?, daily_rate=?, location=?, status=?
            WHERE id=?
        `, [
            this.make,
            this.model,
            this.year,
            this.daily_rate,
            this.location,
            this.status,
            this.id
        ]);

        return true;
    }

    // 🔹 Delete car
    async delete() {
        await db.query(
            "DELETE FROM cars WHERE id = ?",
            [this.id]
        );
        return true;
    }
}

module.exports = {
    Car
};
