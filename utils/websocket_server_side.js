// ==================================
// Websocket Server Side Code 
// ==================================
//var async = require('async');
var path = require('path');

module.exports = function (g_options, fcw, logger) {
	var helper = require(path.join(__dirname, './helper.js'))(process.env.creds_filename, logger);
	var ws_server = {};
	var broadcast = null;
	var known_everything = {};
	var listings_lib = null;
	var known_height = 0;
	var checkPeriodically = null;
	var enrollInterval = null;

	//--------------------------------------------------------
	// Setup WS Module
	//--------------------------------------------------------
	ws_server.setup = function (l_broadcast, l_listings_lib) {
		broadcast = l_broadcast;
		listings_lib = l_listings_lib;

		// --- Keep Alive  --- //
		clearInterval(enrollInterval);
		enrollInterval = setInterval(function () {					//to avoid REQUEST_TIMEOUT errors we periodically re-enroll
			let enroll_options = helper.makeEnrollmentOptions(0);
			fcw.enroll(enroll_options, function (err, enrollObj2) {
				if (err == null) {
					//listings_lib = require(path.join(__dirname, './listings_cc_lib.js'))(enrollObj2, opts, fcw, logger);
				}
			});														//this seems to be safe 3/27/2017
		}, helper.getKeepAliveMs());								//timeout happens at 5 minutes, so this interval should be faster than that
	};


	// process web socket messages
	ws_server.process_msg = function (ws, data) {
		const channel = helper.getChannelId();
		const first_peer = helper.getFirstPeerName(channel);
		var options = {
			peer_urls: [helper.getPeersUrl(first_peer)],
			ws: ws,
			endorsed_hook: endorse_hook,
			ordered_hook: orderer_hook
		};
		if (listings_lib === null) {
			logger.error('listing lib is null...');				//can't run in this state
			return;
		}


		// create a new listing
		if (data.type === 'create') {
			logger.info('[ws] create listing req');
			options.args = {
				uid: data.uid,
				sid: data.sid,
				state_id: data.state_id
			};

			listings_lib.create_a_listing(options, function (err, resp) {
				if (err != null) send_err(err, data);
				else options.ws.send(JSON.stringify({ msg: 'tx_step', state: 'finished' }));
			});
		}

		// transfer a listing
		else if (data.type === 'transfer_listing') {
			logger.info('[ws] transferring req');
			options.args = {
				listing_id: data.listing_id,
				state_id: data.state_id,
				auth_company: "process.env.listing_company"
			};

			listings_lib.set_listing_state(options, function (err, resp) {
				if (err != null) send_err(err, data);
				else options.ws.send(JSON.stringify({ msg: 'tx_step', state: 'finished' }));
			});
		}

		// delete listing
		else if (data.type === 'delete_listing') {
			logger.info('[ws] delete listing req');
			options.args = {
				listing_id: data.id,
				auth_company: process.env.listing_company
			};

			listings_lib.delete_listing(options, function (err, resp) {
				if (err != null) send_err(err, data);
				else options.ws.send(JSON.stringify({ msg: 'tx_step', state: 'finished' }));
			});
		}

		// get all states, listings, & companies
		else if (data.type === 'read_everything') {
			logger.info('[ws] read everything req');
			ws_server.check_for_updates(ws);
		}

		// get history of listing
		else if (data.type === 'audit') {
			if (data.listing_id) {
				logger.info('[ws] audit history');
				options.args = {
					id: data.listing_id,
				};
				listings_lib.get_history(options, function (err, resp) {
					if (err != null) send_err(err, resp);
					else options.ws.send(JSON.stringify({ msg: 'history', data: resp }));
				});
			}
		}

		// disable listing state
		else if (data.type === 'disable_state') {
			if (data.state_id) {
				logger.info('[ws] disable state');
				options.args = {
					state_id: data.state_id,
					auth_company: process.env.listing_company
				};
				listings_lib.disable_state(options, function (err, resp) {
					if (err != null) send_err(err, resp);
					else options.ws.send(JSON.stringify({ msg: 'tx_step', state: 'finished' }));
				});
			}
		}

		// send transaction error msg 
		function send_err(msg, input) {
			sendMsg({ msg: 'tx_error', e: msg, input: input });
			sendMsg({ msg: 'tx_step', state: 'committing_failed' });
		}

		// send a message, socket might be closed...
		function sendMsg(json) {
			if (ws) {
				try {
					ws.send(JSON.stringify(json));
				}
				catch (e) {
					logger.debug('[ws error] could not send msg', e);
				}
			}
		}

		// endorsement stage callback
		function endorse_hook(err) {
			if (err) sendMsg({ msg: 'tx_step', state: 'endorsing_failed' });
			else sendMsg({ msg: 'tx_step', state: 'ordering' });
		}

		// ordering stage callback
		function orderer_hook(err) {
			if (err) sendMsg({ msg: 'tx_step', state: 'ordering_failed' });
			else sendMsg({ msg: 'tx_step', state: 'committing' });
		}
	};

	//------------------------------------------------------------------------------------------

	// sch next periodic check
	function sch_next_check() {
		clearTimeout(checkPeriodically);
		checkPeriodically = setTimeout(function () {
			try {
				ws_server.check_for_updates(null);
			}
			catch (e) {
				console.log('');
				logger.error('Error in sch next check\n\n', e);
				sch_next_check();
				ws_server.check_for_updates(null);
			}
		}, g_options.block_delay + 2000);
	}

	// --------------------------------------------------------
	// Check for Updates to Ledger
	// --------------------------------------------------------
	ws_server.check_for_updates = function (ws_client) {
		listings_lib.channel_stats(null, function (err, resp) {
			var newBlock = false;
			if (err != null) {
				var eObj = {
					msg: 'error',
					e: err,
				};
				if (ws_client) ws_client.send(JSON.stringify(eObj)); 								//send to a client
				else broadcast(eObj);																//send to all clients
			} else {
				if (resp && resp.height && resp.height.low) {
					if (resp.height.low > known_height || ws_client) {
						if (!ws_client) {
							console.log('');
							logger.info('New block detected!', resp.height.low, resp);
							known_height = resp.height.low;
							newBlock = true;
							logger.debug('[checking] there are new things, sending to all clients');
							broadcast({ msg: 'block', e: null, block_height: resp.height.low });	//send to all clients
						} else {
							logger.debug('[checking] on demand req, sending to a client');
							var obj = {
								msg: 'block',
								e: null,
								block_height: resp.height.low,
								block_delay: g_options.block_delay
							};
							ws_client.send(JSON.stringify(obj)); 									//send to a client
						}
					}
				}
			}

			if (newBlock || ws_client) {
				read_everything(ws_client, function () {
					sch_next_check();						//check again
				});
			} else {
				sch_next_check();							//check again
			}
		});
	};

	// read complete state of listing world
	function read_everything(ws_client, cb) {
		const channel = helper.getChannelId();
		const first_peer = helper.getFirstPeerName(channel);
		var options = {
			peer_urls: [helper.getPeersUrl(first_peer)],
		};

		listings_lib.read_everything(options, function (err, resp) {
			if (err != null) {
				console.log('');
				logger.debug('[checking] could not get everything:', err);
				var obj = {
					msg: 'error',
					e: err,
				};
				if (ws_client) ws_client.send(JSON.stringify(obj)); 								//send to a client
				else broadcast(obj);																//send to all clients
				if (cb) cb();
			}
			else {
				var data = resp.parsed;
				if (data && data.states && data.listings) {
					console.log('');
					logger.debug('[checking] number of states:', data.states.length);
					logger.debug('[checking] number of listings:', data.listings.length);
				}

				data.states = organize_states(data.states);
				data.listings = organize_listings(data.listings);
				var knownAsString = JSON.stringify(known_everything);			//stringify for easy comparison (order should stay the same)
				var latestListAsString = JSON.stringify(data);

				if (knownAsString === latestListAsString) {
					logger.debug('[checking] same everything as last time');
					if (ws_client !== null) {									//if this is answering a clients req, send to 1 client
						logger.debug('[checking] sending to 1 client');
						ws_client.send(JSON.stringify({ msg: 'everything', e: err, everything: data }));
					}
				}
				else {															//detected new things, send it out
					logger.debug('[checking] there are new things, sending to all clients');
					known_everything = data;
					broadcast({ msg: 'everything', e: err, everything: data });	//sent to all clients
				}
				if (cb) cb();
			}
		});
	}

	// organize the listing state list
	function organize_states(data) {
		var stateList = [];
		for (var i in data) {						//lets reformat it a bit, only need 1 peer's response
			var temp = {
				id: data[i].id,
				state_name: data[i].state_name,
				state_type: data[i].state_type
			};
			stateList.push(temp);				//everyone else
		}
		return stateList;
	}

	//
	function organize_listings(allListings) {
		var ret = {};
		for (var i in allListings) {
			if (!ret[allListings[i].state.state_type]) {
				ret[allListings[i].state.state_type] = {
					state_id: allListings[i].state.id,
					state_name: allListings[i].state.state_name,
					state_type: allListings[i].state.state_type,
					listings: []
				};
			}
			ret[allListings[i].state.state_type].listings.push(allListings[i]);
		}
		return ret;
	}
	
	return ws_server;
};
