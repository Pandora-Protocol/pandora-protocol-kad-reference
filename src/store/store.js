module.exports = class Store{

    constructor(type = "interface", id = 1) {
        this.id = id;
        this.type = "memory";
        this._started = false;
    }

}