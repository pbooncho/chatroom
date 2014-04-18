var socket = io.connect();

var prev_msg_ID = 0,
	message_load_interval,
	new_message = false;

/**
 * attach a new handler for the submit
 * function of the room form.
 */
$(window).load(function() {
	/* handle incoming socket events from server: */
	//handle new message:
	socket.on('message', function(nickname, message) {
		$("#messageList").append(HTMLifyMessage(nickname, message)); //HTMLify & append message
		scrollList(); //scroll new message into view
	});

	//handle when room's members change:
	socket.on('membershipChanged', function(userlist) {
		var userlistHTML = "<h2>Online Now</h2>\n";
		for (var i = 0; i < userlist.length; i++) {
			userlistHTML += HTMLifyUser(userlist[i].active, userlist[i].nickname);
		}
		console.log("USERLIST HTML:\n", userlistHTML);
		$("#userlist").html(userlistHTML);
	});

	socket.on('disconnect', function () {
		alert('The server has disconnected.');
		document.location.reload(true);
	});


	/* now bind form submits: */
    $("#messageForm").submit(sendMessage);
    $("#nick_form").submit(setNick);
});


/**
 * Tells the server that this client
 * is no longer focused in the window,
 * so that the server can update the userlist.
 */
window.onblur = function() {
	socket.emit('blur');
};


/**
 * Tells the server that this client
 * is now focused in the window, so that
 * they can be marked as available in the
 * user list.
 */
window.onfocus = function() {
	socket.emit('focus');
};


/**
 * A function to send a new message from the
 * messageForm.
 * 
 * @param  {event data} e - used to prevent default
 */
function sendMessage(e) {
	e.preventDefault(); //no redirect

	var message = $("#messageField").val();		//get message body
	socket.emit('message', message);			//send message via socket

	$("#messageField").val(""); //remove text from input
}


/**
 * Sets the nickname field of the form, 
 * provided an acceptable username.
 */
function setNick(e) {
	e.preventDefault(); //no redirect
	var nick = $("#nick_input").val(); //get value of input

	//must be at least 3 chars
	if (nick.length < 3) {
		$("#nick_prompt").append("<p>Username must be between 3 and 16 characters.</p>");
		return;
	}

	$("#nickLabel").text(nick+":");					//set nickname label
	console.log("nickname set to:", nick);			//log nickname to console
	
	//clean up the view (remove nickname prompt)
	$("#nick_prompt p").remove(); //the nick is ok, remove the err msg
	$("#nick_overlay").fadeOut('400', function() {
		$("#nick_overlay").remove();
	});

	//now join the room via the socket (implicitly sets the nickname) 
	socket.emit('join', meta('roomName'), nick, function(messages) {
		//loop through message array and append each message to messageList
		for (var i = 0; i < messages.length; i++) {
			//HTMLify & append messageq
			$("#messageList").append(HTMLifyMessage(messages[i].nickname, messages[i].body));
		}
		scrollList();
	});
}


function scrollList() {
	var scrollAmount = $("#messageList").get(0).scrollHeight - $("#messageList").height();
	$("#messageList").scrollTop(scrollAmount);
}

/**
 * Create an HTML entity for a new message to be displayed
 * 
 * @param  {String} nickname - Nickname of the message sender
 * @param  {String} message  - The content of the message
 * @return {String} An HTML string of the nickname & message
 */
function HTMLifyMessage(nickname, message) {
	var msg_html = "<p class='singleMsg'>" + 
						"<span class='singleMsgNick'>" + 
							nickname + ":" + 
						"</span>" +
						message + 
					"</p>";
	return msg_html;
}

/**
 * Creates an HTML entity for a user
 * @param {Boolean} available - if the user is available or not
 * @param {String} nickname - the nickname of the user
 * @return {String} An HTML string of the avail. identifier and username
 */
function HTMLifyUser(available, nickname) {
	var avail_tag;
	if (available)
		avail_tag = "<div class='status available'>";
	else
		avail_tag = "<div class='status idle'>";

	var user_html = "<div class='singleUser'>\n" +
						avail_tag + "</div>\n" +
						"<h1>" +
							nickname +
						"</h1>\n" +
					"</div>\n";
	return user_html;
}

/**
 * Cool helper function to let you grab info from the meta tag.
 * @param  {String} tagName - The name of the meta tag to get the content of
 * @return {String}				The content of the meta tag with the specified name
 */
function meta(tagName) {
	return $("meta[name="+ tagName +"]").attr('content');
}
