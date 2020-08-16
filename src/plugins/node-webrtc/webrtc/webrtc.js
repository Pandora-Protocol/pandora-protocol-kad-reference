const BrowserWebRTC = typeof BROWSER !== "undefined" ? require('./browser-webrtc/browser-webrtc') : undefined;
const NodeWebRTC = typeof BROWSER === "undefined" ? require('./node-webrtc/node-webrtc') : undefined;

module.exports = NodeWebRTC || BrowserWebRTC;