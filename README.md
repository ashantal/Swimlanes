# Demo

## About 
- The underlying network for this application is the [Hyperledger Fabric](https://github.com/hyperledger/fabric/tree/master/docs), a Linux Foundation project.  You may want to review these instructions to understand a bit about the Hyperledger Fabric.
- **This demo is to aid a developer learn the basics of chaincode and app development with a Fabric network.**
- This is a `very simple` listing lifecycle demonstration. 
***

# Application Background

Hold on to your hats everyone, this application is going to demonstrate transferring a listing between many lifecycle events leveraging Hyperledger Fabric.
We are going to do this in Node.js and a bit of GoLang.
The backend of this application will be the GoLang code running in our blockchain network.
From here on out the GoLang code will be referred to as 'chaincode' or 'cc'.
The chaincode itself will create a marble by storing it to the chaincode state.
The chaincode itself can store data as a string in a key/value pair setup.
Thus, we will stringify JSON objects to store more complex structures.

Attributes of a listing:

  1. id (unique string, will be used as key)
  2. UId (string, a unique key following RESO specs)
  3. SourceId (string, e.g. MLS#)
  4. event (string, the recently recorded event)

We are going to create a Web based UI that can set these values and store them in our blockchain.
The marble gets created in the blockchain storage aka ledger as a key value pair.
The `key` is the marble id, and the `value` is a JSON string containing the attributes of the marble (listed above).
Interacting with the cc is done by using the gRPC protocol to a peer on the network.
The details of the gRPC protocol are taken care of by an SDK called [Hyperledger Fabric Client](https://www.npmjs.com/package/fabric-client) SDK.

### Application Communication Flow
![](/doc_images/comm_flow.png)

1. The admin will interact with listings, our Node.js application, in their browser.
1. This client side JS code will open a websocket to the backend Node.js application. The client JS will send messages to the backend when the admin interacts with the site.
1. Reading or writing the ledger is known as a proposal. This proposal is built by Marbles (via the SDK) and then sent to a blockchain peer.
1. The peer will communicate to its listings chaincode container. The chaincode will run/simulate the transaction. If there are no issues it will endorse the transaction and send it back to our application.
1. Application (via the SDK) will then send the endorsed proposal to the ordering service.  The orderer will package many proposals from the whole network into a block.  Then it will broadcast the new block to peers in the network.
1. Finally the peer will validate the block and write it to its ledger. The transaction has now taken effect and any subsequent reads will reflect this change.

### Context Clues
There are 3 distinct parts/worlds that you need to keep straight.
They should be thought of as isolated environments that communicate with each other.
This walk through will jump from one to another as we setup and explain each part.
It's important to identify which part is which.
There are certain keywords and context clues to help you identify one from another.

1. The Chaincode Part - This is GoLang code that runs on/with a peer on your blockchain network. Also, called `cc`. All marbles/blockchain interactions ultimately happen here. These files live in `/chaincode`.
2. The Client Side JS Part - This is JavaScript code running in the user's browser. User interface interaction happens here. These files live in `/public/js.`
3. The Server Side JS Part - This is JavaScript code running our application's backend. ie `Node.js` code which is the heart of Marbles! Sometimes referred to as our `node` or `server` code. Functions as the glue between the marble admin and our blockchain. These files live in `/utils` and `/routes`.

Remember these 3 parts are isolated from each other.
They do not share variables nor functions.
They will communicate via a networking protocol such as gRPC or WebSockets.
***
