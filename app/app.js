// Import express.js
const express = require("express");
const { User } = require("./models/user");
const db = require('./services/db');

const cookieParser = require("cookie-parser");
const session = require('express-session');
const bodyParser = require('body-parser');
const { Car } = require("./models/car");


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

function requireAgent(req, res, next) {
    if (!req.session.uid || req.session.role !== 'agent') {
        return res.status(403).send("Access denied");
    }
    next();
}


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

        if (user.role === "agent") {
          return res.redirect("/dashboard");
        } else {
          return res.redirect("/customer-dashboard");
        }

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
    if (req.session.role !== 'agent') {
        return res.redirect("/customer-dashboard");
    }

    try {
        const search = (req.query.search || "").trim();
        const likeSearch = `%${search}%`;

        const metrics = (await db.query(
            "SELECT * FROM dashboard_metrics LIMIT 1"
        ))[0] || {};

        let bookingWhere = `
            b.status IN ('booked','ongoing')
            AND c.created_by = ?
        `;
        const bookingParams = [req.session.uid];

        if (search) {
            bookingWhere += `
                AND (
                    c.make LIKE ? OR
                    c.model LIKE ? OR
                    u.full_name LIKE ?
                )
            `;
            bookingParams.push(likeSearch, likeSearch, likeSearch);
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
        `, bookingParams);
        const fleet = await db.query(`
            SELECT
                id,
                make,
                model,
                year,
                status,
                daily_rate,
                location
            FROM cars
            WHERE created_by = ?
            ORDER BY status, make
        `, [req.session.uid]);


        res.render("dashboard", {
            title: "Fleet Dashboard | Velocity Rentals",
            metrics,
            bookings,
            fleet,
            search,
            role: req.session.role,
            error: null
        });

    } catch (err) {
        console.error(err);
        res.render("dashboard", {
            title: "Fleet Dashboard | Velocity Rentals",
            metrics: {},
            bookings: [],
            fleet: [],
            search: "",
            role: req.session.role,
            error: "Failed to load dashboard"
        });
    }
});

/* ---------- CUSTOMER DASHBOARD ---------- */

app.get("/customer-dashboard", async (req, res) => {
    if (!req.session.uid) return res.redirect("/login");

    if (req.session.role === "agent") {
        return res.redirect("/dashboard");
    }

    try {
        const search = (req.query.search || "").trim();
        const likeSearch = `%${search}%`;

        let carWhere = "status = 'available'";
        const carParams = [];

        if (search) {
            carWhere += `
              AND (
                make LIKE ? OR
                model LIKE ? OR
                location LIKE ?
              )
            `;
            carParams.push(likeSearch, likeSearch, likeSearch);
        }

        const cars = await db.query(
            `SELECT id, make, model, year, daily_rate, location
             FROM cars
             WHERE ${carWhere}
             ORDER BY make`,
            carParams
        );

        const bookings = await db.query(
            `
            SELECT
              b.id,
              b.start_date,
              b.end_date,
              b.status,
              b.total_price,
              c.make,
              c.model
            FROM bookings b
            JOIN cars c ON b.car_id = c.id
            WHERE b.user_id = ?
            ORDER BY b.start_date DESC
            `,
            [req.session.uid]
        );

        res.render("customer-dashboard", {
            cars,
            bookings,
            search
        });

    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to load customer dashboard");
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

    res.render("profile", {
        user,
        role: user.role,
        success: null,
        error: null
    });
});
app.post("/profile/update", async (req, res) => {
    if (!req.session.uid) return res.redirect("/login");

    const { full_name, phone } = req.body;

    if (!full_name)
        return res.render("profile", {
            user: { full_name, phone },
            role: req.session.role,
            error: "Full name is required",
            success: null
        });

    await db.query(
        "UPDATE users SET full_name=?, phone=? WHERE id=?",
        [full_name, phone, req.session.uid]
    );

    const user = (await db.query(
        "SELECT full_name, email, phone, role FROM users WHERE id=?",
        [req.session.uid]
    ))[0];

    res.render("profile", {
        user,
        role: user.role,
        success: "Profile updated successfully",
        error: null
    });
});


app.get("/cars/add", requireAgent, (req, res) => {
    res.render("car-form", {
        title: "Add Car",
        action: "/cars/add",
        car: {}
    });
});


app.post("/cars/add", requireAgent, async (req, res) => {
    try {
        const car = new Car({
            ...req.body,
            created_by: req.session.uid 
        });

        await car.create();
        res.redirect("/dashboard");

    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to add car");
    }
});


app.get("/cars/edit/:id", requireAgent, async (req, res) => {
    const carObj = new Car({ id: req.params.id });
    const car = await carObj.getById();

    if (!car) return res.status(404).send("Car not found");
    if (car.created_by !== req.session.uid) {
        return res.status(403).send("Not allowed");
    }

    res.render("car-form", {
        title: "Edit Car",
        action: `/cars/edit/${car.id}`,
        car
    });
});


app.post("/cars/edit/:id", requireAgent, async (req, res) => {
    try {
        const car = new Car({
            id: req.params.id,
            ...req.body,
            created_by: req.session.uid
        });

        const updated = await car.update();
        if (!updated) {
            return res.status(403).send("Not allowed");
        }

        res.redirect("/dashboard");

    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to update car");
    }
});

app.post("/cars/delete/:id", requireAgent, async (req, res) => {
    try {
        const car = new Car({
            id: req.params.id,
            created_by: req.session.uid
        });

        const deleted = await car.delete();
        if (!deleted) {
            return res.status(403).send("Not allowed");
        }

        res.redirect("/dashboard");

    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to delete car");
    }
});

/* ---------- BOOK CAR (FORM) ---------- */

app.get("/book/:carId", async (req, res) => {
    if (!req.session.uid) return res.redirect("/login");
    if (req.session.role !== "customer") return res.redirect("/dashboard");

    const carId = Number(req.params.carId);

    const car = (await db.query(
        "SELECT * FROM cars WHERE id = ? AND status = 'available'",
        [carId]
    ))[0];

    if (!car) return res.status(404).send("Car not available");

    res.render("book-car", { car });
});

/* ---------- BOOK CAR (SUBMIT) ---------- */

app.post("/book/:carId", async (req, res) => {
    if (!req.session.uid) return res.redirect("/login");

    const carId = Number(req.params.carId);
    const { start_date, end_date } = req.body;

    if (!start_date || !end_date)
        return res.status(400).send("Dates required");

    const car = (await db.query(
        "SELECT daily_rate FROM cars WHERE id = ? AND status = 'available'",
        [carId]
    ))[0];

    if (!car) return res.status(400).send("Car not available");

    const start = new Date(start_date);
    const end = new Date(end_date);

    if (end <= start)
        return res.status(400).send("Invalid date range");

    const days =
        Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    const totalPrice = days * car.daily_rate;

    await db.query(
        `
        INSERT INTO bookings
        (car_id, user_id, start_date, end_date, total_price, status)
        VALUES (?, ?, ?, ?, ?, 'booked')
        `,
        [carId, req.session.uid, start_date, end_date, totalPrice]
    );

    await db.query(
        "UPDATE cars SET status='booked' WHERE id=?",
        [carId]
    );

    res.redirect("/customer-dashboard");
});

/* ---------- AGENT MANAGE BOOKING ---------- */

app.get("/agent/bookings/:id", requireAgent, async (req, res) => {
    const bookingId = Number(req.params.id);

    const booking = (await db.query(
        `
        SELECT
          b.id,
          b.status,
          c.make,
          c.model,
          u.full_name AS customer
        FROM bookings b
        JOIN cars c ON b.car_id = c.id
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ? AND c.created_by = ?
        `,
        [bookingId, req.session.uid]
    ))[0];

    if (!booking) return res.status(404).send("Booking not found");

    res.render("manage-booking", { booking });
});

app.post("/agent/bookings/:id", requireAgent, async (req, res) => {
    const bookingId = Number(req.params.id);
    const { status } = req.body;

    const booking = (await db.query(
        `
        SELECT b.car_id
        FROM bookings b
        JOIN cars c ON b.car_id = c.id
        WHERE b.id = ? AND c.created_by = ?
        `,
        [bookingId, req.session.uid]
    ))[0];

    if (!booking) return res.status(403).send("Not allowed");

    await db.query(
        "UPDATE bookings SET status=? WHERE id=?",
        [status, bookingId]
    );

    // 🔥 AUTO CAR STATUS UPDATE
    if (status === "completed" || status === "cancelled") {
        await db.query(
            "UPDATE cars SET status='available' WHERE id=?",
            [booking.car_id]
        );
    }

    if (status === "ongoing") {
        await db.query(
            "UPDATE cars SET status='booked' WHERE id=?",
            [booking.car_id]
        );
    }

    res.redirect("/dashboard");
});



// Start server
app.listen(3000, () => {
    console.log("Server running at http://127.0.0.1:3000");
});
