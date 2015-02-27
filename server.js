var express = require('express');
var _ = require('underscore');
var app = express();
var server = require('http').createServer(app);
var bodyParser = require('body-parser');
var loki = require('lokijs');
//var gracefullyShutdown = require('graceful-shutdown');

var Trello = require("node-trello");
var t = new Trello("4b2c1c5260bf14784b6b50639cc5a698", "b4f8a52fefd56567f03f2ca890a8f0a3e6fa7fb23cfc8613b3398669e26d7e1d");

// create application/json parser
var jsonParser = bodyParser.json();

// create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false });

var db = new loki("Mock DB");

var users = db.addCollection('users');
var history = db.addCollection('history');

// Users
var alex = users.insert( { userid: '1', name : 'Alex B.', balance: 0, threshold: false, card: "" } );
var brandon = users.insert( { userid : '2', name : 'Brandon Z.', balance: 0, threshold: false, card: "" } );
var charlie = users.insert( { userid : '3', name : 'Charlie K.', balance: 0, threshold: false, card: "" } );
var david = users.insert( { userid : '4', name : 'David Q.', balance: 0, threshold: false, card: "" } );
var edward = users.insert( { userid : '5', name : 'Edward L.', balance: 0, threshold: false, card: "" } );
var felix = users.insert( { userid : '6', name : 'Felix H.', balance: 0, threshold: false, card: "" } );

// Historical Data (per UserID)
var h1 = history.insert( { userid : "1", transactions : [], total: 0 } );
var h2 = history.insert( { userid : "2", transactions : [], total: 0 } );
var h3 = history.insert( { userid : "3", transactions : [], total: 0 } );
var h4 = history.insert( { userid : "4", transactions : [], total: 0 } );
var h5 = history.insert( { userid : "5", transactions : [], total: 0 } );
var h6 = history.insert( { userid : "6", transactions : [], total: 0 } );

// accept GET request
app.get('/', function (req, res) {
  res.send('Users 1-6 are already created. Use (stuff=)/users/:userid/ to access, or post to (stuff)/items with transaction type \n');
});

// get data on a user
app.get('/users/:userid', function (req, res) {
  console.log("Here is some user data");
  var down = users.get(req.params.userid);
  console.log(down);
  res.send(down);
});

// get history for a user
app.get('/users/:userid/history', function (req, res) {
  console.log("Here is some historical user data");
  var down = history.get(req.params.userid);
  console.log(down);
  res.send(down);
});

// accept POST request on the /users/user_id/items
app.post('/users/:userid/items', urlencodedParser, function (req, res) {
  //console.log(req.params); // all params
  //console.log(req.body); // x-www-form-urlencoded
  //console.log(req.body.item_type); // item type
  var trans = req.body.item_type;
  console.log(trans);
  var amt = parseInt(req.body.amount);
  var id = req.params.userid;
  var user = users.get(req.params.userid); // grabs the user based on the param set
  console.log(user);
  var hist = history.get(req.params.userid);
  //console.log(hist.transactions);
  var name;
  if (trans == "earning") {
    user.balance = user.balance + amt;
    //hist.transactions.push
  } else if (trans == "fee") {
    user.balance = user.balance - amt;
  }
  users.update(user);
  if (user.threshold == false && user.balance <= -200) {
    user.threshold = true; // set threshold to true, since they broke it, but weren't in that state prior
    name = user.name + " " + user.balance; // creates name w/ balance to create card with
    console.log(user.card);
    console.log(user.card == "");
    if (user.card == "") { // create a new card!
      // create a trello card, associate with account. (if it doesn't already exist)
      t.post("/1/cards", { name: name, due: "null", idList: "54ee82fe28c214334d9e10ec" }, function(err, data) {
        if (err) throw err;
        console.log("Card created for user/balance: " + name);
        user.card = data.id; // assigns user a card ID for updating later
      });
    } else { // user already has a card assigned to them
      // move card BACK to Open
      t.put("/1/cards/" + user.card + "/idList", { value: "54ee82fe28c214334d9e10ec" }, function (err,data) {
        if (err) throw err;
        console.log("Response from moving card ID: " + user.card + "to Board 'Resolved'");
      });
      // rename card
      t.put("/1/cards/" + user.card, { name: name }, function (err,data) {
        if (err) throw err;
        console.log("Changed card name to person's name");
      });
    }
    users.update(user); // move down after we create card & find id for it
  } else if (user.threshold == true && user.balance > -200) {
    user.threshold = false; // set threshold to false, since they broke it, but got better
    name = user.name;
    // move card to Resolved
    t.put("/1/cards/" + user.card + "/idList", { value: "54ee82ff6d371d305a8f7ee7" }, function (err,data) {
      if (err) throw err;
      console.log("Response from moving card ID: " + user.card + "to Board 'Resolved'");
    });
    
    // rename card
    t.put("/1/cards/" + user.card, { name: name }, function (err,data) {
      if (err) throw err;
      console.log("Changed card name to person's name");
    });
    
    users.update(user); // move down after we create card & find id for it
  } else if (user.threshold == true && user.balance <= -200) {
    var name = user.name + " " + user.balance; // update name with new balance
    // rename card with new balance
    t.put("/1/cards/" + user.card, { name: name }, function (err,data) {
      if (err) throw err;
      console.log("updated card name with new balance");
    });
  }
  
  console.log(user.balance); // amount
  //console.log(user);

  res.send('POST request received!');
});

/*gracefullyShutdown(server).upon('SIGINT SIGTERM').on('shutting-down', function() {
  console.log('server#close() has been called');
});
//*/

//app.set('port', (process.env.PORT || 9000));
/*app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
//*/
server.listen(9010, '127.0.0.1');
console.log('Server running at http://127.0.0.1:9010/');

// Hacky way of starting a simple webserver (don't use)
/*
server.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(9001, '127.0.0.1');
//*/

// Test to ensure we logged in correctly
//t.get("/1/members/me", function(err, data) {
  //if (err) throw err;
  //console.log(data);
//});

// Grab all board lists (tests also if we logged in properly).
/*
t.get("/1/boards/54ee82fae62c0eb8da6d3115/lists", function(err, data) {
  if (err) throw err;
  console.log("========== All Boards ===========");
  console.log(data);
});
//*/

// Grabs the "Open" List.
/*
t.get("/1/lists/54ee82fe28c214334d9e10ec", function(err, data) {
  if (err) throw err;
  console.log("========== Open List Data ===========");
  console.log(data);
});
//*/

// Grabs the "Resolved" List.
/*t.get("/1/lists/54ee82ff6d371d305a8f7ee7", function(err, data) {
  if (err) throw err;
  console.log("========== Resolved List Data ===========");
  console.log(data);
});
//*/

// Test writing a card to the "Open" List (works) -- used once to test
/*
t.post("/1/cards", { name: "Trello Test from Node", desc: "wat", due: "null", idList: "54ee82fe28c214334d9e10ec" }, function(err, data) {
  if (err) throw err;
  console.log("Response from sending card");
  console.log(data);
  console.log(data.id); // gives back the ID of the card created.
});
//*/

// Test moving a card from Open to Resolved. (works) -- used once to test
/*
t.put("/1/cards/54ef9a6ae1e8b5be1c122de2/idList", { value: "54ee82ff6d371d305a8f7ee7" }, function (err,data) {
  if (err) throw err;
  console.log("Response from moving card to Board 'Resolved'");
  console.log(data);
});
//*/

// Test renaming a card. 
/*
t.put("/1/cards/54ef9a6ae1e8b5be1c122de2", { name: "I like trains" }, function (err,data) {
  if (err) throw err;
  console.log("Changed card name to something different");
  console.log(data);
});
//*/

