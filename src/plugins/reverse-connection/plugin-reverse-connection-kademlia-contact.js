module.exports = function (options){

    return class MyContact extends options.Contact {

        constructor() {

            super(...arguments);

            this._specialContactProtocolByCommands['REV_CON'] = this.convertProtocolToWebSocket.bind(this);
        }

    }

}