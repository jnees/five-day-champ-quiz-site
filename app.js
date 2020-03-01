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


// DB Schema - Clue
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

const Clue = mongoose.model("Clue", clueSchema);

// DB Schema - User
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  alias: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// Passport Authentication Local Strategy
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// Passport local user strategy, serialize/deserialize user.
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Passport Google OAuth20 strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//  Helper Functions

function getUserId(request){
  let userId = "";
  if(request.isAuthenticated() === true){
     userId = request.user.id;
   }
   return userId;
}

function getUserAlias(request){
  let userAlias = "";
  if(request.isAuthenticated() === true){
     userAlias = request.user.alias;
   }
   return userAlias;
}

function validAlias(alias){
  // Check length (2-16) and special chars (only alphanumeric and underscore allowed);
  const format = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{2,16}$/;
  const passed = (format.test(alias));

  return passed;
}

// ROUTER

// ROUTE -- root
app.get("/", function(req, res){

  if(req.isAuthenticated() === false){
    res.redirect("/login");
    return;
  }

  const username = getUserId(req);
  const alias = getUserAlias(req);



  Clue.aggregate([ { $sample: { size: 1 } } ], (err, foundClues) => {
    console.log(foundClues[0]);
    if(err){
      console.log(err);
      res.send("Error retreiving clue.");
    } else {
      let options = {
        foundClues: foundClues[0],
        username: username,
        alias: alias
      };

      res.render("home", options);
    }
  });
});

// Route -- login
app.route("/login")

  .get((req, res) => {
    const username = getUserId(req);
    const alias = getUserAlias(req);

    let options = {username: username, alias: alias};
    res.render("login", options);
  })

  .post(passport.authenticate("local", {failureRedirect: "/login"}), function(req, res){
      res.redirect("/");
  });

//Route -- register
app.route("/register")

  .get((req, res) => {
    const username = getUserId(req);
    const alias = getUserAlias(req);

    let options = {username: username, alias: alias};

    res.render("register", options);
  })

  .post((req, res) => {
    // Validate username.
    const valid = validAlias(req.body.alias);
    if (!valid) {
      req.flash("usernameInvalid", "Username not valid. Please select another.");
      res.redirect("/register");
    }

    // Check username. If taken, flash err.
    User.register({username: req.body.username, alias: req.body.alias}, req.body.password, (err, user) => {
      if (err) {
        console.log(err);
        req.flash("usernameTaken", "That username is already in use. Please select another");
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, () => {
          res.redirect("/");
        });
      }
    });
  });

// ROUTE - google authenticate
app.route("/auth/google")

  .get(passport.authenticate('google', {
    scope: ['profile']
  }));

app.route("/auth/google/home")

    .get(passport.authenticate('google', {failureRedirect: "/login"}), function(req, res){
      res.redirect("/");
    });

// ROUTE - Logout
app.route("/logout")
  .get((req, res) => {

    req.logout();
    res.redirect("/");
  });

// Listener - Heroku env port or localhost default if running locally.
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Quiz-site server has started.");
});
