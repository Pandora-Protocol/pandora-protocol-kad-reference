module.exports = function (options) {

    return class MyRules extends options.Rules {

        constructor() {

            super(...arguments);

            this._commands.FIND_SORTED_LIST = this._findSortedList.bind(this);
            this._commands.STORE_SORTED_LIST_VALUE = this._storeSortedListValue.bind(this);

            this._allowedStoreSortedListTables = {
                '':{
                    validation:  ( srcContact, self, [table, masterKey, key, value, score], oldExtra ) => {

                        if (  oldExtra && oldExtra[0] >= score ) return null;
                        return {value, score, extra: [score] };

                    },
                    expiry: KAD_OPTIONS.T_STORE_KEY_EXPIRY,
                    immutable: true,
                },
            };

        }

        async _storeSortedListValue(req, srcContact, [table, masterKey, key, value, score]){

            const allowedSortedListTable = this._allowedStoreSortedListTables[table.toString()];
            if (!allowedSortedListTable) throw 'Table is not allowed';

            const extra = await this._store.getSortedListKeyExtra( table, masterKey, key );

            if (allowedSortedListTable.immutable && extra)
                return this._store.putExpiration(table, key, allowedSortedListTable.expiry);

            const out = allowedSortedListTable.validation( srcContact, allowedSortedListTable, [table, masterKey, key, value, score], extra );
            if ( out ) return this._store.putSortedList(table, masterKey, key, out.value, out.score, out.extra, allowedSortedListTable.expiry);

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



    }


}