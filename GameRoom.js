const { nanoid } = require('nanoid');
module.exports = class GameRoom{

    constructor() {
        this.roomName = nanoid(4);
        this.isStarted = false;
        this.maxAllowedPlayers = 10;
        this.players = new Map();
        this.sockets = new Map();
        this.simulationLoop = null;
        this.Simulater = ()=>{
            //console.log("Simulation Running for Room " + this.roomName + " with " + this.players.size + " Players");
            for (let [key1, value1] of this.players.entries()){
                var curSocket = this.sockets.get(key1);
                for (let [key2, value2] of this.players.entries()){
                    if(key1 !== key2){
                        // console.log("Sending Update to " + value1.userName + " for User " + 
                        // value2.userName + " who is at Position " + value2.position.x + "," +
                        //  value2.position.y + "," + value2.position.z);
                        curSocket.emit('playerPositionUpdate', value2);
                    }
                }
            }
        }
    }

    

    StartSimulate(){
        console.log("Room " + this.roomName + " Simulation Started");
        this.simulationLoop = setInterval(this.Simulater, 33);
    }

    

    EndSimulate(){
        console.log("Room " + this.roomName + " Simulation Ended");
        clearInterval(this.simulationLoop);
    }

    Simulate(){
        console.log("Simulation Running for Room " + this.roomName + " with " + this.players.size + " Players");
        for (let [key1, value1] of this.players.entries()){
            var curSocket = this.sockets.get(curPlayer);
            for (let [key2, value2] of this.players.entries()){
                if(key1 != key2){
                    curSocket.emit('playerPositionUpdate', value2);
                }
            }
        }
    }
}