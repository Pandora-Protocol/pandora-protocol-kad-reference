const PluginContactTypeKademliaContact = require('./plugin-contact-type-kademlia-contact')
const PluginContactTypeContactStorage = require('./plugin-contact-type-kademlia-contact-storage')

module.exports = {

    plugin: function(kademliaNode, options){

        options.Contact = PluginContactTypeKademliaContact(options);
        options.ContactStorage = PluginContactTypeContactStorage(options);

        return {
            name: "PluginContactType",
            version: "0.1",
            success: true,
        }

    },

}
