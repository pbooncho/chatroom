#chatroom
######Elías Martínez Cohen _< emc3 >_

This project is a simple chatroom application that runs on **node.js**. The project allows users to create a new room or join an existing room and post messages to the room, which will be displyed to everyone in the room.

To run the project,
* open a terminal, cd into the project directory 
* run the command ```node server.js```
* point your web browser to http://localhost:8080/

##Design details

###Database
The database contains two separate tables, **rooms** and **messages**. these tables are created when a user accesses the homepage, or '/'. If a user tries to go directly to a room and no tables have been created, a special error page will be displayed.

The **rooms** table only has 1 field: the name of the room (TEXT), which is also its primary key.

The schema and an example of the **messages** table follows:

id | room | nickname | body | time
--- | ---- | ------- | ---- | ----
29 | myRoom | Eli | yo dudes wussupn | 1394838278

###Rooms

####Creation & acceptable naming conventions
Rooms are created from the home page ('/'). On the homepage there is an input box that allows the user to choose a name for their new chatroom. If that field is left blank, a random chatroom name is generated. Submittted room names must be between 3 and 24  characters, and can only contain Alphanumeric characters, _, -, and +. If the given room name does not match this requirement, an error is displayed to the user and they are asked to change their input. Additionally, if the room name is already contained in the **rooms** database table, a message is displayed to the user providing them with a link to the existing chatroom.

####Message history of rooms
There is currently no limit to how many messages will be displayed when the user enters a room, in fact *all* of the room's messages will be displayed to the user when they enter the room. This could be a potential memory hog (if, for example, the messages contained images or something) but I'm not worried about it for the purposes of this assignment.

####Nicknames
When the user enters a chatroom they are prompted to enter a nickname. I did not want to deal with authentication, so choosing a nickname does not require a password (and does not give the user a cookie). This means that each time the page is refreshed, the user has to specify a nickname. The nickname chosen by a user of the chat does not have to be unique or conform to any constraint other than being between 3 and 16 characters (i.e. special characters and spaces are allowed for the nickname).

####Refreshing
I used AJAX to load new messages to the rooms. More about that below.

###Messages

####Message-Grabbing
Messages are grabbed from the database every .5 seconds. I like the responsiveness of this interval. In order to lessen the strain of the process of loading chatroom messages, I have a global variable on the client-side called ```prev_msg_ID```. This variable is initialized to 0. Once messages are retrieved and displayed, the client sets ```prev_msg_ID``` to the ID of the most recent message retrieved. This enables the client to ask for only the most recent messages from the server rather than a complete list. When the client asks for the most recent messages, it does a POST instead of a GET in order to send along the ```prev_msg_ID``` variable. The server then uses this variable to select only the messages whose id's are greater than this ```prev_msg_ID``` number. Thus only a list of messages occuring after the most recent message are fetched, and the client can simply loop through the returned list of messages, appending each one to the message list.

####Message Displaying
I used a moustache template to render the page, but the messages are not displayed using moustache. Messages are returned from the server in an array and are appended to the END of the message list in the DOM. This means that more recent messages are displayed at the bottom of the message list. Think Facebook chat or iMessage, not Twitter.

When the user submits a new message, they are automatically scrolled to the bottom of the messageList (when there is a long history of messages, the user might be scrolled up in the list and would not see the message be appended to the list). This also happens when new messages are returned from the server. Unlike facebook which tells you to scroll down to see new messages, this chatroom scrolls down for you.

####Facilitating "Instantaneous-ness"
When a message is submitted, the client immediately appends it to the messageList, giving it a special ID: ```#new_message```. It also sets a boolean flag, also called ```new_message```. This means that the message is instantly appended to the message list before it is sent to the server. When the client requests new messages from the server, the message with the ID ```#new_message``` is guaranteed to be a part of the list of returned messages. So when the client receives a list of new messages from the server, it checks the boolean flag ```new_message```. If it is set to true, the client removes the message with the ID ```#new_message``` from the DOM before appending the list of returned messages. This allows the new message to appear instantaneously while preventing the occurrance of duplicate messages in the DOM.

There is one exception: What if the server returns the list of messages before the new message can be added to the database? In this case, the new message would be removed from the DOM, but it would not be part of the message list returned by the server. However, in this case the ```prev_msg_ID``` would be set to the ID of the message occurring just before the new message in the database. Thus, while the new message would be removed from the DOM, the user only has to wait for the next call to the server to see their new message appear in the list. This is an extremely rare case and I have yet to notice it from my testing.

