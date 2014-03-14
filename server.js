/**
 * @author eliath <http://eliasmartinezcohen.com/>
 * @package chatroom
 * @version 0.1
 *
 * @description This file serves the chatroom!
 */

/* 
   Server setup
   ========================================================================== */
//set up express
var express = require('express'),
	app = express(),
	colors = require('colors'),
	engines = require('consolidate');

//json, urlencoded, multipart middleware:
app.use(express.bodyParser());

app.use(express.static('pub')); //needed to serve static files.
app.use(express.favicon(__dirname + '/pub/img/favicon.png')); //favicon
app.engine('html', engines.hogan); //run .html files through Hogan
app.set('views', __dirname + "/templates"); //templating


/* 
   Database setup
   ========================================================================== */
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://chatroom.db');



/* 
   Request Handlers
   ========================================================================== */

app.get('/', function(req, resp) {
	console.log('- Request received:', req.method.cyan, req.url.underline);
	
	//TODO: maybe someday we can have users sign in here and give them a cookie

	//create new Table for messages and rooms:
	conn.query('CREATE TABLE IF NOT EXISTS rooms (name TEXT PRIMARY KEY);')
		.on('error', function() {
			console.log("ERROR: rooms table could not be created!!".error);
		});
	conn.query('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, nickname TEXT, body TEXT, time INTEGER);')
		.on('error', function() {
			console.log("ERROR: messages table could not be created!!".error);
		});
	resp.render('welcome.html');
});

app.get('/recentRooms.json', function(req, resp) {
	console.log('- Request received:', req.method.cyan, req.url.underline);

	//get all rooms active within last 5 min:
	var q = conn.query("SELECT DISTINCT room FROM messages WHERE time >= strftime('%s', 'now') - 300;");
	q.on('row', function(row) {
		console.log("The returned row object:", row);
	});
	q.on('end', function() {
		console.log('Finished searching'.cyan);
		//TODO: return list of recent rooms in JSON obj
	});
});



app.post('/:roomName/create', function(req, resp) {
	var data = {roomExists: false};	//response data to send (json) roomExists starts as false
	var q = conn.query('SELECT name FROM rooms WHERE name=$1;', [req.params.roomName]);
	q.on('row', function(row) {
		data.roomExists = true; //if we get here we know that the room is in the database.
	});
	q.on('end', function() {
		if (!data.roomExists) //if room does not exist, put it in database.
			conn.query("INSERT INTO rooms VALUES ($1);", [req.params.roomName]);
		resp.json(data);
	});
});



app.get('/:roomName', function(req, resp) {
	console.log('- Request received:', req.method.cyan, req.url.underline);
	//first we check if room exists:
	var isRoom = false;
	var q = conn.query('SELECT name FROM rooms WHERE name=$1;', [req.params.roomName]);
	q.on('row', function(row) { 
		console.log("yeah this is a room.");
		isRoom = true; 
	}); //if we get here we know that the room is in the database.
	q.on('end', function() {
		if (!isRoom) { //if room does not exist, give an error.
			resp.status(404).end("404: Not found"); //throw 404
			var msg = req.params.roomName + ' does not exist in database!';
			console.log(msg);
		}
		else {
			//render chatroom for name
			console.log('Entered Room:', req.params.roomName.yellow);
			resp.render('room.html', {roomName: req.params.roomName});
		}
	});
});


app.post('/:roomName/messages/prev', function(req, resp) {
	//console.log("Get request received for only recent messages:", req.body);
	var data = {msgArray:[], success:true};//response data

	//get all messages from the room that occur after the ID specified by the client.
	var q = conn.query("SELECT * FROM messages WHERE id > $1 AND room=$2;", [req.body.prevID, req.params.roomName] );
	q.on('row', function(row) {
		console.log("New message in "+ req.params.roomName +":", row.nickname+": " + row.body);
		data.msgArray.push(row);
	});
	q.on('error', function() {
		console.log("There was a problem getting the desired messages from the database");
		data.success = false;
	});
	q.on('end', function() {
		resp.json(data);
	});
});

app.get('/:roomName/messages', function(req, resp) {
	console.log("Get request received for all messages:", req.body);
	var data = {msgArray:[], success:true};//response data

	var q = conn.query("SELECT * FROM messages WHERE room=$1;", [req.params.roomName] ); //get all messages for the room
	q.on('row', function(row) {
		//console.log("Found message:", row);
		data.msgArray.push(row);
	});
	q.on('error', function() {
		console.log("There was a problem getting the desired messages from the database");
		data.success = false;
	});
	q.on('end', function() {
		resp.json(data);
	});
});


app.post('/:roomName/messages', function(req, resp) {
	console.log("Message post received:", req.body);
	var data = {success: true};
	//table schema:
	//id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, nickname TEXT, body TEXT, time INTEGER
	var q = conn.query("INSERT INTO messages(room, nickname, body, time) VALUES($1, $2, $3, $4);", [req.params.roomName, req.body.nickname, req.body.message, Math.round(Date.now()/1000)] );
	q.on('error', function() {
		console.log("Problem inserting message into messages table!");
		data.success = false;
	});
	q.on('end', function() {
		resp.json(data);
	});
});



//listening to port 8080
app.listen(8080);
