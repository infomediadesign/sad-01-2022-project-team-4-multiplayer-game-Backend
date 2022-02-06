const { nanoid } = require('nanoid');
const Position = require('./Position');

module.exports = class Player{
    static Pool = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
    constructor() {
        this.id = nanoid();
        this.userName = 'Game Player';
        this.position = new Position();
        this.rotation = new Position();
        this.modelIndex = this.RandomFromPool();
        this.tasksFinished = 0;
        console.log("Model Index " + this.modelIndex);
    }

    RandomFromPool(){
        var randomN = Math.floor(Math.random() * Player.Pool.length);
        Player.Pool.splice(randomN,1);
        if(Player.Pool.length === 0) Player.Pool = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
        return randomN;
    }
}