const { nanoid } = require('nanoid')

module.exports = class Player{
    constructor() {
        this.id = nanoid();
        this.userName = 'Game Player';
    }
}