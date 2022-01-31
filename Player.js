const { nanoid } = require('nanoid');
const Position = require('./Position');

module.exports = class Player{
    constructor() {
        this.id = nanoid();
        this.userName = 'Game Player';
        this.position = new Position();
        this.rotation = new Position();
        this.modelIndex = this.randomIntFromInterval(0, 18);
        this.tasksFinished = 0;
        console.log("Model Index " + this.modelIndex);
    }

    randomIntFromInterval(min, max) { // min and max included 
        return Math.floor(Math.random() * (max - min + 1) + min)
      }
}