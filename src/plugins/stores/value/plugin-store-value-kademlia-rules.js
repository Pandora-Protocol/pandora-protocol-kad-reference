const Validation = require('../../../helpers/validation')
const {setAsyncInterval, clearAsyncInterval} = require('../../../helpers/async-interval')
const NextTick = require('../../../helpers/next-tick')
const {preventConvoy} = require('../../../helpers/utils')
const BufferUtils = require('../../../helpers/buffer-utils')
const bencode = require('bencode');

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);

            this._replicatedStoreToNewNodesAlready = {};

        }

        start(){

            super.start();

            /**
             * USED to avoid memory leaks, from time to time, we have to clean this._replicatedStoreToNewNodesAlready
             * @private
             */
            this._asyncIntervalReplicatedStoreToNewNodeExpire = setAsyncInterval(
                this._replicatedStoreToNewNodeExpire.bind(this),
                KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY -  preventConvoy(KAD_OPTIONS.T_REPLICATE_TO_NEW_NODE_EXPIRY_CONVOY),
            );
        }

        stop(){
            clearAsyncInterval(this._asyncIntervalReplicatedStoreToNewNodeExpire)
        }

        _welcomeIfNewNode( contact ){

            if (!super._welcomeIfNewNode(contact) ) return false;

            if (this._replicatedStoreToNewNodesAlready[contact.identityHex])
                return false; //skipped

            this._replicatedStoreToNewNodesAlready[contact.identityHex] = new Date().getTime();
            this._replicateStoreToNewNode(contact, undefined )

            return true;

        }


        /**
         * Stores a (key, value) pair in one node.
         * @param key
         * @param value
         * @param cb
         */
        async _storeCommand(req, srcContact, [table,  key, value]) {

            const tableStr = table.toString();
            const keyStr = key.toString('hex');

            const allowedTable = this._allowedStoreTables[tableStr];
            if (!allowedTable) throw 'Table is not allowed';

            if (allowedTable.immutable){

                const has = await this._store.hasKey( tableStr,  keyStr);
                if (has) return this._store.putExpiration(tableStr, keyStr, allowedTable.expiry);

                const data = allowedTable.validation( srcContact, allowedTable, [table,  key, value], null );
                if ( data ) return this._store.put( tableStr, keyStr, data, allowedTable.expiry);


            } else {

                const old = await this._store.getKey( tableStr, keyStr);

                const data = allowedTable.validation( srcContact, allowedTable, [table,  key, value], old );
                if ( data ) return this._store.put( tableStr, keyStr, data, allowedTable.expiry);

            }
            return 0;

        }

        sendStore(contact, [table, key, value] ){

            if (!this._allowedStoreTables[table.toString()])
                throw 'Table is not allowed';

            return this.send(contact,'STORE', [table, key, value] )

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

        decodeSendAnswer(dstContact, command, data, decodedAlready = false){

            if (!decodedAlready && Buffer.isBuffer(data)) data = bencode.decode(data);

            if (command === 'FIND_VALUE'  && data[0] === 0  ){
                for (let i = 0; i < data[1].length; i++)
                    data[1][i] = this._kademliaNode.createContact( data[1][i] );

                return data;
            }

            return super.decodeSendAnswer(dstContact, command, data, true);
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

    }

}