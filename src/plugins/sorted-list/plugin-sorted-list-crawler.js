const Validation = require('./../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        iterativeFindSortedList(table, masterKey){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey, 'hex');

            Validation.validateTable(table);
            Validation.validateIdentity(masterKey);

            return this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', masterKey, false);

        }

        iterativeStoreSortedListValue(table, masterKey, key, value, score){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey, 'hex');
            if (typeof key === 'string') key = Buffer.from(key, 'hex');
            if (typeof value === 'string') value = Buffer.from(value);

            Validation.validateTable(table);
            Validation.validateIdentity(masterKey);
            Validation.validateIdentity(key);

            const allowedSortedListTable = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString()];
            if (!allowedSortedListTable) throw'Table is not allowed';

            return this._iterativeStoreValue( [table, masterKey, key, value, score], 'sendStoreSortedListValue', data => this._kademliaNode._store.putSortedList( table.toString(), masterKey.toString('hex'), key.toString('hex'), value, score, allowedSortedListTable.expiry ))
        }

        _iterativeFindMerge(table, key, result, contact, finishWhenValueFound, method, finalOutputs ){

            if (method === 'FIND_SORTED_LIST'){

                const allowedSortedListTable = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString()];

                for (const value of result){

                    const out = allowedSortedListTable.validation(contact, allowedSortedListTable, [table, key, Buffer.from(value[0], 'hex'), value[1], value[2] ], finalOutputs[value[0]] );

                    if (out)
                        finalOutputs[ value[0].toString('hex') ] = {
                            value: out.value,
                            score: out.score,
                            contact
                        };

                }

            }
            else return super._iterativeFindMerge(...arguments);

        }

    }

}