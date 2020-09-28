const {setAsyncInterval, clearAsyncInterval} = require('../../../helpers/async-interval')
const NextTick = require('../../../helpers/next-tick')
const {preventConvoy} = require('../../../helpers/utils')
const BufferUtils = require('../../../helpers/buffer-utils')

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {
            super(...arguments);

            this._replicatedStoreToNewNodesAlready = {};

            this._allowedStoreTables = {
                '': {
                    validation:  (srcContact, self, [table, key, value], oldExtra ) => {
                        return {value, extra: true };
                    },
                    expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                    immutable: true,
                }
            };

            this._commands.STORE = this._storeCommand.bind(this);
            this._commands.FIND_VALUE = this._findValue.bind(this);

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
         * Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding value.
         * @param key
         * @param cb
         */
        async _findValue( req, srcContact, [table, key]){

            const out = await this._store.get(table, key );

            //found the data
            if (out) return [1, out];
            else return [0, this._kademliaNode.routingTable.getClosestToKey(key) ];

        }

        sendFindValue(contact, protocol, table, key){
            return this.send(contact, protocol, 'FIND_VALUE', [table, key]);
        }

        /**
         * Stores a (key, value) pair in one node.
         * @param key
         * @param value
         * @param cb
         */
        async _storeCommand(req, srcContact, [table,  key, value]) {

            const allowedTable = this._allowedStoreTables[table.toString()];
            if (!allowedTable) throw 'Table is not allowed';

            const extra = await this._store.getKeyExtra( table, key );

            if (allowedTable.immutable && extra)
                return this._store.putExpiration(table, key, allowedTable.expiry);

            const out = allowedTable.validation( srcContact, allowedTable, [table,  key, value], extra );
            if ( out ) return this._store.put( table, key, out.value, out.extra, allowedTable.expiry);

            if (extra && !out) return this._store.putExpiration(table, key, allowedTable.expiry);

            return 0;

        }

        sendStore(contact, [table, key, value] ){

            if (!this._allowedStoreTables[table.toString()])
                throw 'Table is not allowed';

            return this.send(contact,'STORE', [table, key, value] )

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
                const key = words[1];

                const value = itValue.value[1];

                const keyNode = Buffer.from( key, 'hex');
                const neighbors = this._kademliaNode.routingTable.getClosestToKey(contact.identity)

                let newNodeClose, thisClosest;
                if (neighbors.length){
                    const last = BufferUtils.xorDistance( neighbors[neighbors.length-1].identity, keyNode );
                    newNodeClose = Buffer.compare( BufferUtils.xorDistance( contact.identity, keyNode), last );
                    const first = BufferUtils.xorDistance( neighbors[0].identity, keyNode );
                    thisClosest = Buffer.compare( BufferUtils.xorDistance( this._kademliaNode.contact.identity, keyNode ), first)
                }

                if (!neighbors.length || ( newNodeClose < 0 && thisClosest < 0 )  ) {
                    const out = await this.sendStore(contact, [ Buffer.from(table), keyNode, value ]);
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