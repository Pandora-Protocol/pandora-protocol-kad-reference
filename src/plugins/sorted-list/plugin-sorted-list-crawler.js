const Validation = require('./../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        iterativeFindSortedList(table, key, finishWhenValue = false, cb){

            const err1 = Validation.checkIdentity(key);
            const err2 = Validation.checkTable(table);
            if (err1 || err2) return cb(err1||err2);

            if (finishWhenValue){

                this._kademliaNode._store.getSortedList(table.toString('hex'), key.toString('hex'), (err, out)=>{

                    if (out){
                        const obj = { };
                        for (let value of out)
                            obj[value] = {score: value[1], contact:this._kademliaNode.contact};
                        return cb(null, obj ? {result: obj} : undefined );
                    }
                    this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', key, finishWhenValue, cb);

                });

            } else
                this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', key, finishWhenValue, cb);


        }

        iterativeStoreSortedListValue(table, treeKey, key, value, score, cb){
            return this._iterativeStoreValue( [table, treeKey, key, value, score], 'sendStoreSortedListValue', (data, next) => this._kademliaNode._store.putSortedList( table.toString('hex'), treeKey.toString('hex'), key.toString('hex'), value, score, next ), cb)
        }

        _iterativeFindMerge(table, key, result, contact, finishWhenValue, method, finalOutputs ){

            if (method === 'FIND_SORTED_LIST'){

                const fct = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString('ascii')];

                for (const value of result)
                    if ( !finalOutputs[value[0]] || finalOutputs[value[0]] < value[1] ) {

                        if (fct(contact, [table, key, value[0], value[1], value[2] ]))
                            finalOutputs[value[0]] = {value: value[1], score: value[2], contact};

                    }

            }
            else return super._iterativeFindMerge(...arguments);

        }

    }

}