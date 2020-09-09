const EventEmitter = require('events');
const bencode = require('bencode');
const blobToBuffer = require('blob-to-buffer')
const ContactConnectedStatus = require('../../../contact/contact-connected-status')

module.exports = class ConnectionBasic extends EventEmitter {

    constructor(kademliaRules, connection, contact, contactProtocol, pendingPrefix = 'ws') {

        super();

        this._connection = connection;
        this._kademliaRules = kademliaRules;

        this.contact = contact;
        this.contactProtocol  = contactProtocol;
        this.id = contact.identityHex;
        this.status = ContactConnectedStatus.CONTACT_OPENING;

        this._queue = [];

        this._pendingPrefix = pendingPrefix+':'+this.id;

    }

    closeNow(){

        if (this.status !== ContactConnectedStatus.CONTACT_CLOSED)
            this.close();

    }

    onopen() {

        if (this.status === ContactConnectedStatus.CONTACT_OPEN) return;

        this.status = ContactConnectedStatus.CONTACT_OPEN;

        this._updateTimeout();

        this._kademliaRules.pending.pendingResolve(this._pendingPrefix, 'creation', resolve => resolve(null) );

        if (this._queue.length) {
            const copy = [...this._queue];
            this._queue = [];
            for (const data of copy)
                this.sendConnectionWaitAnswer( data.id, data.buffer, data.cb);
        }

        this.emit("opened", this );
    }

    onclose () {

        if (this.status === ContactConnectedStatus.CONTACT_CLOSED) return;

        this.status = ContactConnectedStatus.CONTACT_CLOSED;

        if (this._kademliaRules.alreadyConnected[this.contact.identityHex] === this)
            delete this._kademliaRules.alreadyConnected[this.contact.identityHex];

        this._kademliaRules.pending.pendingTimeoutAll(this._pendingPrefix, timeout => timeout() );

        if (this._queue.length) {

            const queue = this._queue;
            this._queue = [];

            for (const data of queue)
                data.cb(new Error('Disconnected or Error'))
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

    _processConnectionMessage ( id, message) {

        this._updateTimeout();
        let c = 0;

        const decoded = bencode.decode(message);
        const status = decoded[ c++ ];

        if (id === undefined) id = decoded[c++];
        const data = decoded[c++];

        if ( status === 1 ){ //received an answer

            if (this._kademliaRules.pending.list[ this._pendingPrefix ] && this._kademliaRules.pending.list[ this._pendingPrefix][id])
                this._kademliaRules.pending.pendingResolve(this._pendingPrefix, id, (resolve) => resolve( null, data ));

        } else {

            this._kademliaRules.receiveSerialized( this, id, this.contact, this.contactProtocol, data, {}, (err, buffer )=>{

                if (err) return;
                this.sendData(id, buffer);

            });

        }

    }

    _getTimeoutConnectionTime () {
        return KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.T_WEBSOCKET_DISCONNECT_INACTIVITY
    }

    _setTimeoutConnection () {
        this._kademliaRules.pending.pendingAdd( this._pendingPrefix, '',() => this.closeNow(), ()=>{}, this._getTimeoutConnectionTime(),  );
    }

    _updateTimeout () {

        const pending = this._kademliaRules.pending.list[ this._pendingPrefix ];
        if (pending && pending['']) {
            pending[''].timestamp = new Date().getTime();
            pending[''].time = this._getTimeoutConnectionTime();
        }
        else
            this._setTimeoutConnection();
    }

    sendConnectionWaitAnswer ( id, buffer, cb)  {

        if (this.status !== ContactConnectedStatus.CONTACT_OPEN  )
            this._queue.push( {id, buffer, cb} );
        else {

            this._kademliaRules.pending.pendingAdd( this._pendingPrefix, id, ()=> cb(new Error('Timeout')), cb);
            this.sendData( id, buffer )

        }

    }

    sendData(id, buffer){

    }


}