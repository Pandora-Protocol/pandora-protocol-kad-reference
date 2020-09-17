const EventEmitter = require('events');
const bencode = require('bencode');
const blobToBuffer = require('blob-to-buffer')
const ContactConnectedStatus = require('../../../contact/contact-connected-status')
const PromisesMap = require('../../../helpers/promises-map')

module.exports = class ConnectionBasic extends EventEmitter {

    constructor(kademliaRules, connection, contact, contactProtocol, pendingPrefix = 'ws', connecting) {

        super();

        this._connection = connection;
        this._kademliaRules = kademliaRules;

        this.contact = contact;
        this.contactProtocol  = contactProtocol;
        this.id = contact.identityHex;
        this.status = ContactConnectedStatus.CONTACT_OPENING;

        this._queue = [];

        this._pendingPrefix = pendingPrefix+':'+this.id;

        if (connecting) {
            const promiseData = PromisesMap.add(this._pendingPrefix, KAD_OPTIONS.T_RESPONSE_TIMEOUT);
            promiseData.promise.catch(err => this.closeNow() )
        }

    }

    closeNow(){

        if (this.status !== ContactConnectedStatus.CONTACT_CLOSED)
            this.close();

    }

    onopen() {

        if (this.status === ContactConnectedStatus.CONTACT_OPEN) return;

        this.status = ContactConnectedStatus.CONTACT_OPEN;

        this._updateTimeout();

        PromisesMap.resolve(this._pendingPrefix, true );

        if (this._queue.length) {
            const copy = [...this._queue];
            this._queue = [];
            for (const data of copy)
                this.sendData( data.id, data.buffer )
        }

        this.emit("opened", this );
    }

    onclose () {

        if (this.status === ContactConnectedStatus.CONTACT_CLOSED) return;

        this.status = ContactConnectedStatus.CONTACT_CLOSED;

        if (this._kademliaRules.alreadyConnected[this.contact.identityHex] === this)
            delete this._kademliaRules.alreadyConnected[this.contact.identityHex];

        clearTimeout(this._timeoutDisconnect);

        if (this._queue.length) {

            const queue = this._queue;
            this._queue = [];

            for (const data of queue)
                data.promiseData.reject( new Error('Disconnected or Error') )
        }

        this.emit("closed", this );

    }


    onmessage (event) {

        if (event.type !== "message") return;

        const message = event.data;

        if (typeof Blob !== 'undefined' && message instanceof Blob){
            blobToBuffer(message, (err, buffer)=>{
                if (err) return err;

                this._processConnectionMessage( undefined, buffer);
            })
        }else
            this._processConnectionMessage( undefined, Buffer.from(message) );


    };

    async _processConnectionMessage ( id, message) {

        this._updateTimeout();
        let c = 0;

        const decoded = bencode.decode(message);
        const status = decoded[ c++ ];

        if (id === undefined) id = decoded[c++];
        const data = decoded[c++];

        if ( status === 1 ){ //received an answer

            const promiseData = PromisesMap.get( this._pendingPrefix + ':' + id);
            if (promiseData)
                promiseData.resolve(data);

        } else {

            const buffer = await this._kademliaRules.receiveSerialized( this, id, this.contact, this.contactProtocol, data, {});
            this.sendData(id, buffer);

        }

    }

    _getTimeoutConnectionTime () {
        return KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
    }

    _updateTimeout () {

        clearTimeout(this._timeoutDisconnect);
        this._timeoutDisconnect = setTimeout(()=> this.closeNow(), this._getTimeoutConnectionTime() );

    }

    sendConnectionWaitAnswer ( id, buffer )  {

        const promiseData = PromisesMap.add(this._pendingPrefix + ':' + id, KAD_OPTIONS.T_RESPONSE_TIMEOUT );

        if (this.status !== ContactConnectedStatus.CONTACT_OPEN  )
            this._queue.push( {id, buffer, promiseData } );
        else
            this.sendData( id, buffer )

        return promiseData.promise;
    }

    sendData(id, buffer){

    }


}