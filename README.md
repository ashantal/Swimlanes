# About Swimlanes
This is a `very simple` listing lifecycle demonstration to aid a developer learn the basics of chaincode and app development with a Fabric network. 

# Application Background
This application demonstrates transferring a listing between many lifecycle events leveraging Hyperledger Fabric.
The backend of this application is GoLang code running in our blockchain network.

Attributes of a listing:

  1. ID (unique string, will be used as key)
  2. UPID (string, a unique key following RESO specs)
  3. Source (string, e.g. MLS#)
  4. State (the recently recorded event)

The listing gets created in the blockchain storage aka ledger as a key value pair.
The `key` is the listing id, and the `value` is a JSON string containing the attributes of the listing (listed above).
Interacting with the cc is done by using the gRPC protocol to a peer on the network.
The details of the gRPC protocol are taken care of by an SDK called [Hyperledger Fabric Client](https://www.npmjs.com/package/fabric-client) SDK.

### Application Communication Flow
1. The admin will interact with Node.js application, in their browser.
2. This client side JS code will open a websocket to the backend Node.js application. The client JS will send messages to the backend when the admin interacts with the site.
3. Reading or writing the ledger is known as a proposal. This proposal is built by Listings (via the SDK) and then sent to a blockchain peer.
4. The peer will communicate to its listings chaincode container. The chaincode will run/simulate the transaction. If there are no issues it will endorse the transaction and send it back to our application.
5. Application (via the SDK) will then send the endorsed proposal to the ordering service.  The orderer will package many proposals from the whole network into a block.  Then it will broadcast the new block to peers in the network.
6. Finally the peer will validate the block and write it to its ledger. The transaction has now taken effect and any subsequent reads will reflect this change.

### Context Clues
There are 3 distinct parts/worlds that you need to keep straight.
They should be thought of as isolated environments that communicate with each other.
This walk through will jump from one to another as we setup and explain each part.
It's important to identify which part is which.
There are certain keywords and context clues to help you identify one from another.

1. The Chaincode Part - This is GoLang code that runs on/with a peer on your blockchain network. Also, called `cc`. All listings/blockchain interactions ultimately happen here. These files live in `/chaincode`.
2. The Client Side JS Part - This is JavaScript code running in the user's browser. User interface interaction happens here. These files live in `/public/js.`
3. The Server Side JS Part - This is JavaScript code running our application's backend. ie `Node.js` code which is the heart of Listings! Sometimes referred to as our `node` or `server` code. Functions as the glue between the listing admin and our blockchain. These files live in `/utils` and `/routes`
4. You must enter valid API credential in config/api_cred_local.json to communicate with listing API.

## Setup 
- The underlying network for this application is the [Hyperledger Fabric](http://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html), a Linux Foundation project.  You must install all the prerequsites to get started with Hyperledger Fabric.Once you have the basic environment ready then Clone this repo, and follow these steps:

** warning ****
*** running this script will remove all existing containers so please remember to comment out the step if you have ohter containers running.***

1. Execute "./setupFabric.sh" This script will launch all required docker containers, create a channel and install listings chaincode.
2. Run the node app by executing "node app.js" (or use gulp or nodemon), this will launch Swim lanes app on port 3001 
3. Open browser and navigate to localhost:3001

Congratulations! you have the blockchain running.


