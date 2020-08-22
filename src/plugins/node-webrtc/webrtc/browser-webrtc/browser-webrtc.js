module.exports = {
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API#Connection_setup_and_management
    RTCPeerConnection: window.RTCPeerConnection,
    RTCDataChannel: window.RTCDataChannel,
    RTCDataChannelEvent: window.RTCDataChannelEvent,
    RTCSessionDescription: window.RTCSessionDescription,
    RTCSessionDescriptionCallback: window.RTCSessionDescriptionCallback,
    RTCStatsReport: window.RTCStatsReport,
    RTCIceCandidate: window.RTCIceCandidate,
    RTCIceTransport: window.RTCIceTransport,
    RTCIceServer: window.RTCIceServer,
    RTCPeerConnectionIceEvent: window.RTCPeerConnectionIceEvent,
    RTCRtpSender: window.RTCRtpSender,
    RTCRtpReceiver: window.RTCRtpReceiver,
    RTCRtpContributingSource: window.RTCRtpContributingSource,
    RTCTrackEvent: window.RTCTrackEvent,
    RTCConfiguration: window.RTCConfiguration,
    RTCSctpTransport: window.RTCSctpTransport,
    RTCSctpTransportState: window.RTCSctpTransportState,

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API#Identity_and_security
    RTCIdentityProvider: window.RTCIdentityProvider,
    RTCIdentityAssertion: window.RTCIdentityAssertion,
    RTCIdentityProviderRegistrar: window.RTCIdentityProviderRegistrar,
    RTCIdentityEvent: window.RTCIdentityEvent,
    RTCIdentityErrorEvent: window.RTCIdentityErrorEvent,
    RTCCertificate: window.RTCCertificate,

    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API#Telephony
    RTCDTMFSender: window.RTCDTMFSender,
    RTCDTMFToneChangeEvent: window.RTCDTMFToneChangeEvent,

    // others self-defined objects
    mediaDevices: navigator.mediaDevices
}