/*jslint smarttabs:true */
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
//set up socket.io stuff
var http = require('http'),
	server = http.createServer(app);

//now add socket.io
var io = require('socket.io')(server);
io.set('log level', 1); //debug mode off

//json, urlencoded, multipart middleware:
app.use(express.bodyParser());

app.use(express.static('pub')); //needed to serve static files.
app.use(express.favicon(__dirname + '/pub/img/favicon.png')); //favicon
app.engine('html', engines.hogan); //run .html files through Hogan
app.set('views', __dirname + "/templates"); //templating


/* 
   Packaged Queries
   ========================================================================== */
/* DB Creation */
var createRoomsTable = 'CREATE TABLE IF NOT EXISTS rooms (name TEXT PRIMARY KEY);';
var createMessagesTable = 'CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, nickname TEXT, body TEXT, time INTEGER);';

/* Find shit */
var getRoomByName = 'SELECT name FROM rooms WHERE name=$1;';
var getRecentRooms = "SELECT DISTINCT room FROM messages WHERE time >= strftime('%s', 'now') - 300;"; //300 seconds = 5 min
var getMessagesInRoom = 'SELECT * FROM messages WHERE room=$1;';

/* Insert shit */
var insertRoom = 'INSERT INTO rooms VALUES ($1);';
var insertMessage = 'INSERT INTO messages(room, nickname, body, time) VALUES($1, $2, $3, $4);';

/* 
   More Database setup
   ========================================================================== */
var anyDB = require('any-db');
var conn = anyDB.createConnection('sqlite3://chatroom.db');


/* 
   Request Handlers
   ========================================================================== */

app.get('/', function(req, resp) {
	console.log('- Request received:', req.method.cyan, req.url.underline);
	
	//TODO: maybe someday we can have users sign in here 
	//      and give them a session cookie

	//create new Table for messages and rooms:
	conn.query(createRoomsTable)
		.on('error', function() {
			console.log("ERROR: rooms table could not be created!!".error);
		});
	conn.query(createMessagesTable)
		.on('error', function() {
			console.log("ERROR: messages table could not be created!!".error);
		});
	resp.render('welcome.html');
});

app.get('/recentRooms.json', function(req, resp) {
	console.log('- Request received:', req.method.cyan, req.url.underline);
	var data = {recentRooms: []};
	//get all recently active rooms:
	var q = conn.query(getRecentRooms);
	q.on('row', function(row) {
		console.log("The returned row object:", row);
		data.recentRooms.push(row.room);
	});
	q.on('end', function() {
		console.log('Finished searching for recent rooms'.cyan);
		resp.json(data);
	});
});



app.post('/:roomName/create', function(req, resp) {
	var data = {roomExists: false};	//response data to send (json) roomExists starts as false

	//check if the room exists
	var q = conn.query(getRoomByName, [req.params.roomName]);
	q.on('row', function(row) {
		data.roomExists = true; //if we get here we know that the room is in the database.
	});

	//if room does not exist, put it in database.
	q.on('end', function() {
		if (!data.roomExists)
			conn.query(insertRoom, [req.params.roomName]);
		resp.json(data);
	});
});



app.get('/:roomName', function(req, resp) {
	var roomName = req.params.roomName;
	console.log('- Request received:', req.method.cyan, req.url.underline);
	//first we check if room exists:
	var isRoom = false;
	var q = conn.query(getRoomByName, [roomName]);
	q.on('row', function(row) { 
		console.log("Request for room " + roomName + " validated");
		isRoom = true;
	});
	q.on('error', function() {
		//probably the rooms table does not exist. 
		//provide link to '/' so that table can be created
		console.log("ERROR looking for room" + roomName);
		resp.writeHead(200, {'Content-Type': 'text/html'});
		resp.end("<h1>Uh Oh! An error occurred.</h1> <h3><a href='/'>Click here</a> to try a restart.<h3>");
		return;
	});
	q.on('end', function() {
		if (!isRoom) { //if room does not exist, give an error.
			resp.status(404).end("Error 404: room not found"); //throw 404
			var msg = "Room '" + roomName + "' does not exist in database!";
			console.log(msg.red);
		}
		else {
			//render chatroom for name
			console.log('Loading Room:', roomName.yellow);
			resp.render('room.html', {roomName: roomName});
		}
	});
});


/**
 * Inserts a new message into the database
 * @param  {JSON} req  {
 *                      message: 'to send',
 *                      nickname: 'of_sender'
 *                     }
 * 
 * @param  {JSON} resp {
 *                      succcess: true or false
 *                     }
 */
app.post('/:roomName/messages', function(req, resp) {
	console.log("Message post received:", req.body);
	var data = {success: true};

	//insert new message
	//.schema: id INTEGER, room TEXT, nickname TEXT, body TEXT, time INTEGER
	var q = conn.query(insertMessage, [req.params.roomName, req.body.nickname, req.body.message, Math.round(Date.now()/1000)] );
	q.on('error', function() {
		console.log("Problem inserting message into messages table!");
		data.success = false;
	});
	
	q.on('end', function() {
		resp.json(data);
	});
});



/* 
   CLIENT HANDLER (socket.io)
   ========================================================================== */
io.sockets.on('connection', function(socket) {
	
	/* New users */
	socket.on('join', function(roomName, nickname, callback) {
		console.log("User " + nickname.magenta + " joined room " + roomName.yellow);
		socket.join(roomName); //socket.io rooms feature
		socket.nickname = nickname; // set nickname field of this socket
		socket.active = true;

		broadcastMembership(roomName); //update userlist

		//get all messages for the room
		var messages = [];
		var q = conn.query(getMessagesInRoom, [roomName] );

		q.on('row', function(row) {
			messages.push(row); //put each message found in the list
		});

		q.on('error', function() {
			console.log("ERROR retrieving messages.\n Room: ".error + roomName);
			data.success = false;
		});

		//send the messages to the client
		q.on('end', function() {
			callback(messages);
		});
	});


	/* If a client changes their nickname */
	socket.on('nickname', function(nickname) {
		console.log("User " + socket.nickname + " changing name to " + nickname.magenta);
		socket.nickname = nickname;
	});


	/* Handle incoming messages: */
	socket.on('message', function(msgBody) {
		//get room socket is in
		var roomName = getCurrRoom(socket);

		console.log("New message in room " + roomName.yellow + " from user " + socket.nickname.magenta);
		var msg = toMsgString(msgBody); //make the message HTML-safe
		var q = conn.query(insertMessage, [roomName, socket.nickname, msg, Math.round(Date.now()/1000)] );
		
		q.on('error', function() {
			console.log("ERROR inserting new message into database!");
			return; //don't want to send the message bc it's not in the database
		});

		//Send the new message to everyone in the room
		q.on('end', function() {
			broadcastMessage(roomName, socket.nickname, msg);
		});
	});

	/* Handle client disconnect */
	socket.on('disconnect', function(){
		broadcastMembership(getCurrRoom(socket));
    });

	socket.on('blur', function() {
		socket.active = false;
		broadcastMembership(getCurrRoom(socket));
	});

	socket.on('focus', function() {
		socket.active = true;
		broadcastMembership(getCurrRoom(socket));
	});

});


/* 
   Helper methods for socket
   ========================================================================== */

/**
 * Gets the current room that the parametized client socket
 * is in. Returns empty string if the client is only in the 
 * global '' room.
 * 
 * @param  {Client Socket} socket
 * @return {String} The room name that the socket is in, or '' if 
 *                  the socket is only in the global room        
 */
function getCurrRoom(socket) {
	var currentRooms = Object.keys(io.sockets.manager.roomClients[socket.id]);
	if (!currentRooms) return '';
	//all clients are in a global room ''
	//must sub string bc rooms are prefixed by '/'
	return (currentRooms[0] === '' && currentRooms.length > 1) ? currentRooms[1].substr(1) : currentRooms[0].substr(1);
}


/**
 * Sends a new message to all sockets in a given room
 * 
 * @param  {String} roomName - the name of the room who's getting a new message
 */
function broadcastMessage(roomName, nickname, message) {
	io.sockets.in(roomName).emit('message', nickname, message);
}


/**
 * Tells all the sockets in the particular room
 * that the membership has changed
 * (e.g. someone left, joined, or changed
 *  their name)
 * 
 * @param	{String} roomName - the name of the room whose
 *                           membership is changing
 */
function broadcastMembership(roomName) {
	if (!roomName) return; //gtfo if empty string or null or undef

	console.log("Membership of " + roomName.yellow + " has changed.");
	var sockets = io.sockets.clients(roomName); //get all the pertinent clients
	
	// get all the nicknames from the clients using arr.map()
	var userlist = sockets.map(function(socket) {
		return {
			nickname: socket.nickname,
			active:	socket.active	
		};
	});

	//broadcast:
	io.sockets.in(roomName).emit('membershipChanged', userlist);
}





/**
 * Takes an 'unsafe' message and determines if it is a link to a URL or an image.
 * If it is determined to be an image, it is rendered as such by adding <img>
 * tags.
 * If it is determined to be a URL, it is rendered as a clickable link by adding
 * <a> tags.
 * If it is not a link or an image, any and all HTML is escaped
 * so that it will not interfere with the page HTML.
 * 
 * @param  {String} unsafe - The message body (which may contain a link or other HTML)
 * @return {String} A string which conatins the original message in safe or escaped HTML.
 */
function toMsgString(unsafe) {
	if (!unsafe) return '';
	//precompile some regular expressions to save time:
	var url_regex = /^(http|https)\:\/\/[\w\d\-_]+(\.[\w\d\-_]+)+([\w\-\.,@?^=%&amp;\:\/~\+#]*[\w\-\@?^=%&amp;\/~\+#])?/; //url matching regex i found 
	var img_regex = /(.\.png|.\.gif|\.jpeg|.\.jpg)/; //image-URL matching regular expression
	var url_arr = unsafe.match(url_regex); //test if its a url
	if (url_arr) {
		if (unsafe.substr(unsafe.length - 5).match(img_regex)) {
			//it's an image!
			return "<img style='max-width:500px;' src='" + unsafe + "'>";
		} else {
			//its just a url
			return "<a href='" + unsafe + "'>" + unsafe + "</a>";
		}
	} else {
		//it's not a URL. convert it to an HTML-escaped string
		return escapeHtml(unsafe);
	}
}

/**
 * Escapes all special HTML characters that may
 * cause problems when being rendered client-side.
 * @param  {String} unsafe - the message to be escaped
 * @return {String}          the same method with any HTML escaped.
 */
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

/*
//listening to port 8080
//no longer using this! listen with server instead
app.listen(8080);
*/
server.listen(8080);
