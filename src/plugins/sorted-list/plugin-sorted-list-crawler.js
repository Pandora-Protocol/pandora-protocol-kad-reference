const Validation = require('./../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        iterativeFindSortedList(table, key, finishWhenValue = false, cb){

            const err1 = Validation.checkIdentity(key);
            const err2 = Validation.checkTable(table);
            if (err1 || err2) return cb(err1||err2);

            if (finishWhenValue){

                this._kademliaNode._store.getSortedList(table.toString('hex'), key.toString('hex'), (err, out)=>{

                    if (out) return cb(null, {  result: out, contact: this._kademliaNode.contact });
                    this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', key, finishWhenValue, cb);

                });

            } else
                this._iterativeFind(table, 'FIND_SORTED_LIST', 'STORE_SORTED_LIST_VALUE', key, finishWhenValue, cb);


        }

        iterativeStoreSortedListValue(table, key, value, score, cb){
            return this._iterativeStoreValue( [table, key, value, score], 'sendStoreSortedListValue', (data, next) => this._kademliaNode._store.putSortedList( table.toString('hex'), key.toString('hex'), value, score, next ), cb)
        }

        _iterativeFindMerge(table, key, result, contact, finishWhenValue, method, finalOutputs ){

            if (method === 'FIND_SORTED_LIST'){

                const fct = this._kademliaNode.rules._allowedStoreSortedListTables[table.toString('ascii')];

                for (const value of result)
                    if ( !finalOutputs[value[0]] || finalOutputs[value[0]] < value[1] ) {

                        if (fct(contact, [table, key, value[0], value[1], ]))
                            finalOutputs[value[0]] = {score: value[1], contact};

                    }

            }
            else return super._iterativeFindMerge(...arguments);

        }

    }

}