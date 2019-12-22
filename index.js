const SPREADSHEET_KEY = 'FILL_ME_PLEASE!';
const CLIENT_EMAIL = 'FILL_ME_PLEASE!';
const PRIVATE_KEY = 'FILL_ME_PLEASE!';

var GoogleSpreadsheet = require("google-spreadsheet");
var async = require('async');
const {
  dialogflow,
} = require('actions-on-google');

const functions = require('firebase-functions');

// Create an app instance
const app = dialogflow();

// Register handlers for Dialogflow intents
var doc = new GoogleSpreadsheet(SPREADSHEET_KEY);
var creds_json = {
      client_email: CLIENT_EMAIL,
      private_key: PRIVATE_KEY
    };
var sheet;
var questions = [];
var question_texts = {};

function get_questions(step){
  sheet.getRows({
    offset: 1,
    limit: 1,
  }, function( err, rows ){
    console.log('Error' + err);
    console.log('Read '+rows.length+' rows');
    qrow = rows[0];
    idx = 1;
    questions = [];
    question_texts = {};
    while(true){
      var k = 'q'+idx;
      if(k in qrow){
        questions.push(k);
        question_texts[k] = qrow[k];
      }
      else
        break;
      idx++;
    }
    console.log(question_texts);
    step();
  });
}

async.series([
  function auth(step){
    doc.useServiceAccountAuth(creds_json,step);
  },
  function get_sheet(step){
    doc.getInfo(function(err, info) {
      console.log("Error is ");
      console.log(err);
      console.log('Loaded doc: '+info.title+' by '+info.author.email);
      sheet = info.worksheets[0];
      console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
      step();
    });  
  },
  get_questions
]);

app.intent('dynamic', conv => {
	if(!('resps' in conv.data)){
        conv.data.resps={};
    }
    console.log(JSON.stringify(conv.data));
  	if ('lastQ' in conv.data){
      conv.data.resps[conv.data.lastQ]=conv.parameters.answer;
    }
  	for(var q in questions){
      k = questions[q];
      if(!(k in conv.data.resps))
      {
        conv.data.resps[k]="?";
        conv.data.lastQ = k;
        conv.ask(question_texts[k]);
        return;
      }
    }
	var t =(new Date()).getTime();
    t-= 6*60*60*1000; // Sometimes I sleep after midnight, so I subtract 6 hours from current time in order to record the habits in the correct date
    conv.data.resps.date=(new Date(t)).toDateString();
    doc.addRow(1,conv.data.resps,function(){});
  	console.log("Refreshing questions");
  	get_questions(function(){});
    conv.close("I asked all my questions");
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);