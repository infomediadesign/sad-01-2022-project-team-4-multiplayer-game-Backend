const Player = require('./Player');
const { nanoid } = require('nanoid');
const Position = require('./Position');

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 'pingInterval': 10000, 'pingTimeout': 25000 });
const PORT= process.env.PORT || 3000;

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

io.on('connection', OnConnection_New);

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