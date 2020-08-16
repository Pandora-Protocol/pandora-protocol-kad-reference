const NodeWebRTC = typeof BROWSER === "undefined" ? require('./node-webrtc/node-webrtc') : undefined;
const BrowserWebRTC = typeof BROWSER !== "undefined" ? require('./browser-webrtc/browser-webrtc') : undefined;

module.exports = NodeWebRTC || BrowserWebRTC;