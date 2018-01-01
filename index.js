'use strict';

const Alexa = require('alexa-sdk');
const personaldates = require('./personaldates');
var request = require('./node_modules/request');
var moment = require('./node_modules/moment');
var shuffle = require('./node_modules/shuffle-array');
var sprintf = require('./node_modules/sprintf-js').sprintf;
var htmlToText = require('./node_modules/html-to-text');
var GoogleCSEClass = require('./node_modules/google-search');
var googlecse = new GoogleCSEClass ({
        key: process.env.GOOGLE_API_KEY,
        cx: process.env.GOOGLE_CSE_ID
    });


const APP_ID = process.env.ALEXA_APP_ID; // TODO replace with your app ID (OPTIONAL).

const languageStrings = {
    'en': {
        translation: {
            PERSONALDATES: personaldates.PERSONALDATES_EN_US,
            // TODO: Update these messages to customize.
            SKILL_NAME: 'my valet',
            WELCOME_MESSAGE: "Welcome to %s. You can ask any google type search or a question like, what happened on a date? ... Now, what can I help you with?",
            WELCOME_REPROMPT: 'For instructions on what you can say, please say help me.',
            DISPLAY_CARD_TITLE: '%s - Answer for %s.',
            HELP_MESSAGE: "You can ask google type search or questions such as, what happened on a date, or, you can say exit...Now, what can I help you with?",
            HELP_REPROMPT: "You can ask google type search or say things like, what happened on a date, or you can say exit...Now, what can I help you with?",
            STOP_MESSAGE: 'Goodbye!',
            REPEAT_MESSAGE: 'Try saying repeat.',
            NOT_FOUND_MESSAGE: "I\'m sorry, I do not understand that questions ",
            NOT_FOUND_REPROMPT: 'What else can I help with?',
        },
    },
    'en-US': {
        translation: {
            PERSONALDATES: personaldates.PERSONALDATES_EN_US,
            SKILL_NAME: 'my valet',
        },
    },
    'en-GB': {
        translation: {
            PERSONALDATES: personaldates.PERSONALDATES_EN_US,
            SKILL_NAME: 'my valet',
        },
    },
    'de': {
        translation: {
            PERSONALDATES: personaldates.PERSONALDATES_EN_US,
            SKILL_NAME: 'my valet',
            WELCOME_MESSAGE: 'Willkommen bei %s. Sie können google type search oder Fragen wie, was an einem Datum passiert ist, oder Sie können sagen, verlassen ... Nun, was kann ich Ihnen helfen?',
            WELCOME_REPROMPT: 'Sie können google type search oder Fragen wie, was an einem Datum passiert ist, oder Sie können sagen, verlassen ... Nun, was kann ich Ihnen helfen?',
            DISPLAY_CARD_TITLE: '%s - Rezept für %s.',
            HELP_MESSAGE: 'Sie können google type search oder Fragen wie, was an einem Datum passiert ist, oder Sie können sagen, verlassen ... Nun, was kann ich Ihnen helfen?',
            HELP_REPROMPT: 'Sie können google type search oder Fragen wie, was an einem Datum passiert ist, oder Sie können sagen, verlassen ... Nun, was kann ich Ihnen helfen?',
            STOP_MESSAGE: 'Auf Wiedersehen!',
            REPEAT_MESSAGE: 'Sage einfach „Wiederholen“.',
            NOT_FOUND_MESSAGE: 'Tut mir leid, ich kenne derzeit ',
            NOT_FOUND_REPROMPT: 'Womit kann ich dir sonst helfen?',
        },
    },
};

const handlers = {
    //Use LaunchRequest, instead of NewSession if you want to use the one-shot model
    // Alexa, ask [my-skill-invocation-name] to (do something)...
    'LaunchRequest': function () {
        this.attributes.speechOutput = this.t('WELCOME_MESSAGE', this.t('SKILL_NAME'));
        // If the user either does not reply to the welcome message or says something that is not
        // understood, they will be prompted again with this text.
        this.attributes.repromptSpeech = this.t('WELCOME_REPROMPT');

        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'WhatHappenedOnIntent': function () {
        var reference = this;
        const slotValue = this.event.request.intent.slots.date.value;
        if (slotValue != undefined) {
            var inpdate = moment();
            if (moment(slotValue).isValid()) {
                inpdate = moment(slotValue);
            }
            var inpmonth = inpdate.month() + 1;
            var inpday = inpdate.date();
            var inpmonthday = sprintf("%02d", inpmonth) + "-" + sprintf("%02d", inpday);
            var url = 'http://history.muffinlabs.com/date/' + inpmonth.toString() + '/' + inpday.toString();
            console.log(url);
            request(url, function (error, response, body) {
                console.log("Querying muffinlabs ...");
                if (!error && response.statusCode == 200) {
                    var json = JSON.parse(body);
                    var eventArray = json["data"]["Events"];
                    if (eventArray.length > 3) {
                        var eventarr = shuffle.pick(eventArray, { 'picks': 3 });
                    } else {
                        eventarr = eventArray;
                    }
                    var speechOutput = "";
                    const mypersdates = reference.t('PERSONALDATES');
                    var mypersdate = mypersdates[inpmonthday];
                    if (mypersdate) {
                        speechOutput += "On this day " + mypersdate + ". ";
                    }
                    for (var i = 0, len = eventarr.length; i < len; i++) {
                        speechOutput += "On this day in " + eventarr[i]["year"] + ", " + eventarr[i]["text"]; 
                    }
                    const cardTitle = "News on " + slotValue;
                    reference.attributes.speechOutput = speechOutput;
                    reference.attributes.repromptSpeech = reference.t('RECIPE_REPEAT_MESSAGE');
                    reference.response.speak(speechOutput).listen(reference.attributes.repromptSpeech);
                    reference.response.cardRenderer(cardTitle, speechOutput);
                    reference.emit(':responseReady');
                }
                else{
                    speechOutput = "Sorry error in muffinlabs with status of " + response.statusText;
                    const cardTitle = "Error for News on " + slotValue;
                    reference.attributes.speechOutput = speechOutput;
                    reference.attributes.repromptSpeech = reference.t('RECIPE_REPEAT_MESSAGE');
                    reference.response.speak(speechOutput).listen(reference.attributes.repromptSpeech);
                    reference.response.cardRenderer(cardTitle, speechOutput);
                    reference.emit(':responseReady');
                }
            });
        }
        else{
            this.response.speak("I'm sorry.  What day did you want me to look for events?").listen("I'm sorry.  What day did you want me to look for events?");
            this.emit(':responseReady');
        }
    },
    'SearchIntent': function () {
        var reference = this;
        const slotValue = this.event.request.intent.slots.search.value;
        const inpquery = slotValue.toLowerCase();
        if (slotValue != undefined) {
            googlecse.build({
                q: inpquery,
                cr: "countryUS",  // search country
                gl: "us", //user country
                num: 3, // number of search results to return from 1 to 10
                safe: "high", // safesearch high, medium or off
                start: 1 // start index zero-based
            }, function(error, response) {
                var speechOutput = "";
                if (!response.error && response.searchInformation.totalResults > 0) {
                    var srchitems = response.items;
                    speechOutput = "Top search results include. ";
                    for (var i = 0, len = srchitems.length; i < len; i++) {
                        speechOutput += (i + 1).toString() + ". " + srchitems[i]["title"] +
                            " at website " + srchitems[i]["displayLink"] +
                            " snippet of " + srchitems[i]["snippet"] + " . ";
                    }
                    speechOutput = htmlToText.fromString(speechOutput, {
                        wordwrap: false
                    });
                    const cardTitle = "Google Search for " + slotValue;
                    reference.attributes.speechOutput = speechOutput;
                    reference.attributes.repromptSpeech = reference.t('REPEAT_MESSAGE');
                    reference.response.speak(speechOutput).listen(reference.attributes.repromptSpeech);
                    reference.response.cardRenderer(cardTitle, speechOutput);
                    reference.emit(':responseReady');
                }
                else{
                    speechOutput = "Sorry no items or error in google search with status of " + response.error.code + " - " + response.error.message;
                    const cardTitle = "Error for google search on " + slotValue;
                    reference.attributes.speechOutput = speechOutput;
                    reference.attributes.repromptSpeech = reference.t('REPEAT_MESSAGE');
                    reference.response.speak(speechOutput).listen(reference.attributes.repromptSpeech);
                    reference.response.cardRenderer(cardTitle, speechOutput);
                    reference.emit(':responseReady');
                }
            });
        }
        else{
            this.response.speak("I'm sorry.  What day did you want me to look for events?").listen("I'm sorry.  What day did you want me to look for events?");
            this.emit(':responseReady');
        }
    },
    'AMAZON.HelpIntent': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');

        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'AMAZON.RepeatIntent': function () {
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    },
    'SessionEndedRequest': function () {
        console.log(`Session ended: ${this.event.request.reason}`);
    },
    'Unhandled': function () {
        this.attributes.speechOutput = this.t('HELP_MESSAGE');
        this.attributes.repromptSpeech = this.t('HELP_REPROMPT');
        this.response.speak(this.attributes.speechOutput).listen(this.attributes.repromptSpeech);
        this.emit(':responseReady');
    },
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.APP_ID = APP_ID;
    // To enable string internationalization (i18n) features, set a resources object.
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();
};
