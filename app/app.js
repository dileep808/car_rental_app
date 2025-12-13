// Import express.js
const express = require("express");
const { User } = require("./models/user");
const db = require('./services/db');

const cookieParser = require("cookie-parser");
const session = require('express-session');
const bodyParser = require('body-parser');

// Create express app
const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session config
const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: "driveyourpassion",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}));

// View engine
app.set("view engine", "pug");
app.set("views", "app/views");

// Static files
app.use(express.static("static"));

/* ===========================
   ROUTES
=========================== */

// Home
app.get("/", (req, res) => {
    res.render("homepage", { title: "Car Rental" });
});

/* ---------- LOGIN ---------- */

app.get("/login", (req, res) => {
    if (req.session.uid) return res.redirect('/');
    res.render("login");
});

app.post("/authenticate", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
        return res.status(400).send("Email and password required");

    try {
        const user = new User({ email });
        const isValid = await user.authenticate(password);

        if (!isValid) return res.status(401).send("Invalid credentials");

        req.session.uid = user.id;
        req.session.role = user.role;
        res.redirect("/dashboard");
    } catch (err) {
        console.error(err);
        res.status(500).send("Login failed");
    }
});

/* ---------- REGISTRATION ---------- */

app.get("/registration", (req, res) => {
    res.render("registration", { title: "Create Account | Velocity Rentals" });
});

app.post("/registration", async (req, res) => {
    const {
        fullName,
        email,
        phone,
        role,
        password,
        confirmPassword
    } = req.body;

    if (!fullName || !email || !phone || !role || !password)
        return res.status(400).send("All fields are required");

    if (password !== confirmPassword)
        return res.status(400).send("Passwords do not match");

    try {
        const user = new User({
            fullName,
            email,
            phone,
            role
        });

        const existing = await user.getIdFromEmail();
        if (existing) return res.status(409).send("Email already registered");

        await user.register(password);

        req.session.uid = user.id;
        req.session.role = user.role;

        res.redirect("/dashboard");
    } catch (err) {
        console.error(err);
        res.status(500).send("Registration failed");
    }
});

/* ---------- LOGOUT ---------- */

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

/* ---------- DASHBOARD ---------- */

app.get("/dashboard", async (req, res) => {
    if (!req.session.uid) return res.redirect("/login");

    try {
        const search = (req.query.search || "").trim();
        const likeSearch = `%${search}%`;

        const metrics = (await db.query(
            "SELECT * FROM dashboard_metrics LIMIT 1"
        ))[0] || {};

        let bookingWhere = "b.status IN ('booked','ongoing')";
        const params = [];

        if (search) {
            bookingWhere += `
              AND (
                c.make LIKE ? OR
                c.model LIKE ? OR
                u.full_name LIKE ?
              )`;
            params.push(likeSearch, likeSearch, likeSearch);
        }

        const bookings = await db.query(`
            SELECT
              b.id,
              c.make,
              c.model,
              c.year,
              u.full_name AS customer,
              b.status,
              b.start_date,
              b.end_date,
              b.total_price
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            JOIN users u ON b.user_id = u.id
            WHERE ${bookingWhere}
            ORDER BY b.start_date ASC
            LIMIT 25
        `, params);

        const fleet = await db.query(`
            SELECT id, make, model, year, status, daily_rate, location
            FROM cars
            ORDER BY status, make
        `);

        res.render("dashboard", {
            title: "Fleet Dashboard | Velocity Rentals",
            metrics,
            bookings,
            fleet,
            search,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.render("dashboard", {
            metrics: {},
            bookings: [],
            fleet: [],
            search: "",
            error: "Failed to load dashboard"
        });
    }
});

/* ---------- CAR DETAILS ---------- */

app.get("/details/:carId", async (req, res) => {
    const carId = Number(req.params.carId);
    if (!Number.isInteger(carId))
        return res.status(400).send("Invalid car ID");

    try {
        const car = (await db.query(
            "SELECT * FROM cars WHERE id = ? LIMIT 1",
            [carId]
        ))[0];

        if (!car) return res.status(404).send("Car not found");

        const bookings = await db.query(`
            SELECT
              b.id,
              b.start_date,
              b.end_date,
              b.status,
              b.total_price,
              u.full_name AS customer
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            WHERE b.car_id = ?
            ORDER BY b.start_date DESC
        `, [carId]);

        res.render("details", {
            title: `${car.make} ${car.model}`,
            car,
            bookings,
            error: null
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to load car details");
    }
});

/* ---------- PROFILE ---------- */

app.get("/profile", async (req, res) => {
    if (!req.session.uid) return res.redirect("/login");

    const user = (await db.query(
        "SELECT full_name, email, phone, role FROM users WHERE id = ?",
        [req.session.uid]
    ))[0];

    res.render("profile", { title: "Profile", user });
});

// Start server
app.listen(3000, () => {
    console.log("Server running at http://127.0.0.1:3000");
});
