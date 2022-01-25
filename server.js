const Player = require('./player');

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { 'pingInterval': 10000, 'pingTimeout': 25000 });
const PORT= 3000 || process.env.PORT

app.get('/', (req, res) =>
{
    res.sendFile(__dirname + '/index.html');
});

http.listen(PORT, () =>
{
    console.log('Connected at 3000');
    console.log('Ping ' + http.pingTimeout);
});

io.on('connection', OnConnection);
var sockets = new Map();
var players = new Map();

function OnConnection(socket)
{
    var player = new Player();
    var currentPlayerID = player.id;
    sockets.set(currentPlayerID, socket);
    players.set(currentPlayerID, player);
    SetupSocketEvents(socket, currentPlayerID);
    console.log(currentPlayerID + ' Connected');
}

function SetupSocketEvents(socket, currentPlayerID) {

    socket.conn.on('packet', function (packet) {
        if (packet.type === 'ping') console.log('received ping');
    });

    socket.conn.on('packetCreate', function (packet) {
        if (packet.type === 'pong') console.log('sending pong');
    });

    socket.on('chat', (msg) =>
    {
        io.emit('chat', msg);
    });
    socket.on('disconnect', () =>
    {
        sockets.delete(currentPlayerID);
        players.delete(currentPlayerID);
        console.log('user disconnected');
    });

    socket.on('setPlayerName', (playerName) => {
        players.get(currentPlayerID).userName = playerName;
        console.log('Player name of ' + currentPlayerID + ' updated to ' + playerName);
        socket.emit('init', currentPlayerID);

        //Spawn for self
        //Send info of all players
        for (var entry of players.entries()) {
            socket.emit('spawnPlayer', entry[1]);
        }

        //Spawn for others
        //Send my info to other players
        socket.broadcast.emit('spawnPlayer', players[currentPlayerID]);
    });
}