const Validation = require('../../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        constructor() {
            super(...arguments);

            this._methods.FIND_SORTED_LIST = {

                findMerge: (table, masterKey, data, contact, method, finalOutputs ) => {

                    const allowedSortedListTable = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString()];
                    let merged;

                    for (const value of data){

                        const key = value[0].toString('hex');
                        const out = allowedSortedListTable.validation(contact, allowedSortedListTable, [table, masterKey, value[0], value[1], value[2] ], finalOutputs[key] ? finalOutputs[key].extra : undefined );

                        if (out) {
                            finalOutputs[key] = {
                                value: out.value,
                                score: out.score,
                                extra: out.extra,
                                contact,

                                data: value,
                            };
                            merged = true;
                        }

                    }

                    return merged;
                },

                decode: this._methods.FIND_NODE.decode,

            }

        }

        iterativeFindSortedList(table, masterKey){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey, 'hex');

            Validation.validateTable(table);
            Validation.validateKey(masterKey);

            return this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', masterKey, false);

        }

        async iterativeStoreSortedListValue(table, masterKey, key, value, score){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey, 'hex');
            if (typeof key === 'string') key = Buffer.from(key, 'hex');
            if (typeof value === 'string') value = Buffer.from(value);

            Validation.validateTable(table);
            Validation.validateKey(masterKey);
            Validation.validateKey(key);

            const allowedSortedListTable = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString()];
            if (!allowedSortedListTable) throw'Table is not allowed';

            const out = await this._iterativeStoreValue( [table, masterKey, key, value, score], 'sendStoreSortedListValue' );
            if (out)
                await this._kademliaNode._store.putSortedList( table, masterKey, key, value, score, allowedSortedListTable.expiry )

            return out;
        }

    }

}