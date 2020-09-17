const Validation = require('./helpers/validation')
const BufferUtils = require('./helpers/buffer-utils')
const NextTick = require('./helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('./helpers/async-interval')
const {preventConvoy} = require('./helpers/utils')
const bencode = require('bencode');
const BufferHelper = require('./helpers/buffer-utils')

module.exports = class KademliaRules {

    constructor(kademliaNode, store) {

        this._kademliaNode = kademliaNode;
        this._store = store;
        this._replicatedStoreToNewNodesAlready = {};

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

                validation:  (srcContact, self, [table, masterKey, key, value], old ) => {

                    if ( self.onlyOne && key.length ) return null;
                    return value;

                },
                expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                onlyOne: true,
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
        /**
         * USED to avoid memory leaks, from time to time, we have to clean this._replicatedStoreToNewNodesAlready
         * @private
         */
        this._asyncIntervalReplicatedStoreToNewNodeExpire = setAsyncInterval(
            this._replicatedStoreToNewNodeExpire.bind(this),
            KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY -  preventConvoy(KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY_CONVOY),
        );

        return {rules: true}
    }

    initContact(contact){

    }

    stop(){
        clearAsyncInterval(this._asyncIntervalReplicatedStoreToNewNodeExpire)
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
     * Stores a (key, value) pair in one node.
     * @param key
     * @param value
     * @param cb
     */
    async _storeCommand(req, srcContact, [table, masterKey, key, value]) {

        const tableStr = table.toString();
        const masterKeyStr = masterKey.toString('hex');
        const keyStr = key.toString('hex');

        const allowedTable = this._allowedStoreTables[tableStr];
        if (!allowedTable) throw 'Table is not allowed';

        if (allowedTable.immutable){

            const has = await this._store.hasKey( tableStr, masterKeyStr, keyStr);
            if (has) return this._store.putExpiration(tableStr, masterKeyStr, keyStr, allowedTable.expiry);

            const data = allowedTable.validation( srcContact, allowedTable, [table, masterKey, key, value], null );
            if ( data ) return this._store.put( tableStr, masterKeyStr, keyStr, data, allowedTable.expiry);

            return 0;

        } else {

            const old = await this._store.getKey( tableStr, masterKeyStr, keyStr);

            const data = allowedTable.validation( srcContact, allowedTable, [table, masterKey, key, value], old );
            if ( data ) return this._store.put( tableStr, masterKeyStr, keyStr, data, allowedTable.expiry);

            return 0;

        }

    }

    sendStore(contact, [table, masterKey, key, value] ){

        if (!this._allowedStoreTables[table.toString()])
            throw 'Table is not allowed';

        return this.send(contact,'STORE', [table, masterKey, key, value] )

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
     * Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding value.
     * @param key
     * @param cb
     */
    async _findValue( req, srcContact, [table, key]){

        const out = await this._store.get(table.toString(), key.toString('hex') );
        //found the data
        if (out) return [1, out];
        else return [0, this._kademliaNode.routingTable.getClosestToKey(key) ];

    }

    sendFindValue(contact, protocol, table, key){
        return this.send(contact, protocol, 'FIND_VALUE', [table, key]);
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

        if (this._replicatedStoreToNewNodesAlready[contact.identityHex])
            return false; //skipped

        this._replicatedStoreToNewNodesAlready[contact.identityHex] = new Date().getTime();
        this._replicateStoreToNewNode(contact, undefined )

        return true;
    }

    /**
     * For each key in storage, get k closest nodes.  If newnode is closer
     * than the furtherst in that list, and the node for this server
     * is closer than the closest in that list, then store the key/value
     * on the new node (per section 2.5 of the paper)
     * @param contact
     * @param iterator
     * @private
     */
    async _replicateStoreToNewNode(contact, iterator){

        if (!iterator )  //first time
            iterator = this._store.iterator();

        let itValue = iterator.next();

        while (itValue.value && !itValue.done) {

            const words = itValue.value[0].split(':');

            const table = words[0];
            const masterKey = words[1];
            const key = words[2];

            const value = itValue.value[1];

            const keyNode = Buffer.from( masterKey, 'hex');
            const neighbors = this._kademliaNode.routingTable.getClosestToKey(contact.identity)

            let newNodeClose, thisClosest;
            if (neighbors.length){
                const last = BufferUtils.xorDistance( neighbors[neighbors.length-1].identity, keyNode );
                newNodeClose = Buffer.compare( BufferUtils.xorDistance( contact.identity, keyNode), last );
                const first = BufferUtils.xorDistance( neighbors[0].identity, keyNode );
                thisClosest = Buffer.compare( BufferUtils.xorDistance( this._kademliaNode.contact.identity, keyNode ), first)
            }

            if (!neighbors.length || ( newNodeClose < 0 && thisClosest < 0 )  ) {
                const out = await this.sendStore(contact, [table, masterKey, key, value]);
                NextTick(this._replicateStoreToNewNode.bind(this, contact, iterator), KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_SLEEP);
            }
            else
                itValue = iterator.next();

        }

        if (!itValue.value || !itValue.done)
            return "done";

    }

    /**
     * Clear expired _replicatedStoreToNewNodesAlready
     * @private
     */
    async _replicatedStoreToNewNodeExpire(){
        
        const expiration = new Date() - KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY;
        for (const identityHex in this._replicatedStoreToNewNodesAlready)
            if (this._replicatedStoreToNewNodesAlready[identityHex] < expiration )
                delete this._replicatedStoreToNewNodesAlready[identityHex];

        return true;
    }

    decodeSendAnswer(dstContact, command, data, decodedAlready = false){

        if (!decodedAlready && Buffer.isBuffer(data)) data = bencode.decode(data);

        if (command === 'FIND_VALUE'  || command === 'FIND_NODE'  ){

            if (command === 'FIND_VALUE' && data[0] === 1 ){

            } else {
                for (let i = 0; i < data[1].length; i++)
                    data[1][i] = this._kademliaNode.createContact ( data[1][i] );
            }
        }

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