//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
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
  { extended: true }
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

// DB Schema - Responses (to be embedded in UserSchema)
const Response = new mongoose.Schema({
  round: Number,
  value: Number,
  daily_double: String,
  category: String,
  comments: String,
  answer: String,
  question: String,
  air_date: String,
  notes: String,
  timestamp: Date,
  correct: Boolean
});

// DB Schema - User
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  alias: String,
  categories: Array,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  responses: [Response],
  difficulty: Number
});

// Passport Authentication Local Strategy
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

// Passport local user strategy, serialize/deserialize user.
passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

// Passport Google OAuth20 strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/home"
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//  Helper Functions

function getUserId(request) {
  // Returns logged in userId
  let userId = "";
  if (request.isAuthenticated() === true) {
    userId = request.user.id;
  }
  return userId;
}

function getUserAlias(request) {
  // Returns logged in userAlias
  let userAlias = "";
  if (request.isAuthenticated() === true) {
    userAlias = request.user.alias;
  }
  return userAlias;
}

function validAlias(alias) {
  // Checks to see if requested Alias is a valid format. Alias does not need to be unique.

  // Check length (2-16) and special chars (only alphanumeric and underscore allowed);
  const format = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{2,16}$/;
  const passed = (format.test(alias));

  return passed;
}

function buildMatchQuery(wordArray, difficulty) {
  // Builds and returns a mongodb query string for clues based on user preferences.

  // Clue Value Filter
  let valueFrag =
  {
    $or:
      [
        { $and: [{ round: 1 }, { value: { $lte: 200 * difficulty } }] },
        { $and: [{ round: 2 }, { value: { $lte: 400 * difficulty } }] },
        { round: 3 }
      ]
  };

  // Add Category Filter if needed and return, else return value filter only.
  if (wordArray.length > 0) {
    let q = { $and: [{ $or: [] }] };

    wordArray.forEach(val => {
      var term = val.toUpperCase(val);
      var termFrag = { category: RegExp(term) };
      q.$and[0].$or.push(termFrag);
    });

    q.$and.push(valueFrag);

    return q;
  } else {
    return valueFrag;
  }
}

// User Records - Last n questions % correct
function correctRate(user, n) {
  let lastN = user.responses.slice(-n);
  let correctCount = lastN.filter(response => response.correct == true).length;
  let correctRate = correctCount / n;
  return correctRate;
}

// ROUTE -- root
app.get("/", function (req, res) {

  if (req.isAuthenticated() === false) {
    res.redirect("/login");
    return;
  }

  const username = getUserId(req);
  const alias = getUserAlias(req);
  const userCategories = req.user.categories;

  let difficulty = req.user.difficulty;
  if (difficulty == undefined) {
    difficulty = 5;
  }

  var matchQuery = {};

  matchQuery = buildMatchQuery(req.user.categories, difficulty);

  Clue.aggregate()

    .match(matchQuery)
    .sample(1)
    .exec(function (err, foundClues) {
      if (err) {
        console.log(err);
        res.send("Error retreiving clue.");
      } else {

        const rate_50 = correctRate(req.user, 50);

        // Cleanup Text in found reponse.
        foundClues[0].category = foundClues[0].category.toString().replace(/\\/g, "");
        foundClues[0].answer = foundClues[0].answer.toString().replace(/\\/g, "");
        foundClues[0].question = foundClues[0].question.toString().replace(/\\/g, "");

        let options = {
          foundClues: foundClues[0],
          username: username,
          alias: alias
        };

        res.render("home", options);
      }
    }
    );
});

// Route - stats
app.route("/stats")
  .get((req, res) => {
    const username = getUserId(req);
    const alias = getUserAlias(req);
    const rate_50 = correctRate(req.user, 50);
    const rate_120 = correctRate(req.user, 120);
    const rate_360 = correctRate(req.user, 360);
    const ttlAnswered = req.user.responses.length;

    const options = {
      username: username,
      alias: alias,
      rate_50: rate_50,
      rate_120: rate_120,
      rate_360: rate_360,
      ttlAnswered: ttlAnswered
    };

    res.render("stats", options);

  });

// Route - Reset stats
app.route("/stats/reset")
  .post((req, res) => {
    const user = req.user;
    const resetInput = req.body.resetInput;
    if (resetInput !== "RESET") {
      req.flash("resetErr", "Must type 'RESET' to clear records");
      res.redirect("/stats");
      return;
    } else {
      user.responses = [];
      user.save();
      res.redirect("/stats");
    }
  });

// Route - Preferences
app.route("/preferences")

  .get((req, res) => {

    const username = getUserId(req);
    const alias = getUserAlias(req);
    const categories = req.user.categories;

    let prevDiff = req.user.difficulty;
    if (prevDiff == undefined) {
      prevDiff = 5;
    }

    console.log(prevDiff);

    options = {
      username: username,
      alias: alias,
      categories: categories,
      updateHandler: 'updateHandler();',
      prevDiff: prevDiff
    };
    res.render("preferences", options);
  });

// Route - user add category to preferences
//:cat([A-Za-z0-9\s%20-]+)
app.route("/preferences/categories/add")

  .post((req, res) => {
    let term = req.body.newTerm;
    let user = req.user;
    console.log(user);
    user.categories.push(term);
    user.save(() => {
      res.redirect('/preferences');
    });

  });

// Route - user delete category from preferences
//:cat([A-Za-z0-9\s%20-]+)
app.route("/preferences/categories/remove")

  .post((req, res) => {
    let term = req.body.term;
    let user = req.user;
    const index = user.categories.indexOf(term);
    if (index > -1) {
      user.categories.splice(index, 1);
    }
    user.save(() => {
      res.redirect('/preferences');
    });

  });

// Route - update user difficulty preference
app.route("/preferences/difficulty")
  .post((req, res) => {
    let user = req.user;
    let body = req.body;

    let prevDiff = req.user.difficulty;
    if (prevDiff == undefined) {
      prevDiff = 5;
    }

    let newDiff = body.newDifficulty;
    if (prevDiff != newDiff) {
      user.difficulty = newDiff;
      user.save();
    }
    res.redirect('/preferences');

  });

// Route - responses
app.route("/response")
  .post((req, res) => {
    let user = req.user;
    let body = req.body;
    let timestamp = new Date();
    timestamp = timestamp.toLocaleString('en-US');

    let response = {
      round: body.round,
      value: body.value,
      daily_double: body.daily_double,
      category: body.category,
      comments: body.comments,
      answer: body.answer,
      question: body.question,
      air_date: body.air_date,
      notes: body.notes,
      timestamp: timestamp,
      correct: body.correct
    };

    user.responses.push(response);
    user.save();

    res.redirect("/");
  });

// Route -- login
app.route("/login")

  .get((req, res) => {
    const username = getUserId(req);
    const alias = getUserAlias(req);

    let options = { username: username, alias: alias };
    res.render("login", options);
  })

  .post(passport.authenticate("local", { failureRedirect: "/login" }), function (req, res) {
    res.redirect("/");
  });

//Route -- register
app.route("/register")

  .get((req, res) => {
    const username = getUserId(req);
    const alias = getUserAlias(req);

    let options = { username: username, alias: alias };

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
    User.register({ username: req.body.username, alias: req.body.alias }, req.body.password, (err, user) => {
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

  .get(passport.authenticate('google', { failureRedirect: "/login" }), function (req, res) {
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
app.listen(port, function () {
  console.log("Quiz-site server has started.");
});
