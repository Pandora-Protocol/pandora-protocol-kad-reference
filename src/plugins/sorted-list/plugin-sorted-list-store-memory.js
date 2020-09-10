const RedBlackTree = require('pandora-protocol-red-black-tree-js');
const Validation = require('./../../helpers/validation')
const Utils = require('./../../helpers/utils')
const {setAsyncInterval, clearAsyncInterval} = require('./../../helpers/async-interval')

module.exports = function (options){

    return class MyStore extends options.Store{

        constructor(){

            super(...arguments)

            this._memorySortedList = new Map();
            this._memorySortedListKeyNodesMap = new Map();

            this._memoryExpirationSortedList = new Map();

        }

        getSortedList(table, masterKey, cb){

            const err1 = Validation.checkStoreTable(table);
            const err2 = Validation.checkStoreKey(masterKey);
            if (err1 || err2) return cb(err1||err2);

            const tree = this._memorySortedList.get(table + ':' + masterKey);
            if (tree) {
                cb(null, tree.toSortedArray('getValueKeyArray'));
            }
            else
                cb( null, undefined );
        }

        putSortedList(table, masterKey, key, value, score, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY, cb){

            const err1 = Validation.checkStoreTable(table);
            const err2 = Validation.checkStoreKey(masterKey);
            const err3 = Validation.checkStoreKey(key);
            const err4 = Validation.checkStoreData(value);
            const err5 = Validation.checkStoreScore(score);
            if (err1 || err2 || err3 || err4 || err5) return cb(err1||err2||err3||err4||err5);

            let tree = this._memorySortedList.get(table + ':' + masterKey);
            if (!tree) {
                tree = new RedBlackTree();
                this._memorySortedList.set(table + ':' + masterKey, tree );
            }

            let node = this._memorySortedListKeyNodesMap.get(table +':'+ masterKey + ':' + key  ),
                save = true;

            if (node) {

                if (node.value !== value) node.value = value;

                if (node.key === score)
                    save = true;
                else {
                    //TODO optimization to avoid removing and inserting
                    //TODO thus saving O(logN)
                    tree.removeNode(node);
                }

            }

            if (save) {
                node = tree.insert(score, key, value);
                this._memorySortedListKeyNodesMap.set(table + ':' + masterKey + ':' + key, node);
            }

            this._putExpirationSortedList( table, masterKey + ':' + key, { node, masterKey, key,  time: new Date().getTime() + expiry }, ()=>{
                cb(null, 1);
            });

        }

        delSortedList(table, masterKey, key, cb){

            const err1 = Validation.checkStoreTable(table);
            const err2 = Validation.checkStoreKey(masterKey);
            const err3 = Validation.checkStoreKey(key);
            if (err1 || err2 || err3) return cb(err1||err2||err3);

            const foundNode = this._memorySortedListKeyNodesMap.get(table + ':' + masterKey + ':' + key );
            if (!foundNode) return cb(null, 0);

            const tree = this._memorySortedList.get(table + ':' + masterKey);
            tree.removeNode(foundNode);

            if ( tree.isEmpty )
                this._memorySortedList.delete( table + ':' + masterKey );

            this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + key);
            this._delExpirationSortedList(table + ':' + masterKey+':'+key, ()=>{
                cb(null, 1)
            });
        }



        //table, key already verified
        _putExpirationSortedList(table, id, { node, masterKey, key, time }, cb){

            this._memoryExpirationSortedList.set( table + ':' + id +':exp', {
                node,
                masterKey,
                key,
                time,
            });

            cb(null, 1);
        }

        //table, key already verified
        _delExpirationSortedList(table, masterKey, cb){

            if (this._memoryExpirationSortedList.get(table + ':' +masterKey)) {
                this._memoryExpirationSortedList.delete(table + ':' + masterKey + ':exp');
                cb(null, 1)
            } else
                cb(null, 0);
        }


        iteratorSortedList(){
            return this._memorySortedListKeyNodesMap.entries();
        }

        _iteratorExpirationSortedList(){
            return this._memoryExpirationSortedList.entries();
        }


        start(){

            _start(...arguments);

            delete this._expireOldKeysSortedListIterator;
            this._asyncIntervalExpireOldKeysSortedList = setAsyncInterval(
                next => this._expireOldKeysSortedList(next),
                KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000)
            );

        }

        stop(){

            _stop(...arguments);

            clearAsyncInterval(this._asyncIntervalExpireOldKeysSortedList);
        }

        _expireOldKeysSortedList(next){

            if (!this._expireOldKeysSortedListIterator)
                this._expireOldKeysSortedListIterator = this._iteratorExpirationSortedList();

            const itValue =  this._expireOldKeysSortedListIterator.next();
            if (itValue.value && !itValue.done){

                const {node,  time, key, masterKey} = it.value[1];
                if (time < new Date().getTime() ){

                    const str = itValue.value[0].splice(0, itValue[0].length-4 );
                    const table = str.slice(0, str.indexOf(':') ) ;
                    this.delSortedList(table, masterKey, key, next )
                }

            } else {
                delete this._expireOldKeysSortedListIterator;
                next()
            }

        }

    }


};
