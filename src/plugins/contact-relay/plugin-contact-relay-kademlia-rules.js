const ContactType = require('./contact-type')

module.exports = function(kademliaRules){

    kademliaRules._selectRelay = _selectRelay;
    kademliaRules.setRelay = setRelay;

    function _selectRelay(array, cb){

        if (!array)
            array = this._kademliaNode.routingTable.array;

        let contact, index = Math.floor( Math.random(  ) * array.length );

        while (true){

            if (!array.length) return cb(null, null );
            contact = array[index].contact;

            if (contact.contactType !== ContactType.CONTACT_TYPE_ENABLED)
                array.splice(index, 1);
            else
                break;

        }

        this._kademliaNode.rules.sendPing(contact, (err, out)=> {

            array.splice(index, 1);

            if (out) return cb(null, contact );
            else NextTick( this._selectRelay.bind(this, array, cb) );

        });

    }

    function setRelay( cb ){

        this._selectRelay(undefined, (err, contact )=>{

            if (err) return cb(err);
            if (!contact) return cb(new Error("No relay"))

            this._kademliaNode.contact.contactType = ContactType.CONTACT_TYPE_RELAY;
            this._kademliaNode.contact.relay = contact.toArrayBuffer();
            this._kademliaNode.contact.relayContact = contact;

            this._kademliaNode.contact.contactUpdated();

        })
    }

}