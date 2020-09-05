const WebRTC = require('./isomorphic-webrtc')
const MarshalUtils = require('../../../helpers/marshal-utils')
const BufferReader = require('../../../helpers/buffer-reader')
const ContactAddressProtocolType = require('../../contact-type/contact-address-protocol-type')
const bencode = require('bencode');
const blobToBuffer = require('blob-to-buffer')
const ContactConnectedStatus = require('../../../contact/contact-connected-status')

module.exports = class WebRTCConnection {

    constructor(kademliaRules, config = { iceServers: KAD_OPTIONS.PLUGINS.NODE_WEBRTC.ICE_SERVERS }) {

        this._kademliaRules = kademliaRules;
        this._rtcPeerConnection = new WebRTC.RTCPeerConnection({config});

        this._readyState = 'close';

        this._chunks = {};

        this.chunkSize = 0;

    }

    initializeWebRTC(  contact ){

        this.contact = contact;
        this.id = contact.identityHex;
        this.contactProtocol  = ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC;

        this.status = ContactConnectedStatus.CONTACT_CLOSED;

        this.isWebRTC = true;
        this._queue = [];

        this._kademliaRules.alreadyConnected[contact.identityHex] = this;
        this._kademliaRules._webRTCActiveConnectionsByContactsMap[contact.identityHex] = this;
        this._kademliaRules._webRTCActiveConnections.push(this)

        this._kademliaRules.pending.pendingAdd('webrtc:' + this.contact.identityHex, 'creation', timeout => this.close(), resolve => {}, 2*KAD_OPTIONS.T_RESPONSE_TIMEOUT );

    }

    onconnect(){

        console.log("webrtc connected")

        this.status = ContactConnectedStatus.CONTACT_OPEN;
        this._kademliaRules.pending.pendingResolve('webrtc:' + this.contact.identityHex, 'creation', resolve => resolve( ) );

        if (this._queue.length) {
            const copy = [...this._queue];
            this._queue = [];
            for (const data of copy)
                this.sendWebRTCWaitAnswer( data.id, data.buffer, data.cb);
        }

        this._updateTimeoutWebRTC();
    }

    close(callTimeout){
        this.ondisconnect(callTimeout);
    }

    ondisconnect(callTimeout = true) {

        try{
            if (this._rtcPeerConnection) {
                this._rtcPeerConnection.close()
                this._rtcPeerConnection = null;
            }
        }catch(err){

        }

        this.status = ContactConnectedStatus.CONTACT_CLOSED;

        if (this._kademliaRules.alreadyConnected[this.contact.identityHex] === this)
            delete this._kademliaRules.alreadyConnected[this.contact.identityHex];

        if (this._kademliaRules._webRTCActiveConnectionsByContactsMap[this.contact.identityHex] === this) {
            delete this._kademliaRules._webRTCActiveConnectionsByContactsMap[this.contact.identityHex];

            for (let i = this._kademliaRules._webRTCActiveConnections.length - 1; i >= 0; i--)
                if (this._kademliaRules._webRTCActiveConnections[i] === this) {
                    this._kademliaRules._webRTCActiveConnections.splice(i, 1);
                    break;
                }

        }

        this._kademliaRules.pending.pendingTimeoutAll('webrtc:' + this.id, timeout => timeout() );

        if (this._queue.length) {
            for (const data of this._queue)
                data.cb(new Error('Disconnected or Error'))
            this._queue = [];
        }

    }

    onmessage (id, data) {

        this._updateTimeoutWebRTC();

        const decoded = bencode.decode(data);
        const status = decoded[0];

        if ( status === 1 ){ //received an answer

            if (this._kademliaRules.pending.list['webrtc:'+this.id] && this._kademliaRules.pending.list['webrtc:'+this.id][id])
                this._kademliaRules.pending.pendingResolve('webrtc:' + this.id, id, (resolve) => resolve(null, decoded[1]));

        } else {

            this._kademliaRules.receiveSerialized( this, id, this.contact, ContactAddressProtocolType.CONTACT_ADDRESS_PROTOCOL_TYPE_WEBRTC, decoded[1], {}, (err, buffer )=>{

                if (err) return;
                this.sendData(id, buffer, false, () => {});

            });

        }

    }

    _updateTimeoutWebRTC(){
        const pending = this._kademliaRules.pending.list['webrtc:'+this.id];
        if (pending && pending['']) {
            pending[''].timestamp = new Date().getTime();
        }
        else this._setTimeoutWebRTC();
    }

    _setTimeoutWebRTC(){
        this._kademliaRules.pending.pendingAdd( 'webrtc:'+this.id, '', () => this.close(), ()=>{}, KAD_OPTIONS.PLUGINS.NODE_WEBRTC.T_WEBRTC_DISCONNECT_INACTIVITY,  );
    }


    setChunkSize(otherPeerMaxChunkSize, myMaxChunkSize = this.getMaxChunkSize()){

        if ( typeof otherPeerMaxChunkSize !== "number") throw "invalid otherPeerMaxChunkSize";
        if (otherPeerMaxChunkSize < 16*1024) throw "invalid value otherPeerMaxChunkSize";

        this.chunkSize = Math.min(otherPeerMaxChunkSize, myMaxChunkSize)
    }

    _onChannelMessageCallback(event, channel){

        if (event.type !== "message") return;
        const message = event.data;

        if (typeof Blob !== 'undefined' && message instanceof Blob){
            blobToBuffer(message, (err, buffer)=>{
                if (err) return err;

                this._processWebRTCMessage( buffer);
            })
        }
        else this._processWebRTCMessage( Buffer.from(message) );


    }

    _processWebRTCMessage(data){

        data = BufferReader.create( data );

        const chunkSize = (this.chunkSize - 10*3 );

        const id = MarshalUtils.unmarshalNumber(data);
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
            this._kademliaRules.pending.pendingAdd( 'webrtc:pending:'+this.id, id,() => delete this._chunks[id], ()=> delete this._chunks[id], KAD_OPTIONS.PLUGINS.NODE_WEBRTC.T_RESPONSE_TIMEOUT,  );
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
            this._kademliaRules.pending.pendingResolve('webrtc:pending:'+this.id, id, resolve => resolve( ) );

            this.onmessage(id, buffer);
        }

    }

    _onChannelStateChange(event, channel){
        this._readyState = channel.readyState;
        if (channel.readyState === 'open' ) this.onconnect();
        if (channel.readyState === 'close' || channel.readyState === 'closed') this.ondisconnect();
    }

    sendWebRTCWaitAnswer ( id, buffer, cb)  {

        if (this.status !== ContactConnectedStatus.CONTACT_OPEN ) //WebSocket.OPEN
            this._queue.push( {id, buffer, cb} );
        else {

            this._kademliaRules.pending.pendingAdd('webrtc:'+this.id, id, () => cb(new Error('Timeout')), cb );
            this.sendData( id, buffer)

        }

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