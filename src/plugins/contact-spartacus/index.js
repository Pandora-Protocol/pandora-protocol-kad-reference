const PluginContactSpartacusKademliaContact = require('./plugin-contact-spartacus-kademlia-contact')
const PluginContactSpartacusKademliaRules = require('./plugin-contact-spartacus-kademlia-rules')
const PluginContactSpartacusKademliaContactStorage = require('./plugin-contact-spartacus-kademlia-contact-storage')
const PluginContactSpartacusKademliaCrawler = require('./plugin-contact-spartacus-kademlia-crawler')

module.exports = {

    plugin: function(kademliaNode, options){

        if (!kademliaNode.plugins.hasPlugin('PluginContactEncrypted'))
            throw "PluginContactEncrypted is required";



        options.Contact = PluginContactSpartacusKademliaContact(options);
        options.Rules = PluginContactSpartacusKademliaRules(options);
        options.ContactStorage = PluginContactSpartacusKademliaContactStorage(options);
        options.Crawler = PluginContactSpartacusKademliaCrawler(options);

        const _createContact = kademliaNode.createContact.bind(kademliaNode);
        kademliaNode.createContact = function () {

            const contact = _createContact(...arguments);

            //validate signature
            if (!contact.verifySignature() )
                throw "Invalid Contact Spartacus Signature";

            //validate identity
            if (!contact.verifyContactIdentity() )
                throw "Invalid Contact Spartacus Identity";

            return contact;
        }

        return {
            name: "PluginContactSpartacus",
            version: "0.1",
            success: true,
        }

    }

}
