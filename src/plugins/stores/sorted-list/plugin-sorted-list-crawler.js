const Validation = require('../../../helpers/validation')

module.exports = function (options) {

    return class MyCrawler extends options.Crawler{

        constructor() {
            super(...arguments);

            this._methods.FIND_SORTED_LIST = {

                findMerge: (table, masterKey, data, contact, finalOutputs ) => {

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

                storeMethod: 'STORE_SORTED_LIST_VALUE',
            }

            this._methods.FIND_SORTED_LIST_KEYS = {

                findMerge: (table, masterKey, data, contact, finalOutputs ) => {

                    let merged;

                    for (const value of data){

                        const key = value[0].toString('hex');
                        const score = value[1];

                        if (!finalOutputs[key]) finalOutputs[key] = {  } ;
                        if (!finalOutputs[key][score]) finalOutputs[key][score] = [];

                        finalOutputs[key][score].push(contact);
                        merged = true;

                    }

                    return merged;
                },

                decode: this._methods.FIND_NODE.decode,

                collectFinalData: async (finalOutputs, [table, masterKey, index = Number.MAX_SAFE_INTEGER, count = KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN ]) => {

                    const returnFinalOutputs = {};

                    let output = [];
                    for (const key in finalOutputs){
                        finalOutputs[key]._key = key;
                        output.push(finalOutputs[key]);
                    }

                    for (let i=0; i < output.length; i++) {
                        const arr = [];
                        for (const key in output[i])
                            if (key !== "_key"){
                                const score = Number.parseInt(key);
                                if (score > index){
                                    delete output[i][score];
                                }else
                                    arr.push(score);
                            }
                        output[i].array = arr.sort((a,b)=>b-a);
                    }

                    let done = false;
                    while (!done && output.length){

                        output.sort((a,b)=>b.array[0]-a.array[0]);

                        const contactingContacts = {};

                        for (let i=0; i < output.length && i < count; i++){

                            if (returnFinalOutputs[ output[i]._key ])
                                continue;

                            const score = output[i].array[0];
                            const contacts = output[i][score];

                            let found = false;
                            for (let contactIndex = 0; contactIndex< contacts.length; contactIndex++) {
                                const contact = contacts[contactIndex];
                                if (contactingContacts[contact.identityHex]) {
                                    contactingContacts[contact.identityHex].keys.push(Buffer.from(output[i]._key, 'hex'))
                                    contactingContacts[contact.identityHex].scores.push(score)
                                    contactingContacts[contact.identityHex].contacts.push({
                                        contacts,
                                        contactIndex,
                                        score,
                                        selected: output[i],
                                    })
                                    found = true;
                                    break;
                                }
                            }

                            if (!found) {
                                const randomContactIndex = Math.floor(Math.random() * contacts.length);
                                const randomContact = contacts[randomContactIndex];
                                contactingContacts[randomContact.identityHex] = {
                                    contact: randomContact,
                                    keys: [ Buffer.from(output[i]._key, 'hex') ],
                                    scores: [score],
                                    contacts: [{
                                        contacts,
                                        contactIndex: randomContactIndex,
                                        score,
                                        selected: output[i],
                                    }],
                                };
                            }
                        }

                        const contactingContactsArray = Object.values(contactingContacts);
                        const out = await Promise.mapLimit( contactingContactsArray.map( it => () => {

                            try {
                                const out = this._kademliaNode.rules.sendFindSortedListKeysMultiple(it.contact, table, masterKey, it.keys)
                                return out;
                            }catch(err){

                            }

                        } ), KAD_OPTIONS.ALPHA_CONCURRENCY );

                        for (let i=0; i < out.length; i++){

                            let issues;

                            if (!out[i] || out[i].length !== contactingContactsArray[i].keys.length)
                                issues = true;
                            else {
                                const contactingContact = contactingContactsArray[i].contact;
                                for (let j = 0; j < out[i].length; j++) {

                                    const data = [contactingContactsArray[i].keys[j], out[i][j], contactingContactsArray[i].scores[j] ];
                                    const done = this._methods.FIND_SORTED_LIST.findMerge(table, masterKey, [data], contactingContact, returnFinalOutputs);
                                    if (!done)
                                        issues = true;
                                }
                            }

                            //we had some issues
                            if (issues)
                                for (const {score, selected, contacts, contactIndex} of contactingContactsArray[i].contacts) {
                                    contacts.splice(contactIndex, 1);
                                    if (contacts.length === 0){
                                        delete selected[score];
                                        selected.array.splice(0, 1);
                                        if (!selected.array.length)
                                            output.splice( output.indexOf(selected), 1 );
                                    }
                                }

                        }

                        done = true;
                        for (let i=0; i < output.length && i < count; i++)
                            if (!returnFinalOutputs[output[i]._key]){
                                done = false;
                                break;
                            }

                    }

                    return returnFinalOutputs;
                },

                storeMethod: 'STORE_SORTED_LIST_VALUE',
            }

        }

        async iterativeFindSortedList(table, masterKey, index = Number.MAX_SAFE_INTEGER, count = KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN, usingKeysFastMethod = true ){

            if (typeof table === 'string') table = Buffer.from(table);
            if (typeof masterKey === 'string') masterKey = Buffer.from(masterKey, 'hex');

            Validation.validateTable(table);
            Validation.validateKey(masterKey);

            const data = [table, masterKey];

            if (index !== Number.MAX_SAFE_INTEGER) data.push(index);
            if (count !== KAD_OPTIONS.PLUGINS.STORES.SORTED_LIST.MAX_SORTED_LIST_RETURN ) data.push(count);

            const out = await this._iterativeFind(table, usingKeysFastMethod ? 'FIND_SORTED_LIST_KEYS' : 'FIND_SORTED_LIST', masterKey, data, false);
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