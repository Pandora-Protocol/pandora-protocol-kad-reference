# Pandora Protocol - Kademlia Reference

### Installation

``` 
git clone https://github.com/Pandora-Protocol/pandora-protocol-kad-reference

cd pandora-protocol-kad-reference
npm install
```

download, and install the other repositories
```
npm link pandora-protocol-red-black-tree-js ;
npm link pandora-protocol-eccrypto ;
npm link webpack-config ;
```

### INFO

Kademlia is a Distributed Hash Table.

Protocol messages
Kademlia has four messages.

`PING` — used to verify that a node is still alive.

`STORE` — Stores a (key, value) pair in one node.

`FIND_NODE` — The recipient of the request will return the k nodes in his own buckets that are the closest ones to the requested key.

`FIND_VALUE` — Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding value.

### Implementation
The reason it is pure JS is to make it low-latency. Promises and Async slow down the requests.


### Plugins

1. **Sorted Lists**. It allows kademlia nodes to store a Sorted List using `Red Black Tree`.
   
   This plugins extends Kademlia protocol with:
   
    `STORE_SORTED_LIST_VALUE` - Stores a (key, value, score) pair in one node.
    `FIND_SORTED_LIST` — Same as FIND_NODE, but if the recipient of the request has the requested key in its store, it will return the corresponding stored_list.

    Complexities:
   
    `Space`: O(n)
    
    `Search`: O(log N)
    
    `Delete`: O(log N)
    
    `Insert`: O(log N)
    
    `List`: O(N)
    
2. **Mock**. It is a node interface implementation for testing on the same node instance.

3. **HTTP**. It is a node interface implementation using HTTP. Pure `http` and `https` had been used.

4. **WebSocket**. It is a node interface implementation using HTTP WebSocket. Pur isomorphic `websocket` had been used. 
        
5. **Contact Encrypted**. It allows kademlia nodes to encrypt the messages exchanged between peers Elliptic Curves.

    It uses Encrypt and decrypt messages between sender and receiver using elliptic curve Diffie-Hellman key exchange. 
    
6. **Contact Spartacus**. Well-known defense against Sybill attacks by introducing cryptographic identies using ECDSA. With Spartacus, nodes are required to prove that they own their identity by signing messages with their private EC key and including their public key in the message. The identity is thus derived from the EC public key.   
              


## DISCLAIMER: 

This source code is released for educational and research purposes only, with the intent of researching and studying a decentralized p2p protocol for binary data streams.

**PANDORA PROTOCOL IS AN OPEN SOURCE COMMUNITY DRIVEN RESEARCH PROJECT. THIS IS RESEARCH CODE PROVIDED TO YOU "AS IS" WITH NO WARRANTIES OF CORRECTNESS. IN NO EVENT SHALL THE CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES. USE AT YOUR OWN RISK.**

**You may not use this source code for any illegal or unethical purpose; including activities which would give rise to criminal or civil liability.**

**Under no event shall the Licensor be responsible for the activities, or any misdeeds, conducted by the Licensee.**
