#chatroom
######Elías Martínez Cohen _< emc3 >_

This project is a simple chatroom application that runs on **node.js**. The project allows users to create a new room or join an existing room and post messages to the room, which will be displyed to everyone in the room.

To run the project,
* open a terminal, cd into the project directory 
* run the command ```node server.js```
* point your web browser to http://localhost:8080/

##Design details

###Database
The database contains two separate tables, **rooms** and **messages**. these tables are created when a user accesses the homepage, or '/' (if they do not already exist). If a user tries to go directly to a room and no tables have been created, a special error page will be displayed. 
Note: I dropped all the tables before handin.

The **rooms** table only has 1 field: the name of the room (TEXT), which is also its primary key.

The schema and an example of the **messages** table follows:

id | room | nickname | body | time
--- | ---- | ------- | ---- | ----
29 | myRoom | Eli | yo dudes wussupn | 1394838278

---
###Rooms
####Creation & acceptable naming conventions
Rooms are created from the home page ('/'). On the homepage there is an input box that allows the user to choose a name for their new chatroom. If that field is left blank, a random chatroom name is generated. Submittted room names must be between 3 and 24  characters, and can only contain Alphanumeric characters, _, -, and +. If the given room name does not match this requirement, an error is displayed to the user and they are asked to change their input. Additionally, if the room name is already contained in the **rooms** database table, a message is displayed to the user providing them with a link to the existing chatroom.

####Message history of rooms
There is currently no limit to how many messages will be displayed when the user enters a room, in fact *all* of the room's messages will be displayed to the user when they enter the room. This could be a potential memory hog (if, for example, the messages contained images or something) but I'm not worried about it for the purposes of this assignment.

####Nicknames
When the user enters a chatroom they are prompted to enter a nickname. I did not want to deal with authentication, so choosing a nickname does not require a password (and does not give the user a cookie). This means that each time the page is refreshed, the user has to specify a nickname. The nickname chosen by a user of the chat does not have to be unique or conform to any constraint other than being between 3 and 16 characters (i.e. special characters and spaces are allowed for the nickname). When a nickname is entered, the client emits a "join" event through the socket, which both sets the socket's nickname server-side and adds the socket to a particular room.

####Refreshing
I used to use AJAX to load all the messages in the rooms, but now I'm using sockets.
More about that below.

---
###Messages
####Message Pushing
#####Initial Push from Server:
When a room is loaded and the user chooses a nickname, the server handles the 'join' event by sending all of the messages from a room to the client. The messages are sent as an array of JSON objects as they are returned from the Database. The client then parses these objects and renders the messages in the message list.
#####Client to Server:
When a client submits a new message, it emits a 'message' event to the server. The server inserts the message into the database and then broadcasts the message to everyone else in the room. Note that the server now handles HTML escaping and URL encoding. Before it was done on the client side, but I realize now that is very unsafe.
#####Broadcasting messages from Server to Clients:
When the server receives a message, it broadcasts it to all clients in a given room, including the one who sent it. Thus message displaying is not truly instantaneous but the client will see the message appear as soon as the other clients see it. There is a special method for determining what room the socket emiting the message is in. Read the comments for more info.

####Message Displaying
new Messages pushed from the server are appended to the END of the message list in the DOM. This means that more recent messages are displayed at the bottom of the message list. Think Facebook chat or iMessage, not Twitter.
Also, when the client receives a new message, the messageList is automatically scrolled to the bottom. Unlike facebook which tells you to scroll down to see new messages, this chatroom scrolls down for you.

####Facilitating "Instantaneous-ness"
Since the server socket simply pushes the new messages as they arrive, there is no need for any crazy instantaneous logic.

---
###User List
The user list shows any & all users in the current room. It also shows when a user navigates away from the chat. This is done using the blur event. Thus if a user moves their focus outside the chatroom window, their status will be set to 'idle'.
Active users have a green dot, idle users are marked with a yellow-orange dot.

###EXTRAS
Some added features:
* If you paste in a URL, the server will attempt to convert it to a HTML link. 
* If you paste an image url, the server will attempt to convert it to an HTML image object
* If you paste other HTML, or js, or whatever, the server will attempt to convert it to an HTML-escaped string.
* the home page displays recently active rooms.

However, there is one bug with the auto-URL feature:
If the user enters a URL and it doesn't end with a '/', it won't be converted to a link. It's a problem with my regular expression for URL matching, which is very long and complicated. This issue has been logged.