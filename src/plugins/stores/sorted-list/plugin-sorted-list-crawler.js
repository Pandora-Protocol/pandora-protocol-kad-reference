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

        async iterativeFindSortedList(table, masterKey, index = Number.MAX_SAFE_INTEGER, count = KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN ){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey, 'hex');

            Validation.validateTable(table);
            Validation.validateKey(masterKey);

            const data = [table, masterKey];

            if (index !== Number.MAX_SAFE_INTEGER) data.push(index);
            if (count !== KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN ) data.push(count);

            const out = await this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE',  masterKey, data, false);
            if (out){
                const array = Object.values(out);
                array.sort((a,b) => b.score - a.score);
                return array.splice(0, count);
            }

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
                await this._kademliaNode.rules._storeSortedListValue(null, null, [table, masterKey, key, value, score]);

            return out;
        }

    }

}