const bencode = require('bencode');

module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            this._commands.FIND_SORTED_LIST = this._findSortedList.bind(this);
            this._commands.STORE_SORTED_LIST_VALUE = this._storeSortedListValue.bind(this);

            this._allowedStoreSortedListTables = {
                '':{
                    validation:  ( srcContact, self, [table, masterKey, key, value, score], old ) => {

                        if (  old && old.score >= score ) return null;
                        return {value, score};

                    },
                    expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                    immutable: true,
                },
            };

        }

        async _storeSortedListValue(req, srcContact, [table, masterKey, key, value, score]){

            const allowedSortedListTable = this._allowedStoreSortedListTables[table.toString()];
            if (!allowedSortedListTable) throw 'Table is not allowed';

            let old;

            if (allowedSortedListTable.immutable){

                const has = await this._store.hasSortedListKey( table,  masterKey, key );
                if (has) return this._store.putExpiration(table, key, allowedSortedListTable.expiry);

            } else
                old = await this._store.getSortedListKey(table, masterKey, key);

            const data = allowedSortedListTable.validation( srcContact, allowedSortedListTable, [table, masterKey, key, value, score], old );
            if ( data ) return this._store.putSortedList(table, masterKey, key, data.value, data.score, allowedSortedListTable.expiry);

            return 0;

        }

        sendStoreSortedListValue(contact, [table, masterKey, key, value, score] ){

            if (!this._allowedStoreSortedListTables[table.toString()])
                throw 'Table is not allowed';

            return this.send(contact,'STORE_SORTED_LIST_VALUE', [table, masterKey, key, value, score])
        }


        /**
         * Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding value.
         * @param masterKey
         */
        async _findSortedList(req, srcContact, [table, masterKey]){

            const out = await this._store.getSortedList(table, masterKey);

            //found the data
            if (out) return [ 1, out ];
            else return [ 0, this._kademliaNode.routingTable.getClosestToKey(masterKey) ];

        }

        sendFindSortedList(contact, table, key){
            return this.send(contact, 'FIND_SORTED_LIST', [table, key]);
        }


        decodeSendAnswer(dstContact, command, data, decodedAlready = false){

            if (!decodedAlready && Buffer.isBuffer(data)) data = bencode.decode(data);

            if ( command === 'FIND_SORTED_LIST'&& data[0] === 0 ){
                for (let i = 0; i < data[1].length; i++)
                    data[1][i] = this._kademliaNode.createContact( data[1][i] );

                return data;
            }

            return super.decodeSendAnswer(dstContact, command, data, true);
        }


    }


}