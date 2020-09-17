module.exports = class Store{

    constructor(type = "interface", id = 1) {
        this.id = id;
        this.type = "memory";
        this._started = false;
    }

    start(){
        if (this._started) throw "Store already started";

        this._started = true;
    }

    stop(){
        if (!this._started) throw "Store already closed";

        this._started = false;
    }


}