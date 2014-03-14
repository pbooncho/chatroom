#chatroom
######Elías Martínez Cohen _< emc3 >_

This project is a simple chatroom application that runs on **node.js**. The project allows users to create a new room or join an existing room and post messages to the room, which will be displyed to everyone in the room.

To run the project,
*open a terminal, cd into the project directory 
*run the command ```node server.js```
*point your web browser to http://localhost:8080/

##Design details

###Database
The database contains two separate tables, **rooms** and **messages**. these tables are created when a user accesses the homepage, or '/'. If a user tries to go directly to a room and no tables have been created, a special error page will be displayed.

The **rooms** table only has 1 field: the name of the room (TEXT), which is also its primary key.

The schema and example of the **messages** table follows:

| id | room | nickname | body | time |
| -- | ---- | -------- | ---- | ---- |
| 29 | myRoom | Eli | yo dudes wussupn | 1394838278 |




###Rooms
There is currently no limit to how many messages will be displayed when the user enters a room, in fact *all* of the room's messages will be displayed to the user when they enter the room. This could be a potential memory hog (if, for example, the messages contained images or something) but I'm not worried about it for the purposes of this assignment.

I did not want to deal with authentication, so choosing a nickname does not require a password and does not give the user a cookie. This means that each time the page is refreshed, the user has to specify a nickname. The nickname chosen by a user of the chat does not have to be unique or conform to any constraint other than being between 3 and 16 characters (i.e. special characters and spaces are allowed for the nickname).

I used
