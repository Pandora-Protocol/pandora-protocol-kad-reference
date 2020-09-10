const Validation = require('./../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        iterativeFindSortedList(table, masterKey, cb){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey);

            const err1 = Validation.checkTable(table);
            const err2 = Validation.checkIdentity(masterKey);
            if (err1 || err2) return cb(err1||err2);

            this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', masterKey, false, cb);

        }

        iterativeStoreSortedListValue(table, masterKey, key, value, score, cb){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey);
            if (typeof key === 'string') key = Buffer.from(key);
            if (typeof value === 'string') value = Buffer.from(value);

            const allowedSortedListTable = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString()];
            if (!allowedSortedListTable) return cb(new Error('Table is not allowed'));

            return this._iterativeStoreValue( [table, masterKey, key, value, score], 'sendStoreSortedListValue', (data, next) => this._kademliaNode._store.putSortedList( table.toString('hex'), masterKey.toString('hex'), key.toString('hex'), value, score, allowedSortedListTable.expiry, next ), cb)
        }

        _iterativeFindMerge(table, key, result, contact, finishWhenValueFound, method, finalOutputs ){

            if (method === 'FIND_SORTED_LIST'){

                const allowedSortedListTable = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString()];

                for (const value of result)
                    if ( !finalOutputs[value[0]] || finalOutputs[value[0]] < value[1] ) {

                        if (allowedSortedListTable.validation(contact, allowedSortedListTable, [table, key, value[0], value[1], value[2] ]))
                            finalOutputs[value[0]] = {
                                value: value[1],
                                score: value[2],
                                contact
                        };

                    }

            }
            else return super._iterativeFindMerge(...arguments);

        }

    }

}