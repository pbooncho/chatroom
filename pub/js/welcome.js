/**
 * attach a new handler for the submit
 * function of the room form.
 */
$(window).load(function() {
    $("#roomForm").submit(createNewRoom);

    //get recent rooms:
    $.get('/recentRooms.json', function(data) {
        if (data.recentRooms.length > 0)
            displayRecentRooms(data.recentRooms);
        else 
            noRecentRooms();
    });

});


/**
 * If no name is entered, a random name is generated.
 * Otherwise, the entered name is checked for validity.
 * Alphanumeric characters are allowed as well as the
 * '_', '-', and '+' characters.
 * The name is then POST'ed to the server to see if a room 
 * of the same name exists or not. If the room does not 
 * exist in the database, the room is created and the user 
 * is redirected to their new room.
 * If the room is already contained in the database, the
 * user is informed that the room already exists and is
 * asked if they want to go to that room.
 * 
 * @param  {event data} e - used to prevent the default action fo the form.
 */
function createNewRoom(e) {
    e.preventDefault(); //prevent redirect
    var roomName = '';
    var givenName = $("#roomName").val(); //get name from input

    if (givenName === "") {
        roomName = generateRoomID(); //generate random if none specified
    } else {
        //test that given Name is acceptable.
        var regexp = /^[a-zA-Z0-9_\-\+]{3,24}$/;
        if (givenName.match(regexp)) {
            roomName = givenName;
		} else { //unacceptable room Name
            $("#roomName").addClass('badInput');
            if (givenName.length < 3 || givenName.length > 24)
                $("#creationDiv").append("<p class='roomErr'>The roomname must be between 3 and 24 characters.</p>");
            else
                $("#creationDiv").append("<p class='roomErr'>The roomname cannot contain punctuation, special characters, or spaces.<br>Alphanumeric characters or - _ + only.</p>");
		}
	}
    //now we have a valid room name, check if it's in the database:
    if (roomName !== '') {
        //post to /roomName/create:
        $.post('/'+ roomName +'/create', function(data) {
            if (data.roomExists) { //check if room already exists
                console.log("Room already exists!!");
                $("#roomName").addClass('badInput');
                $("#creationDiv").append("<p class='alreadyExists'> <a href='/" + roomName + "'>" + roomName + "</a> is already a room!</p>");
            } else {
                window.location.href = "/"+roomName;
            }
        });
    }
}


/**
 * generates a random room ID of length 6
 * @return {String} the randomly generated room ID (6-character)
 */
function generateRoomID() {
    var chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789_-";

    var result = "";
    for (var i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


function displayRecentRooms(roomList) {
    for (var i = 0; i < roomList.length; i++) {
        var room = roomList[i];
        var str = "<li><a href='/"+room+"'>"+ room + "</a></li>";
        $("#recentList").append(str);
    }
}

function noRecentRooms() {
    $("#recentRoomTitle").text("No active rooms :(");
}
