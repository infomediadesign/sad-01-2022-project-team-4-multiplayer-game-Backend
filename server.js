const Player = require('./Player');
const { nanoid } = require('nanoid');
const Position = require('./Position');
const GameRoom = require('./GameRoom');

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 'pingInterval': 10000, 'pingTimeout': 25000 });
const PORT= 7779;

app.get('/', (req, res) =>
{
    res.sendFile(__dirname + '/index.html');
});

http.listen(PORT, () =>
{
    console.log('Connected at ' + PORT);
});

var sockets = new Map();
var players = new Map();
var roomToSocketsMap = new Map();
var gameRooms = new Map();

io.on('connection', socket => {
    console.log("Connection Recieved from " + socket.id);
    var player = new Player();
    var currentPlayerID = player.id;
    players.set(currentPlayerID, player);
    console.log("Player ID for connection " + socket.id + " is " + currentPlayerID);
    socket.emit('init', currentPlayerID);

    socket.on('disconnect', () => {
        //If this Player was in some room, remove the player from the room.
        for (let [key, value] of gameRooms.entries()) {
            if (value.players.get(currentPlayerID))
            {
                value.players.delete(currentPlayerID);
                socket.to(key).emit('removePlayer', currentPlayerID);
                if(value.players.size == 0){
                    value.EndSimulate();
                }
            }

            if (value.sockets.get(currentPlayerID))
            {
                value.sockets.delete(currentPlayerID);
            }
        }
        players.delete(currentPlayerID);
        //TODO : I think we need to get rid of the event too by making this event into a function (But not sure)
        //socket.off('updatePlayerPosition');
        console.log("Player with player ID " + currentPlayerID + " and Name " + player.userName + " is disconnected");
    });

    socket.on('setPlayerName', playerName => {
        player.userName = playerName;
        console.log("Player name for Player ID " + currentPlayerID + " has been updated to " + player.userName);
    });

    socket.on('hostRoom', () => {
        var gameRoom = new GameRoom();
        gameRoom.players.set(currentPlayerID, player);
        gameRoom.sockets.set(currentPlayerID, socket);
        gameRooms.set(gameRoom.roomName, gameRoom);

        socket.join(gameRoom.roomName);
        socket.emit('roomJoined', gameRoom.roomName);
        socket.emit('addPlayer', player);
        gameRoom.StartSimulate();
        socket.on('updatePlayerPosition', (x, y, z) =>{
            if(player){
                player.position.x = x;
                player.position.y = y;
                player.position.z = z;
                // console.log("Updated Player Position of " + player.userName +
                //  " to " + player.position.x + "," + player.position.y + "," + player.position.z);
            }
        });
    });

    socket.on('joinRoom', roomName => {

        var gameRoom = gameRooms.get(roomName);
        if(gameRoom && gameRoom.players){
            gameRoom.players.set(currentPlayerID, player);
            gameRoom.sockets.set(currentPlayerID, socket);
    
            socket.join(gameRoom.roomName);
            socket.emit('roomJoined', gameRoom.roomName);

            //Let this Client Spawn already joined people
            for (let [key, value] of gameRoom.players.entries()){
                socket.emit('addPlayer', value);
            }

            //Let other people in the room know about this client
            socket.to(roomName).emit('addPlayer', player);
            socket.on('updatePlayerPosition', (x, y, z) =>{
                if(player){
                    player.position.x = x;
                    player.position.y = y;
                    player.position.z = z;
                    // console.log("Updated Player Position of " + player.userName +
                    //  " to " + player.position.x + "," + player.position.y + "," + player.position.z);
                }
            });
        }
        else{
            console.log("Oops, Cannot Find room with Room Name " + roomName);
        }
    });
});















function OnConnection_New(socket){
    var player = new Player();
    var currentPlayerID = player.id;
    sockets.set(currentPlayerID, socket);
    players.set(currentPlayerID, player);
    SetupSocketEvents_New(socket, currentPlayerID);
    console.log(currentPlayerID + ' Connected');
    socket.emit('init', currentPlayerID);
}

function OnConnection(socket)
{
    var player = new Player();
    var currentPlayerID = player.id;
    sockets.set(currentPlayerID, socket);
    players.set(currentPlayerID, player);
    SetupSocketEvents(socket, currentPlayerID);
    console.log(currentPlayerID + ' Connected');
}

function SetupSocketEvents_New(socket, currentPlayerID){

    var roomID = "";
    //Ping Events
    socket.conn.on('packet', function (packet) {
        if (packet.type === 'ping') console.log('received ping');
        if (packet.type === '[ong') console.log('received pong');
    });

    socket.conn.on('packetCreate', function (packet) {
        if (packet.type === 'pong') console.log('sending pong');
        if (packet.type === 'ping') console.log('sending ping');
    });

    socket.on('hostRoom', (playerName) =>
    {
        players.get(currentPlayerID).userName = playerName;
        roomID = nanoid(6);
        socket.join(roomID);
        AddSocketToRoomToSocketMap(roomID, socket.id);
        socket.leave(socket.id);

        socket.emit('roomJoined', roomID);
        SpawnPlayerSocketEvent(socket, currentPlayerID, roomID);
    });

    socket.on('joinRoom', (roomID, playerName) =>
    {
        // TODO: Check if room id exists
        // var roomList = io.sockets.adapter.rooms;
        // roomList.forEach(element => {
        //     console.log(element.id);
        // });
        players.get(currentPlayerID).userName = playerName;
        socket.join(roomID);
        AddSocketToRoomToSocketMap(roomID, socket.id);
        socket.leave(socket.id);

        socket.emit('roomJoined', roomID)
        SpawnPlayerSocketEvent(socket, currentPlayerID, roomID);
    });

    socket.on('disconnect', () =>
    {
        sockets.delete(currentPlayerID);
        players.delete(currentPlayerID);
        RemoveSocketToRoomToSocketMap(socket.id);
        socket.to(roomID).emit('playerDisconnected', currentPlayerID);
        console.log('user disconnected');
    });
    
    socket.on('updatePlayerPosition', (playerID, posX, posY, posZ) =>
    {
        var currentPlayer = players.get(playerID);
        currentPlayer.position.x = posX;
        currentPlayer.position.y = posY;
        currentPlayer.position.z = posZ;
    });

    socket.on('chat', (msg) => {
        console.log('Message from client ' + msg);
    })
}

function SpawnPlayerSocketEvent(socket, currentPlayerID, roomID){
        //Spawn for self
        //Send info to this client of all players
        
        // const clients = io.sockets.adapter.rooms[roomID];
        const clients = roomToSocketsMap[roomID];
        const numClients = clients ? clients.size : 0;

        for (const clientId of clients ) {  
            var playerID = GetPlayerIDFromSocketID(sockets, clientId);
            var player = players.get(playerID);
            socket.emit('spawnPlayer', player);
            console.log('spawnPlayer sending to ' + players.get(currentPlayerID).userName + ' to spawn ' + player.userName);
       }

        // for (var entry of players.entries()) {
        //     socket.emit('spawnPlayer', entry[1]);
        //     console.log('spawnPlayer sending to ' + players.get(currentPlayerID).userName + ' to spawn ' + entry[1].userName);
        // }

        //Spawn for others
        //Send my info to other players
        socket.to(roomID).emit('spawnPlayer', players.get(currentPlayerID));
        console.log('spawnPlayer sending to All to spawn ' + players.get(currentPlayerID).userName)
        // socket.broadcast.emit('spawnPlayer', players.get(currentPlayerID));
        // console.log('spawnPlayer sending to All to spawn ' + players.get(currentPlayerID).userName)

        setInterval(function () 
        {
            const clients = roomToSocketsMap[roomID];
            const numClients = clients ? clients.size : 0;

            for (const clientId of clients ) {  
                var playerID = GetPlayerIDFromSocketID(sockets, clientId);
                var player = players.get(playerID);
                if(player)
                {
                    socket.to(roomID).emit('playerPositionUpdate', player);
                    console.log('sending Player Position Update for player ' + player.userName);
                }
            }
        }, 33);
}

function AddSocketToRoomToSocketMap(roomId, socketId) {
    //if the list is already created for the "key", then uses it
    //else creates new list for the "key" to store multiple values in it.
    roomToSocketsMap[roomId] = roomToSocketsMap[roomId] || [];
    roomToSocketsMap[roomId].push(socketId);
}

function RemoveSocketToRoomToSocketMap(roomId, socketId) {
    //if the list is already created for the "key", then uses it
    //else creates new list for the "key" to store multiple values in it.
    if(roomToSocketsMap[roomId])
    {
        var i = roomToSocketsMap[roomId].indexOf(socketId);
        roomToSocketsMap[roomId].splice(i, 1);
    }
}

function GetPlayerIDFromSocketID(sockets, socketID) {
    for (let [key, value] of sockets.entries()) {
      if (value.id === socketID)
        return key;
    }
  }

function SetupSocketEvents(socket, currentPlayerID) {

    socket.conn.on('packet', function (packet) {
        if (packet.type === 'ping') console.log('received ping');
        if (packet.type === '[ong') console.log('received pong');
    });

    socket.conn.on('packetCreate', function (packet) {
        if (packet.type === 'pong') console.log('sending pong');
        if (packet.type === 'ping') console.log('sending ping');
    });

    socket.on('chat', (msg) =>
    {
        io.emit('chat', msg);
    });
    socket.on('disconnect', () =>
    {
        sockets.delete(currentPlayerID);
        players.delete(currentPlayerID);
        socket.broadcast.emit('playerDisconnected', currentPlayerID);
        console.log('user disconnected');
    });

    socket.on('setPlayerName', (playerName) => {
        players.get(currentPlayerID).userName = playerName;
        console.log('Player name of ' + currentPlayerID + ' updated to ' + playerName);
        socket.emit('init', currentPlayerID);
        console.log('Init Player');
        console.log('room ' + io.sockets.adapter.rooms.length);

        //Spawn for self
        //Send info to this client of all players
        for (var entry of players.entries()) {
            socket.emit('spawnPlayer', entry[1]);
            console.log('spawnPlayer sending to ' + players.get(currentPlayerID).userName + ' to spawn ' + entry[1].userName);
        }

        //Spawn for others
        //Send my info to other players
        socket.broadcast.emit('spawnPlayer', players.get(currentPlayerID));
        console.log('spawnPlayer sending to All to spawn ' + players.get(currentPlayerID).userName)
    });
}