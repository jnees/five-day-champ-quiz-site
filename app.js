//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require("passport");
const Strategy = require('passport-local').Strategy;
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const flash = require("express-flash");
const nodemailer = require("nodemailer");
const async = require("async");

const app = express();

// App config
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded(
  {extended: true}
));

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// LOCAL DB Connect for development
mongoose.connect("mongodb://localhost:27017/quizDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: false
  });
mongoose.set('useCreateIndex', true);

// ROUTE -- root
app.get("/", function(req, res){
  res.send("Hello World");
});

// Listener - Heroku env port or localhost default if running locally.
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Quiz-site server has started.");
});
