// Import express.js
const express = require("express");

// Create express app
var app = express();

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


// Start server on port 3000
app.listen(3000,function(){
    console.log(`Server running at http://127.0.0.1:3000/`);
});
