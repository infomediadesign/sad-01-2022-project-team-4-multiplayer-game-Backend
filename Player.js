const { nanoid } = require('nanoid');
const Position = require('./Position');

module.exports = class Player{
    constructor() {
        this.id = nanoid();
        this.userName = 'Game Player';
        this.position = new Position();
    }
}