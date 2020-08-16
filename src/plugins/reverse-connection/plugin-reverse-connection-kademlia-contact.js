module.exports = function (options){

    return class MyContact extends options.Contact {

        getProtocol(command, data){

            if (command === 'REV_CON')
                return this.convertProtocolToWebSocket();

            return super.getProtocol(command, data);
        }


    }

}