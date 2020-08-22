const WebRTC = require('./isomorphic-webrtc')
const MarshalUtils = require('../../../helpers/marshal-utils')
const BufferReader = require('../../../helpers/buffer-reader')
const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')
const bencode = require('bencode');

module.exports = class WebRTCConnection {

    constructor(config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {

        this._rtcPeerConnection = new WebRTC.RTCPeerConnection({config});

        this._readyState = 'close';

        this.onconnect = undefined;
        this.ondisconnect = undefined;
        this.onmessage = undefined;

        this._chunks = {};

        this.chunkSize = 0;

    }

    init( kademliaRules, contact ){

        this._kademliaRules = kademliaRules;

        this.id = Math.floor( Math.random() * Number.MAX_SAFE_INTEGER );
        this.contact = contact;
        this.contactProtocol  = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC;
        this.isWebRTC = true;

        this._kademliaRules._alreadyConnected[contact.identityHex] = this;
        this._kademliaRules._webRTCActiveConnectionsByContactsMap[contact.identityHex] = this;
        this._kademliaRules._webRTCActiveConnections.push(this)

        this._updateTimeoutWebRTC();

        this.onconnect = () => {
            this._kademliaRules.pending.pendingResolveAll('rendezvous:webRTC:' + contact.identityHex, resolve => resolve(null, true ) );
        }

        this.ondisconnect = ()=>{

            this._kademliaRules.pending.pendingTimeoutAll('webrtc:'+this.id, timeout => timeout() );

            if (this._kademliaRules._alreadyConnected[contact.identityHex] === this)
                delete this._kademliaRules._alreadyConnected[contact.identityHex];

            if (this._kademliaRules._webRTCActiveConnectionsByContactsMap[contact.identityHex] === this) {
                delete this._kademliaRules._webRTCActiveConnectionsByContactsMap[contact.identityHex];

                for (let i = this._kademliaRules._webRTCActiveConnections.length-1; i >= 0; i--)
                    if (this._kademliaRules._webRTCActiveConnections[i] === this){
                        this._kademliaRules._webRTCActiveConnections.splice(i, 1);
                        break;
                    }

            }

        }


        this.onmessage = (id, data) => {

            this._updateTimeoutWebRTC();

            const decoded = bencode.decode(data);
            const status = decoded[0];

            if ( status === 1 ){ //received an answer

                if (this._kademliaRules.pending.list['webrtc:'+this.id] && this._kademliaRules.pending.list['webrtc:'+this.id][id])
                    this._kademliaRules.pending.pendingResolve('webrtc:'+this.id, id, (resolve) => resolve( null, decoded[1] ));

            } else {

                this._kademliaRules.receiveSerialized( this, id, this.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, decoded[1], {}, (err, buffer )=>{

                    if (err) return;
                    this.sendData(id, buffer);

                });

            }

        }
    }

    _updateTimeoutWebRTC(){
        const pending = this._kademliaRules.pending.list['webrtc:'+this.id];
        if (pending) {
            pending[''].timestamp = new Date().getTime();
        }
        else this._setTimeoutWebRTC();
    }

    _setTimeoutWebRTC(){
        this._kademliaRules.pending.pendingAdd( 'webrtc:'+this.id, '',() => {
            try {
                this.close()
            }catch(err){

            }
            this.ondisconnect();
        }, ()=>{}, KAD_OPTIONS.PLUGINS.NODE_WEBRTC.T_WEBRTC_DISCONNECT_INACTIVITY,  );
    }


    setChunkSize(otherPeerMaxChunkSize, myMaxChunkSize = this.getMaxChunkSize()){

        if ( typeof otherPeerMaxChunkSize !== "number") throw "invalid otherPeerMaxChunkSize";
        if (otherPeerMaxChunkSize < 16*1024) throw "invalid value otherPeerMaxChunkSize";

        this.chunkSize = Math.min(otherPeerMaxChunkSize, myMaxChunkSize)
    }

    _onChannelMessageCallback(event, channel){

        const chunkSize = (this.chunkSize - 7*3 );

        const data = BufferReader.create( Buffer.from(event.data) );

        const id = MarshalUtils.unmarshalNumber(data);
        const chunks = MarshalUtils.unmarshalNumber(data);
        const index = MarshalUtils.unmarshalNumber(data);
        const chunk = data.readRemaining(data)

        if ( chunk * chunkSize > KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.MAX_TRANSFER_PAYLOAD_SIZE )
            throw "MAX PAYLOAD";

        if (index >= chunks || index < 0) throw "index exceeds chunks";
        if (index < chunks-1 && chunk.length !== chunkSize ) throw "chunk has invalid length"
        if (index === chunks-1 && chunk.length > chunkSize) throw "last chunk has invalid length"

        if (!this._chunks[id]) {
            this._chunks[id] = {
                count: 0,
                chunks,
                list: {},
            }

            this._kademliaRules.pending.pendingAdd( 'webrtc:'+this.id+':pending', id,() => {
                delete this._chunks[id];
            }, ()=>{
                delete this._chunks[id];
            }, KAD_OPTIONS.PLUGINS.NODE_WEBRTC.T_WEBRTC_DISCONNECT_INACTIVITY,  );
        }

        if (!this._chunks[id].list[index]){
            this._chunks[id].count += 1;
            this._chunks[id].list[index] = chunk;
        } else throw "Chunk already received"

        if (this._chunks[id].count === this._chunks[id].chunks){
            const array = [];
            for (let i=0; i < this._chunks[id].chunks; i++ )
                array.push(this._chunks[id].list[i])

            const buffer = Buffer.concat(array);

            this._kademliaRules.pending.pendingResolve('webrtc:'+this.id+':pending', id, (resolve) => resolve( ) );
            if (this.onmessage) this.onmessage(id, buffer);
        }

    }

    _onChannelStateChange(event, channel){
        this._readyState = channel.readyState;
        if (channel.readyState === 'open' && this.onconnect) this.onconnect(this);
        if (channel.readyState === 'close' && this.ondisconnect) this.ondisconnect(this);
    }

    sendData(id, data) {

        const chunkSize = (this.chunkSize - 7*3 );

        const length = data.length;
        const chunks = Math.ceil( length / chunkSize );

        const prefix = Buffer.concat([
            MarshalUtils.marshalNumber(id),
            MarshalUtils.marshalNumber(chunks),
        ]);

        let i = 0, index = 0;
        while (i < length){

            const chunk = data.slice(i, i += this.chunkSize );

            const buffer = Buffer.concat([
                prefix,
                MarshalUtils.marshalNumber(index),
                chunk,
            ])

            this._channel.send(buffer);
            index+= 1;
        }

    }

    processData(data){

        for (const key in data)
            if (Buffer.isBuffer(data[key]) )
                data[key] = data[key].toString();

        return data;
    }

    processDataOut(data){
        if (data.toJSON) return data.toJSON();
        return data;
    }

    /**
     * https://lgrahl.de/articles/demystifying-webrtc-dc-size-limit.html
     * @returns {number}
     */
    getMaxChunkSize(){

        if (typeof BROWSER !== "undefined"){

            let firefoxVersion = window.navigator.userAgent.match(/Firefox\/([0-9]+)\./);
            firefoxVersion = firefoxVersion ? parseInt(firefoxVersion[2]) : 0;
            if (firefoxVersion >= 57) return 64 * 1024; //64kb

            let chromiumVersion = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
            chromiumVersion = chromiumVersion ? parseInt(chromiumVersion[2]) : 0;
            if (chromiumVersion) return 256 * 1024;

        } else {

            return 256*1024; // https://github.com/node-webrtc/node-webrtc/issues/202#issuecomment-489452004

        }

        return 16*1024;
    }

}