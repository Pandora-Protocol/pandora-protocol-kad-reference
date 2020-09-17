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

                        if (  old && old.score >= score[4] ) return null;
                        return {value, score};

                    },
                    expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                },
            };

        }

        async _storeSortedListValue(req, srcContact, [table, masterKey, key, value, score]){

            const allowedSortedListTable = this._allowedStoreSortedListTables[table.toString()];
            if (!allowedSortedListTable) throw 'Table is not allowed';

            const tableStr = table.toString();
            const masterKeyStr = masterKey.toString('hex');
            const keyStr = key.toString('hex');

            const old = await this._store.getSortedListKey(tableStr, masterKeyStr, keyStr);

            const out = allowedSortedListTable.validation( srcContact, allowedSortedListTable, [table, masterKey, key, value, score], old );

            if ( out ) return this._store.putSortedList(tableStr, masterKeyStr, keyStr, out.value, out.score, allowedSortedListTable.expiry);
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

            const out = await this._store.getSortedList(table.toString(), masterKey.toString('hex'));

            //found the data
            if (out) return [ 1, out ];
            else return [ 0, this._kademliaNode.routingTable.getClosestToKey(masterKey) ];

        }

        sendFindSortedList(contact, table, key){
            return this.send(contact, 'FIND_SORTED_LIST', [table, key]);
        }


        decodeSendAnswer(dstContact, command, data, decodedAlready = false){

            if (!decodedAlready && Buffer.isBuffer(data)) data = bencode.decode(data);

            if ( command === 'FIND_SORTED_LIST' ){

                if ( data[0] === 0){

                    for (let i = 0; i < data[1].length; i++)
                        data[1][i] = this._kademliaNode.createContact( data[1][i] );

                    return data;
                }
            }

            return super.decodeSendAnswer(dstContact, command, data, true);
        }


    }


}