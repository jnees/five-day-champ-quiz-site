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

// DB connect to Mongo Atlas
const uri = "mongodb+srv://" + process.env.DB_USER + ":" + process.env.DB_PASS + process.env.DB_CLUSTER;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: false
});

mongoose.set('useCreateIndex', true);

// Persistent Session Storage
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    mongooseConnection: mongoose.connection,
    ttl: 7 * 24 * 60 * 60
  })
}));

// DB Schemas
const clueSchema = new mongoose.Schema({
  round: Number,
  value: Number,
  daily_double: String,
  category: String,
  comments: String,
  answer: String,
  question: String,
  air_date: String,
  notes: String
});

clueSchema.plugin(findOrCreate);
const Clue = mongoose.model("Clue", clueSchema);


// ROUTE -- root
app.get("/", function(req, res){

  Clue.aggregate([ { $sample: { size: 1 } } ], (err, foundClues) => {
    console.log(foundClues[0]);
    if(err){
      console.log(err);
      res.send("Error retreiving clue.");
    } else {
      let options = {foundClues: foundClues[0]};
      res.render("home", options);
    }
  });
});

// Listener - Heroku env port or localhost default if running locally.
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Quiz-site server has started.");
});
