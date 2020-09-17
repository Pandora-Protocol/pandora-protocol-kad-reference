const RedBlackTree = require('pandora-protocol-red-black-tree-js');
const Validation = require('./../../helpers/validation')
const Utils = require('./../../helpers/utils')
const {setAsyncInterval, clearAsyncInterval} = require('./../../helpers/async-interval')

module.exports = function (options){

    return class MyStore extends options.Store{

        constructor(){

            super(...arguments)

            this._memorySortedList = {};
            this._memorySortedListKeyNodesMap = new Map();

            this._memoryExpirationSortedList = new Map();

        }

        getSortedList(table, masterKey){

            Validation.validateStoreTable(table);
            Validation.validateStoreMasterKey(masterKey);

            const tree = this._memorySortedList[table + ':' + masterKey];
            if (!tree) return undefined;

            const out = tree.toSortedArrayInverted('getValueKeyArray');
            for (let i=0; i < out.length; i++)
                out[i][0] = Buffer.from(out[i][0], 'hex');
            return out;
        }

        getSortedListKey(table, masterKey, key){

            Validation.validateStoreTable(table);
            Validation.validateStoreMasterKey(masterKey);
            Validation.validateStoreMasterKey(key);

            const node = this._memorySortedListKeyNodesMap.get(table +':'+ masterKey + ':' + key  );
            if (!node) return undefined;

            return {
                value: node.value,
                score: node.score,
            };

        }

        putSortedList(table, masterKey, key, value, score, expiry = KAD_OPTIONS.T_STORE_KEY_EXPIRY){

            Validation.validateStoreTable(table);
            Validation.validateStoreMasterKey(masterKey);
            Validation.validateStoreMasterKey(key);
            Validation.validateStoreData(value);
            Validation.validateStoreScore(score);

            let tree = this._memorySortedList[table + ':' + masterKey],
                saveTree;

            if (!tree) {
                saveTree = true;
                tree = new RedBlackTree();
            }

            let node = this._memorySortedListKeyNodesMap.get(table +':'+ masterKey + ':' + key  ),
                save = true;

            if (node) {

                if (node.value !== value) node.value = value;

                if (node.key === score)
                    save = false;
                else {
                    //TODO optimization to avoid removing and inserting
                    //TODO thus saving O(logN)
                    tree.removeNode(node);
                    this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + key, node);
                    this._memoryExpirationSortedList.delete(table + ':' + masterKey + ':' + key, node);
                }

            }

            if (save) {

                if (tree.count > 1500 ){
                    const min = tree.min(tree.root);
                    if (score > min.key ) {
                        tree.removeNode(min);
                        this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + min.id);
                        this._memoryExpirationSortedList.delete(table + ':' + masterKey + ':' + min.id);
                    }
                }

                node = tree.insert(score, value, key);
                this._memorySortedListKeyNodesMap.set(table + ':' + masterKey + ':' + key, node);

                if (saveTree)
                    this._memorySortedList[table + ':' + masterKey] = tree;
            }

            this._memoryExpirationSortedList.set( table + ':' + masterKey + ':' + key, {
                node,
                masterKey,
                key,
                time: new Date().getTime() + expiry,
            });

            return 1;

        }

        delSortedList(table, masterKey, key){

            Validation.validateStoreTable(table);
            Validation.validateStoreMasterKey(masterKey);
            Validation.validateStoreMasterKey(key);

            const foundNode = this._memorySortedListKeyNodesMap.get(table + ':' + masterKey + ':' + key );
            if (!foundNode) return 0;

            const tree = this._memorySortedList[table + ':' + masterKey];
            tree.removeNode(foundNode);

            if ( tree.isEmpty )
                delete this._memorySortedList[ table + ':' + masterKey];

            this._memorySortedListKeyNodesMap.delete(table + ':' + masterKey + ':' + key);
            this._memoryExpirationSortedList.delete(table + ':' + masterKey+':'+key);

            return 1;
        }

        iteratorSortedList(){
            return this._memorySortedListKeyNodesMap.entries();
        }

        _iteratorExpirationSortedList(){
            return this._memoryExpirationSortedList.entries();
        }


        start(){

            super.start(...arguments);

            delete this._expireOldKeysSortedListIterator;
            this._asyncIntervalExpireOldKeysSortedList = setAsyncInterval(
                this._expireOldKeysSortedList.bind(this),
                KAD_OPTIONS.T_STORE_GARBAGE_COLLECTOR - Utils.preventConvoy(5 * 1000)
            );

        }

        stop(){

            super.stop(...arguments);
            clearAsyncInterval(this._asyncIntervalExpireOldKeysSortedList);

        }

        async _expireOldKeysSortedList(){

            if (!this._expireOldKeysSortedListIterator)
                this._expireOldKeysSortedListIterator = this._iteratorExpirationSortedList();

            const itValue =  this._expireOldKeysSortedListIterator.next();
            if (itValue.value && !itValue.done){

                const {node,  time, key, masterKey} = itValue.value[1];
                if (time < new Date().getTime() ){

                    const str = itValue.value[0];
                    const table = str.slice(0, str.indexOf(':') ) ;
                    await this.delSortedList(table, masterKey, key )
                }

            } else
                delete this._expireOldKeysSortedListIterator;

        }

    }


};
