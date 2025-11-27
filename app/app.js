// Import express.js
const express = require("express");

// Create express app
var app = express();

// Enable JSON parsing for APIs
app.use(express.json());

// Configure Pug  views in app/views
app.set("view engine", "pug");
app.set("views", "app/views");

// Add static files location
app.use(express.static("static"));

// Get the functions in the db.js file to use
const db = require('./services/db');



// Render a simple Pug view to verify templating works
app.get("/", function(req, res) {
    res.render("homepage", { title: "Car Rental", message: "Car Rental" });
});

app.get("/login", function(req, res) {
    res.render("login", { title: "Login | Velocity Rentals" });
});

app.get("/registration", function(req, res) {
    res.render("registration", { title: "Create Account | Velocity Rentals" });
});

app.get("/dashboard", async function(req, res) {
    try {
        const search = (req.query.search || "").trim();
        const likeSearch = `%${search}%`;

        const metricsRows = await db.query("SELECT * FROM dashboard_metrics LIMIT 1");
        const metrics = metricsRows[0] || {};

        let bookingsWhere = "b.status IN ('booked','ongoing')";
        const bookingParams = [];
        if (search) {
            bookingsWhere += " AND (c.make LIKE ? OR c.model LIKE ? OR CONCAT(cu.first_name, ' ', cu.last_name) LIKE ?)";
            bookingParams.push(likeSearch, likeSearch, likeSearch);
        }

        const bookings = await db.query(
            `SELECT 
                b.id,
                c.make,
                c.model,
                c.year,
                CONCAT(cu.first_name, ' ', cu.last_name) AS customer,
                b.status,
                b.start_date,
                b.end_date,
                b.total_price
             FROM bookings b
             JOIN cars c ON b.car_id = c.id
             JOIN customers cu ON b.customer_id = cu.id
             WHERE ${bookingsWhere}
             ORDER BY b.start_date ASC
             LIMIT 25`,
            bookingParams
        );

        let fleetWhere = "1=1";
        const fleetParams = [];
        if (search) {
            fleetWhere = "(make LIKE ? OR model LIKE ? OR location LIKE ?)";
            fleetParams.push(likeSearch, likeSearch, likeSearch);
        }

        const fleet = await db.query(
            `SELECT id, make, model, year, status, daily_rate, location
             FROM cars
             WHERE ${fleetWhere}
             ORDER BY status, make, model`,
            fleetParams
        );

        res.render("dashboard", {
            metrics,
            bookings,
            fleet,
            search,
            title: "Fleet Dashboard | Velocity Rentals",
            error: null,
        });
    } catch (err) {
        console.error("Failed to load dashboard data:", err);
        res.render("dashboard", {
            metrics: {},
            bookings: [],
            fleet: [],
            search: "",
            title: "Fleet Dashboard | Velocity Rentals",
            error: "Unable to load dashboard data",
        });
    }
});


// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});
