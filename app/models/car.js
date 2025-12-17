const db = require("../services/db");

class Car {
  id;
  make;
  model;
  year;
  daily_rate;
  location;
  status;
  created_by;

  constructor({
    id = null,
    make = null,
    model = null,
    year = null,
    daily_rate = null,
    location = null,
    status = "available",
    created_by = null,
  }) {
    this.id = id;
    this.make = make;
    this.model = model;
    this.year = year;
    this.daily_rate = daily_rate;
    this.location = location;
    this.status = status;
    this.created_by = created_by;
  }

  // 🔹 Get car by ID (with owner)
  async getById() {
    const result = await db.query("SELECT * FROM cars WHERE id = ?", [this.id]);
    return result.length ? result[0] : null;
  }

  // 🔹 Create car (agent only)
  async create() {
    const result = await db.query(
      `
            INSERT INTO cars
            (make, model, year, daily_rate, location, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      [
        this.make,
        this.model,
        this.year,
        this.daily_rate,
        this.location,
        this.status,
        this.created_by,
      ]
    );

    this.id = result.insertId;
    return this.id;
  }

  // 🔹 Update car (only owner)
  async update() {
    const result = await db.query(
      `
            UPDATE cars
            SET make=?, model=?, year=?, daily_rate=?, location=?, status=?
            WHERE id=? AND created_by=?
        `,
      [
        this.make,
        this.model,
        this.year,
        this.daily_rate,
        this.location,
        this.status,
        this.id,
        this.created_by,
      ]
    );

    return result.affectedRows > 0;
  }

  // 🔹 Delete car (only owner)
  async delete() {
    const result = await db.query(
      "DELETE FROM cars WHERE id=? AND created_by=?",
      [this.id, this.created_by]
    );
    return result.affectedRows > 0;
  }
}

module.exports = { Car };
