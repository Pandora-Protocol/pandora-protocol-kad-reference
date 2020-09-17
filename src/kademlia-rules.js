const Validation = require('./helpers/validation')
const bencode = require('bencode');
const BufferHelper = require('./helpers/buffer-utils')

module.exports = class KademliaRules {

    constructor(kademliaNode, store) {

        this._kademliaNode = kademliaNode;
        this._store = store;

        this._commands = {
            'V': this._version,
            'APP': this._app,
            'IDENTITY': this._identity,
            'PING': this._ping,
            'STORE': this._storeCommand,
            'FIND_NODE': this._findNode,
            'FIND_VALUE': this._findValue,
        }

        this._allowedStoreTables = {
            '': {
                validation:  (srcContact, self, [table, key, value], old ) => {
                    return value;
                },
                expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                immutable: true,
            }
        };

        this._protocolSpecifics = {

        }

        this.alreadyConnected = {};

    }

    _establishConnection(dstContact){
        throw ("Can't establish connection to contact");
    }

    establishConnection(dstContact){

        if (this.alreadyConnected[dstContact.identityHex])
            return this.alreadyConnected[dstContact.identityHex];

        return this._establishConnection(dstContact);

    }

    async start(opts){
        return {rules: true}
    }

    initContact(contact){

    }


    _sendProcess(dstContact, protocol, data, opts){
        return bencode.encode(BufferHelper.serializeData(data));
    }

    _sendGetProtocol(dstContact, command, data){

        // the dstContact is already contacted via a websocket
        if (this.alreadyConnected[dstContact.identityHex])
            return this.alreadyConnected[dstContact.identityHex].contactProtocol;

        return KAD_OPTIONS.TEST_PROTOCOL || dstContact.getProtocol(command);
    }

    async _sendNow(dstContact, command, data){

        const protocol = this._sendGetProtocol(dstContact, command, data);
        if (!this._protocolSpecifics[ protocol ]) throw "Can't contact";

        const {sendSerialize, sendSerialized} = this._protocolSpecifics[ protocol ];
        const { id, out } = sendSerialize(dstContact, command, data);

        const buffer = await this._sendProcess(dstContact, protocol, out, {} );

        const serialized = await sendSerialized( id, dstContact, protocol, command, buffer);

        return this.sendReceivedSerialized(dstContact, protocol, command, serialized);

    }

    send(dstContact, command, data){

        if ( dstContact.identity && dstContact.identity.equals(this._kademliaNode.contact.identity) )
            return null; //"Can't contact myself";

        return this._sendNow(dstContact, command, data);

    }

    _receivedProcess(dstContact, protocol, buffer, opts){
        return buffer;
    }

    async sendReceivedSerialized(dstContact, protocol, command, buffer){

        const out = await this._receivedProcess(dstContact, protocol, buffer, {});

        if (!out.length) return [];

        const decoded = this.decodeSendAnswer(dstContact, command, out);
        if (!decoded) throw 'Error decoding data';

        return decoded;

    }

    async receiveSerialized( req, id, srcContact, protocol, buffer, opts){

        const decoded = this.decodeReceiveAnswer( id, srcContact, buffer );
        if (!decoded) throw 'Error decoding data. Invalid bencode';

        let c = 0;
        if (id === undefined) id = decoded[c++];
        if (srcContact === undefined) srcContact = decoded[c++];

        if (opts.returnNotAllowed) return decoded;

        const out = await this.receive( req, id, srcContact, decoded[c++], decoded[c++]);

        const {receiveSerialize} = this._protocolSpecifics[protocol];
        return receiveSerialize(id, srcContact, out );

    }

    receive(req, id, srcContact, command, data){

        if (this._commands[command])
            return this._commands[command].call(this, req, srcContact, data);

        throw "invalid command";
    }

    /**
     * used to verify that a node is still alive.
     * @param cb
     */
    _ping(req, srcContact, data) {

        return [1];

    }

    sendPing(contact){
        return this.send(contact,'PING', [  ]);
    }


    /**
     * The recipient of the request will return the k nodes in his own buckets that are the closest ones to the requested key.
     * @param key
     * @param cb
     */
    _findNode( req, srcContact, [key] ){

        Validation.validateIdentity(key);

        return [0, this._kademliaNode.routingTable.getClosestToKey(key) ];
    }

    sendFindNode(contact, key){
        return this.send(contact,'FIND_NODE', [key] );
    }


    /**
     *  Given a new node, send it all the keys/values it should be storing,
     *  then add it to the routing table.
     *  @param contact: A new node that just joined (or that we just found out about).
     *  Process:
     */
    _welcomeIfNewNode( contact ){

        if (!contact.isContactAcceptableForKademliaRouting( ) || !this._kademliaNode.contact )
            return false;

        if (this._kademliaNode.routingTable.map[ contact.identityHex ] || contact.identity.equals( this._kademliaNode.contact.identity ) )
            return false;  //already

        this._kademliaNode.routingTable.addContact(contact);

        return true;
    }


    decodeSendAnswer(dstContact, command, data, decodedAlready = false){

        if (!decodedAlready && Buffer.isBuffer(data)) data = bencode.decode(data);

        if (command === 'FIND_NODE'  )
            for (let i = 0; i < data[1].length; i++)
                data[1][i] = this._kademliaNode.createContact ( data[1][i] );

        return data;
    }

    decodeReceiveAnswer(  id, srcContact, buffer ){

        try{

            const decoded = Buffer.isBuffer(buffer) ? bencode.decode(buffer) : buffer;

            let c = 0;

            if (id === undefined) decoded[c] = Number.parseInt(decoded[c++]);
            if (!srcContact) decoded[c] = this._kademliaNode.createContact( decoded[c++] )

            decoded[c] = decoded[c++].toString()

            return decoded;

        }catch(err){

        }

    }

    _version(req, srcContact, data){
        return KAD_OPTIONS.VERSION.VERSION;
    }

    _app(req, srcContact, data){
        return KAD_OPTIONS.VERSION.APP;
    }

    _identity(req, srcContact, data){
        return this._kademliaNode.contact.identity;
    }

}