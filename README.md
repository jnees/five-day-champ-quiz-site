# Five Day Champ [Try Me](http://quiz-prep-site.herokuapp.com/login)

## Motivation
FiveDayChamp is a webapp/trivia training game that was born out of my family's love of trivia and the show Jeopardy! It is designed to help you practice for the Jeopardy online test by answering real questions that the show has asked over the years. I've always been disappointed by the quality of Jeopardy videogames. They make you type in the answer quickly on an awkward videogame keypad or select from multiple choice. Neither of these feels much like the true Jeopardy experience to me.

Since FiveDayChamp is a trainer and not a competitive game, there is no need to keep score and no need for clunky answer checking. It works more like flashcards. If you got the answer to the question right, you click the correct button. That's it!

You can select a difficulty level, ranging from Wolf Blitzer (Very Easy) to Ken Jennings (Very Hard). You can also narrow the questions down with certain keywords that you want to focus on. "I'll take 'Foods that start with the letter Q for $1000". The game keeps track of your accuracy, which you can see in your reports.

## Components

This application consists of:

 - Node/Express back end server
 - MongoDB for housing questions, user info, and attempt records.
 - HTML/CSS/Bootstrap web interface
 - OAuth 2.0 User Authentication (Local and Google strategies)

There is an opportunity to port this to React for a smoother user experience, particularly when loading new questions.

**Note on sourcing questions:** A number of fan generated databases exist which track all of the questions asked on Jeopardy! over the years, such as [this one](https://www.kaggle.com/datasets/tunguz/200000-jeopardy-questions). I'm not a lawyer, but I would expect that Jeopardy still owns the rights to these questions after they air, so I highly recommend not trying to commercialize their work. This project exists for educational purposes only.

## Screenshots

### User Log-in
**

![](https://lh3.googleusercontent.com/GRSMIlj28NV6fKz0P0JUYYWahh2fL8Ixmdmp_OXskZv7QPblakyboLupcLApHRIrLX0RyCm_-FpViF1pgSkW9Ls6_sp36tQm2C0Qcbwlpg5QmClrIxMR_aQWYaUqEQ67fbvw0qC0aiHarHDELA)**

### Question Screen

**![](https://lh5.googleusercontent.com/Gb6N6JtS-xaudgUbvaTvx08T0nygNjJUZtO0fjZQ_NJr7VKsz9dl8yUd8Vxi_4r4XehCrDkDPyz6UCzJVW6yh2IGfL40rdA9YE-TU-h252yG3mDtmLTRv5nYVJZtV7wsuUFLYPAYcJ8xl5SX8Q)**

### Player Stats Screen

**![](https://lh3.googleusercontent.com/4QISPq142Gmz3QcgGgOP7P2CQiS0C6mcSjUK_EWUht8TNyKmcQRYYpmgaaaAMyFzT51TUHQp0FJvdrgtTh2641MXLDuomx_2hSAsg_OSNgbgGiibOXVCL-sOcmeL9m4plCLHGPiHRxHAqjctMw)**

### Player Preferences Screen
**![](https://lh6.googleusercontent.com/TNjnioEPuR0Wz7pKb6j7LHh-RELO5SmPYZMfEpfavvthDgovVswdfMBfvwZfLJKjBI1-PQAsEx4dkDeMgom-XIYrT8gKz8BXRhd8wwIHBfSspCnxWYuU4_u3F27fOqefFWSSeKb0g1PMisK8Qw)**

**![](https://lh5.googleusercontent.com/Gb6N6JtS-xaudgUbvaTvx08T0nygNjJUZtO0fjZQ_NJr7VKsz9dl8yUd8Vxi_4r4XehCrDkDPyz6UCzJVW6yh2IGfL40rdA9YE-TU-h252yG3mDtmLTRv5nYVJZtV7wsuUFLYPAYcJ8xl5SX8Q)**
