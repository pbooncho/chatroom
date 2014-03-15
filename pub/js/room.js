var prev_msg_ID = 0,
	message_load_interval,
	new_message = false,
	open_tag	=	"<p class='singleMsg'>", //for crafting single messages
	open_span	=		"<span class='singleMsgNick'>", //holds the username
	close_span	=		"</span>",
	close_tag	=	"</p>";

/**
 * attach a new handler for the submit
 * function of the room form.
 */
$(window).load(function() {
    $("#messageForm").submit(sendMessage);
    $("#nick_form").submit(setNick);

/*
    //prevent scrolling to into the spacer
    msgL = $("#messageList");
	msgL.scroll(function(event) {
		var st = msgL.scrollTop(),
			h  = msgL.height();
    	if (st < h) msgL.scrollTop(h);
    });
*/
    //set the timeout to start loading messages:
    startLoadingMsgs();
    //loadAllMsgs();

});

/**
 * A function to send a new message from the
 * messageForm.
 * 
 * @param  {event data} e - used to prevent default
 */
function sendMessage(e) {
	e.preventDefault(); //no redirect
	//get pertinent data from form:
	var msgInput = $("#messageField"),
		msgData = {};

	var unsafe = msgInput.val();
	msgData.message = toMsgString(unsafe);
	msgInput.val(""); //immediately remove text from input
	msgData.nickname = $("#nickField").val();

	var roomName = $("meta[name=roomName]").attr('content'); //get room name
	console.log("Sending message:", msgData.message);
	
	//AJAX
	$.post('/'+ roomName +'/messages', msgData, function(resp) {
		if (resp.success) { //'success' here refers to the database successfully inserting the message into the table
			var new_message_open_tag = "<p id='new_message' class='singleMsg'>"; //give open tag an ID; need to remove it later
			var msg_html = new_message_open_tag + open_span + msgData.nickname + ":" + close_span + msgData.message + close_tag; //craft HTML
			$("#messageList").append(msg_html); //append message
			new_message = true; //flag for removal on next request to server
		}
	});
	scrollList();
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
	
	$("#nick_prompt p").remove(); //the nick is ok, remove the err msg
	$("#nickField").val(nick); //set nickname field in form
	$("#nickLabel").text(nick+":"); //set nickname label
	var pdW = $("#nickLabel").width(); //set nickname label
	//$("#messageList").css('padding-left', $("#nickLabel").width()); // set padding left to width of nickname
	console.log("nickname set to:", $("#nickField").val());
	$("#nick_overlay").fadeOut('400', function() {
		$("#nick_overlay").remove();
	});
}





function loadSincePrev() {
	var data = {prevID:prev_msg_ID}; //set data.prevID to the most recent message ID.
	var roomName = $("meta[name=roomName]").attr('content');//get room name

	//AJAX: send the most recently displayed message ID to the server 
	//so it can select only the undisplayed messages from the db.
	$.post('/'+ roomName +'/messages/prev', data, function(resp) {
		if (resp.success) {} //TODO: perhaps try to handle errors ?		
		// new message gets set to true when we add
		// a new message to the message list.
		// new message comes from the UI, not the database
		// so we need to remove it before appending 
		// messages from the database to the message list, 
		// otherwise we will get duplicates.
		if (new_message) {
			$("#new_message").remove();
			new_message = false;
		}

		//loop through message array and append each message to messageList
		var msg;
		for (var i = 0; i < resp.msgArray.length; i++) {
			msg = resp.msgArray[i];
			var msg_html = open_tag + open_span + msg.nickname + ":" + close_span + msg.body + close_tag; //craft HTML
			$("#messageList").append(msg_html); //append message
		}

		//store id of most recently displayed message (if there is one)
		if (msg) {
			prev_msg_ID = msg.id;
			scrollList(); //scroll only when there's a new message
		}
	});
}

function loadAllMsgs() {
	var roomName = $("meta[name=roomName]").attr('content');//get room name

	//AJAX: send the most recently displayed message ID to the server 
	//so it can select only the undisplayed messages from the db.
	$.get('/'+ roomName +'/messages', function(resp) {
		if (resp.success) {} //TODO: perhaps try to handle errors ?		
		// new message gets set to true when we add
		// a new message to the message list.
		// new message comes from the UI, not the database
		// so we need to remove it before appending 
		// messages from the database to the message list, 
		// otherwise we will get duplicates.
		if (new_message) {
			$("#new_message").remove();
			new_message = false;
		}

		var msg;
		//loop through message array and append each message to messageList
		for (var i = 0; i < resp.msgArray.length; i++) {
			msg = resp.msgArray[i];
			var msg_html = open_tag + open_span + msg.nickname + ":" + close_span + msg.body + close_tag; //craft HTML
			$("#messageList").append(msg_html); //append message
		}
		if (msg)
			prev_msg_ID = msg.id;
	});
	scrollList();
}

function startLoadingMsgs() {
	message_load_interval = window.setInterval(loadSincePrev, 500);
}
/**
 * pauses the message loader
 */
function pause() {
	clearInterval(message_load_interval);
}


function scrollList() {
	var scrollAmount = $("#messageList").get(0).scrollHeight - $("#messageList").height();
	$("#messageList").scrollTop(scrollAmount);
}

function toMsgString(unsafe) {
	var url_regex = /^(http|https)\:\/\/[\w\d\-_]+(\.[\w\d\-_]+)+([\w\-\.,@?^=%&amp;\:\/~\+#]*[\w\-\@?^=%&amp;\/~\+#])?/; //url matching regex i found 
	var url_arr = unsafe.match(url_regex); //test if its a url
	
	if (url_arr) {
		if (url_arr[url_arr.length-1].match(/(.png|.gif|.jpeg|.jpg)/)) {
			//it's an image!
			return "<img src='" + unsafe + "'>";
		} else {
			//its just a url
			return "<a href='" + unsafe + "'>" + unsafe + "</a>";
		}
	} 

	else {
		//it's not a URL. convert it to an HTML-escaped string
		return escapeHtml(unsafe);
	}
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
