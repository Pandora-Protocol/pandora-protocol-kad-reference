const WebRTC = require('../webrtc/isomorphic-webrtc')
const MarshalUtils = require('../../../helpers/marshal-utils')
const BufferReader = require('../../../helpers/buffer-reader')
const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')
const ContactConnectedStatus = require('../../../contact/contact-connected-status')

const PluginNodeWebsocketConnectionBasic = require('../../node-websocket/connection/connection-basic')

module.exports = class WebRTCConnection extends PluginNodeWebsocketConnectionBasic {

    constructor(kademliaRules, connection, contact, config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {

        super(kademliaRules, connection, contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, 'webrtc');

        this._readyState = 'close';

        this.isWebRTC = true;
        this._connection = this._rtcPeerConnection = new WebRTC.RTCPeerConnection({config});

        this._chunks = {};
        this.chunkSize = 0;

        this._kademliaRules.alreadyConnected[contact.identityHex] = this;
        this._kademliaRules._webRTCActiveConnectionsByContactsMap[contact.identityHex] = this;
        this._kademliaRules._webRTCActiveConnections.push(this)

        this._kademliaRules.pending.pendingAdd( this._pendingPrefix, 'creation', timeout => this.closeNow(), resolve => {}, 2*KAD_OPTIONS.T_RESPONSE_TIMEOUT );

    }

    setChunkSize(otherPeerMaxChunkSize, myMaxChunkSize = this.getMaxChunkSize()){

        if ( typeof otherPeerMaxChunkSize !== "number") throw "invalid otherPeerMaxChunkSize";
        if (otherPeerMaxChunkSize < 16*1024) throw "invalid value otherPeerMaxChunkSize";

        this.chunkSize = Math.min(otherPeerMaxChunkSize, myMaxChunkSize)
    }

    onclose(callTimeout = true) {

        super.onclose(...arguments)

        try{
            if (this._rtcPeerConnection) {
                this._rtcPeerConnection.close()
                this._rtcPeerConnection = null;
            }
        }catch(err){

        }

        if (this._kademliaRules._webRTCActiveConnectionsByContactsMap[this.contact.identityHex] === this) {
            delete this._kademliaRules._webRTCActiveConnectionsByContactsMap[this.contact.identityHex];

            for (let i = this._kademliaRules._webRTCActiveConnections.length - 1; i >= 0; i--)
                if (this._kademliaRules._webRTCActiveConnections[i] === this) {
                    this._kademliaRules._webRTCActiveConnections.splice(i, 1);
                    break;
                }

        }

    }

    _processConnectionMessage( id, data ){

        data = BufferReader.create( data );

        const chunkSize = (this.chunkSize - 10*3 );

        id = MarshalUtils.unmarshalNumber(data);
        const chunks = MarshalUtils.unmarshalNumber(data);

        if ( chunks * chunkSize > KAD_OPTIONS.PLUGINS.NODE_WEBSOCKET.MAX_TRANSFER_PAYLOAD_SIZE ) throw "EXCEED PAYLOAD";

        const index = MarshalUtils.unmarshalNumber(data);
        const chunk = data.readRemaining(data)

        if (index >= chunks || index < 0) throw "index exceeds chunks";
        if (index < chunks-1 && chunk.length !== chunkSize ) throw "chunk has invalid length"
        if (index === chunks-1 && chunk.length > chunkSize) throw "last chunk has invalid length"

        if (!this._chunks[id]) {

            this._chunks[id] = {
                count: 0,
                chunks,
                list: {},
            }

            //to avoid memory leak
            this._kademliaRules.pending.pendingAdd( this._pendingPrefix+':pending', id,() => delete this._chunks[id], ()=> delete this._chunks[id], KAD_OPTIONS.PLUGINS.NODE_WEBRTC.T_RESPONSE_TIMEOUT,  );
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

            //to avoid memory leak
            this._kademliaRules.pending.pendingResolve(this._pendingPrefix+':pending', id, resolve => resolve( ) );

            super._processConnectionMessage(id, buffer);
        }

    }

    _onChannelStateChange(event, channel){
        this._readyState = channel.readyState;
        if (this.status !== ContactConnectedStatus.CONTACT_OPEN && channel.readyState === 'open' ) this.onopen();
        if (this.status !== ContactConnectedStatus.CONTACT_CLOSED && (channel.readyState === 'close' || channel.readyState === 'closed')) this.onclose();
    }

    sendData(id, data) {

        try{

            const chunkSize = (this.chunkSize - 10*3 );
            const length = data.length;
            const chunks = Math.ceil( length / chunkSize );

            const prefix = Buffer.concat([
                MarshalUtils.marshalNumber(id),
                MarshalUtils.marshalNumber(chunks),
            ]);

            let i = 0, index = 0;
            while (i < length){

                const chunk = data.slice(i, i += chunkSize );

                const buffer = Buffer.concat([
                    prefix,
                    MarshalUtils.marshalNumber(index),
                    chunk,
                ])

                this._channel.send(buffer);
                index+= 1;
            }

        }catch(err){
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

        try{

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


        }catch(err){
            console.error('getMaxChunkSize raised an error', err);
        }

        return 16*1024;
    }

}