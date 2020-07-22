const Validation = require('./helpers/validation')
const BufferUtils = require('./helpers/buffer-utils')
const NextTick = require('./helpers/next-tick')
const {setAsyncInterval, clearAsyncInterval} = require('./helpers/async-interval')
const {preventConvoy} = require('./helpers/utils')
const bencode = require('bencode');
const Contact = require('./contact/contact')
const BufferHelper = require('./helpers/buffer-utils')

module.exports = class KademliaRules {

    constructor(kademliaNode, store) {
        this._kademliaNode = kademliaNode;
        this._store = store;
        this._replicatedStoreToNewNodesAlready = {};

        this._commands = {
            'PING': this.ping,
            'STORE': this.store,
            'FIND_NODE': this.findNode,
            'FIND_VALUE': this.findValue,
        }

        this._allowedStoreTables = {
            '': true,
        };

        this._protocolSpecifics = {

        }

    }

    start(){
        /**
         * USED to avoid memory leaks, from time to time, we have to clean this._replicatedStoreToNewNodesAlready
         * @private
         */
        this._asyncIntervalReplicatedStoreToNewNodeExpire = setAsyncInterval(
            next => this._replicatedStoreToNewNodeExpire(next),
            global.KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY +  preventConvoy(global.KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY_CONVOY),
        );
    }

    stop(){
        clearAsyncInterval(this._asyncIntervalReplicatedStoreToNewNodeExpire)
    }

    send(destContact, command, data, cb){

        if ( destContact.identity.equals(this._kademliaNode.contact.identity) )
            return cb(new Error("Can't contact myself"));

        const {sendSerialize, sendSerialized} = this._protocolSpecifics[destContact.address.protocol];
        let { id, buffer } = sendSerialize(destContact, command, data);

        sendSerialized( id, destContact, command, buffer, (err, buffer)=>{

            if (err) return cb(err);

            this.sendReceivedSerialized(destContact, command, buffer, cb);

        });

    }

    sendReceivedSerialized(destContact, command, buffer, cb){

        const decoded = this.decodeSendAnswer(destContact, command, buffer);
        if (!decoded) return cb(new Error('Error decoding data'));

        cb(null, decoded);
    }

    receiveSerialized( id, srcContact, buffer, cb){

        const decoded = this.decodeReceiveAnswer( id, srcContact, buffer );
        if (!decoded) cb( new Error('Error decoding data. Invalid bencode'));

        let c = 0;
        if (id === undefined) id = decoded[c++];
        if (srcContact === undefined) srcContact = decoded[c++];

        this.receive( id, srcContact, decoded[c++], decoded[c++], (err, out )=>{

            if (err) return cb(err);

            const {receiveSerialize} = this._protocolSpecifics[srcContact.address.protocol];
            const buffer = receiveSerialize(id, srcContact, out );
            cb(null, buffer );

        });

    }

    receive(id, srcContact, command, data, cb){

        if (this._commands[command])
            return this._commands[command].call(this, srcContact, data, cb);

        throw "invalid command";
    }

    /**
     * used to verify that a node is still alive.
     * @param cb
     */
    ping(srcContact, data, cb) {

        if (srcContact) this._welcomeIfNewNode(srcContact);
        cb(null, true);

    }

    sendPing(contact, cb){
        this.send(contact,'PING', [true],  cb);
    }

    /**
     * Stores a (key, value) pair in one node.
     * @param key
     * @param value
     * @param cb
     */
    store(srcContact, [table, key, value], cb) {

        if (!this._allowedStoreTables[table.toString('ascii')])
            return cb(new Error('Table is not allowed'));

        if (srcContact) this._welcomeIfNewNode(srcContact);

        this._store.put(table.toString('hex'), key.toString('hex'), value.toString('ascii'), cb);

    }

    sendStore(contact, [table, key, value], cb ){

        if (!this._allowedStoreTables[table.toString('ascii')])
            return cb(new Error('Table is not allowed'));

        this.send(contact,'STORE', [table, key, value], cb)

    }

    /**
     * The recipient of the request will return the k nodes in his own buckets that are the closest ones to the requested key.
     * @param key
     * @param cb
     */
    findNode( srcContact, [key], cb ){

        const err = Validation.checkIdentity(key);
        if (err) return cb(err);

        if (srcContact) this._welcomeIfNewNode(srcContact);

        cb( null, [0, this._kademliaNode.routingTable.getClosestToKey(key) ] );
    }

    sendFindNode(contact, key, cb){
        this.send(contact, 'FIND_NODE', [key], cb);
    }

    /**
     * Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding value.
     * @param key
     * @param cb
     */
    findValue( srcContact, [table, key], cb){

        if (srcContact) this._welcomeIfNewNode(srcContact);

        this._store.get(table.toString('hex'), key.toString('hex'), (err, out) => {
            //found the data
            if (out) cb(null, [1, out] )
            else cb( null, [0, this._kademliaNode.routingTable.getClosestToKey(key) ] )
        })

    }

    sendFindValue(contact, table, key, cb){
        this.send(contact, 'FIND_VALUE', [table, key], cb);
    }


    /**
     *  Given a new node, send it all the keys/values it should be storing,
     *  then add it to the routing table.
     *  @param contact: A new node that just joined (or that we just found out about).
     *  Process:
     */
    _welcomeIfNewNode(contact, cb = ()=>{} ){

        if (this._kademliaNode.routingTable.map[ contact.identityHex ] || contact.identity.equals( this._kademliaNode.contact.identity ))
            return cb(null, "already");

        this._kademliaNode.routingTable.addContact(contact);

        if (this._replicatedStoreToNewNodesAlready[contact.identityHex])
            return cb(null, "skipped");

        this._replicatedStoreToNewNodesAlready[contact.identityHex] = Date.now();
        this._replicateStoreToNewNode(contact, undefined, cb )

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
    _replicateStoreToNewNode(contact, iterator, cb){

        if (!iterator )  //first time
            iterator = this._store.iterator();

        let itValue = iterator.next();

        while (itValue.value && !itValue.done) {

            const table = itValue.value[0].slice(  0, itValue.value[0].indexOf(':')  );
            const key = itValue.value[0].slice(  itValue.value[0].indexOf(':') + 1);

            const value = itValue.value[1];

            const keyNode = Buffer.from(key, 'hex');
            const neighbors = this._kademliaNode.routingTable.getClosestToKey(contact.identity)

            let newNodeClose, thisClosest;
            if (neighbors.length){
                const last = BufferUtils.xorDistance( neighbors[neighbors.length-1].identity, keyNode );
                newNodeClose = Buffer.compare( BufferUtils.xorDistance( contact.identity, keyNode), last );
                const first = BufferUtils.xorDistance( neighbors[0].identity, keyNode );
                thisClosest = Buffer.compare( BufferUtils.xorDistance( this._kademliaNode.contact.identity, keyNode ), first)
            }

            if (!neighbors.length || ( newNodeClose < 0 && thisClosest < 0 )  )
                return this.sendStore(contact, [ table, key, value], (err, out) => {

                    if (err)
                        return cb(err); //error

                    NextTick( this._replicateStoreToNewNode.bind(this, contact, iterator, cb), global.KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_SLEEP )

                });
            else
                itValue = iterator.next();

        }

        if (!itValue.value || !itValue.done)
            cb(null, "done");

    }

    /**
     * Clear expired _replicatedStoreToNewNodesAlready
     * @private
     */
    _replicatedStoreToNewNodeExpire(next){
        
        const expiration = new Date() - global.KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY;
        for (const identityHex in this._replicatedStoreToNewNodesAlready)
            if (this._replicatedStoreToNewNodesAlready[identityHex] < expiration )
                delete this._replicatedStoreToNewNodesAlready[identityHex];

        next()
    }

    decodeSendAnswer(destContact, command, data){

        let decoded;
        if (!Buffer.isBuffer(data) ) decoded = data;
        else decoded = bencode.decode(data);

        if (command === 'FIND_VALUE'  || command === 'FIND_NODE'  ){

            if (command === 'FIND_VALUE' && decoded[0] === 1 ){
                decoded[1] = decoded[1].toString();
                return decoded;
            } else {
                for (let i = 0; i < decoded[1].length; i++)
                    decoded[1][i] = Contact.fromArray(this._kademliaNode, decoded[1][i]);
                return decoded;
            }
        }

        return decoded;
    }

    decodeReceiveAnswer(  id, srcContact, buffer ){

        try{

            let decoded;
            if (Buffer.isBuffer(buffer)) decoded = bencode.decode(buffer);
            else decoded = buffer;

            let c = 0;
            if (id === undefined)
                decoded[c] = Number.parseInt(decoded[c++]);

            if (!srcContact)
                decoded[c] = Contact.fromArray( this._kademliaNode, decoded[c++] )

            decoded[c] = decoded[c++].toString()

            return decoded;

        }catch(err){

        }

    }

}