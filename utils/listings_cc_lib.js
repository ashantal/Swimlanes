//-------------------------------------------------------------------
// Listings Chaincode Library
//-------------------------------------------------------------------

module.exports = function (enrollObj, g_options, fcw, logger) {
	var listings_chaincode = {};

	// Chaincode -------------------------------------------------------------------------------

	//check if chaincode exists
	listings_chaincode.check_if_already_instantiated = function (options, cb) {
		console.log('');
		logger.info('Checking for chaincode...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: ['selftest']
		};
		fcw.query_chaincode(enrollObj, opts, function (err, resp) {
			if (err != null) {
				if (cb) return cb(err, resp);
			}
			else {
				if (resp.parsed == null || isNaN(resp.parsed)) {	 //if nothing is here, no chaincode
					if (cb) return cb({ error: 'chaincode not found' }, resp);
				}
				else {
					if (cb) return cb(null, resp);
				}
			}
		});
	};

	//check chaincode version
	listings_chaincode.check_version = function (options, cb) {
		console.log('');
		logger.info('Checking chaincode and ui compatibility...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: ['listings_ui']
		};
		fcw.query_chaincode(enrollObj, opts, function (err, resp) {
			if (err != null) {
				if (cb) return cb(err, resp);
			}
			else {
				if (resp.parsed == null) {							//if nothing is here, no chaincode
					if (cb) return cb({ error: 'chaincode not found' }, resp);
				}
				else {
					if (cb) return cb(null, resp);
				}
			}
		});
	};


	// Listings -------------------------------------------------------------------------------

	//create a listing
	listings_chaincode.create_a_listing = function (options, cb) {
		console.log('');
		logger.info('Creating a listing...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'init_listing',
			cc_args: [
				'l' + leftPad(Date.now() + randStr(5), 19),
				options.args.uid,
				options.args.sid,
				options.args.state_id
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
			if (cb) {
				if (!resp) resp = {};
				resp.id = opts.cc_args[0];			//pass listing id back
				cb(err, resp);
			}
		});
	};

	//get list of listings
	listings_chaincode.get_listing_list = function (options, cb) {
		console.log('');
		logger.info('Fetching listing index list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'compelte_listing_index',
			cc_args: [' ']
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get listing
	listings_chaincode.get_listing = function (options, cb) {
		logger.info('fetching  ' + options.listing_id + ' list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'read',
			cc_args: [options.args.listing_id]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//set listing state
	listings_chaincode.set_listing_state = function (options, cb) {
		console.log('');
		logger.info('Setting state...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'set_state',
			cc_args: [
				options.args.listing_id,
				options.args.state_id,
				options.args.auth_company
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

		//set listing state
	listings_chaincode.set_listing_source = function (options, cb) {
		console.log('');
		logger.info('Setting source...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'update_source',
			cc_args: [
				options.args.listing_id,
				options.args.source_id,
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};
	
	//delete listing
	listings_chaincode.delete_listing = function (options, cb) {
		console.log('');
		logger.info('Deleting...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'delete_listing',
			cc_args: [options.args.listing_id, options.args.auth_company],
		};
		fcw.invoke_chaincode(enrollObj, opts, cb);
	};

	//get history for key
	listings_chaincode.get_history = function (options, cb) {
		logger.info('Getting history for...', options.args);

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'getHistory',
			cc_args: [options.args.id]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get multiple listings/states by start and stop ids
	listings_chaincode.get_multiple_keys = function (options, cb) {
		logger.info('Getting between ids', options.args);

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'getListingsByRange',
			cc_args: [options.args.start_id, options.args.stop_id]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};


	// Owners -------------------------------------------------------------------------------

	//register a state/user
	listings_chaincode.register_state = function (options, cb) {
		console.log('');
		logger.info('Creating a state...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'init_state',
			cc_args: [
				's' + leftPad(Date.now() + randStr(5), 19),
				options.args.state_name,
				options.args.state_type
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
			if (cb) {
				if (!resp) resp = {};
				resp.id = opts.cc_args[0];				//pass state id back
				cb(err, resp);
			}
		});
	};

	//get a state/user
	listings_chaincode.get_state = function (options, cb) {
		var full_name = build_state_name(options.args.state_name, options.args.states_type);
		console.log('');
		logger.info('Fetching state ' + full_username + ' list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: [full_name]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	//get the state list
	listings_chaincode.get_state_list = function (options, cb) {
		console.log('');
		logger.info('Fetching state index list...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			cc_function: 'read',
			cc_args: ['_stateindex']
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	// disable a listing state
	listings_chaincode.disable_state = function (options, cb) {
		console.log('');
		logger.info('Disabling an state...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_id: g_options.chaincode_id,
			chaincode_version: g_options.chaincode_version,
			event_url: g_options.event_url,
			endorsed_hook: options.endorsed_hook,
			ordered_hook: options.ordered_hook,
			cc_function: 'disable_state',
			cc_args: [
				options.args.state_id,
				options.args.auth_company
			],
		};
		fcw.invoke_chaincode(enrollObj, opts, function (err, resp) {
			if (cb) {
				if (!resp) resp = {};
				resp.id = opts.cc_args[0];				//pass state id back
				cb(err, resp);
			}
		});
	};

	//build full name
	listings_chaincode.build_state_name = function (username, company) {
		return build_state_name(username, company);
	};


	// All ---------------------------------------------------------------------------------

	//build full name
	listings_chaincode.read_everything = function (options, cb) {
		console.log('');
		logger.info('Fetching EVERYTHING...');

		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'read_everything',
			cc_args: ['']
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	listings_chaincode.query_results = function (options, cb) {
		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts,
			channel_id: g_options.channel_id,
			chaincode_version: g_options.chaincode_version,
			chaincode_id: g_options.chaincode_id,
			cc_function: 'query',
			cc_args: ["{\"selector\": {\""+options.args.left +"\": {\""+options.args.op+"\": \""+ options.args.right + "\"}}}"]
		};
		fcw.query_chaincode(enrollObj, opts, cb);
	};

	// get block height of the channel
	listings_chaincode.channel_stats = function (options, cb) {
		var opts = {
			peer_urls: g_options.peer_urls,
			peer_tls_opts: g_options.peer_tls_opts
		};
		fcw.query_channel(enrollObj, opts, cb);
	};


	listings_chaincode.query_block = function (id,cb) {
		fcw.query_block(enrollObj, {
			block_id:id,
		}, function(err,obj){
			cb(err,obj);
		});		
	}

	listings_chaincode.query_tx = function (id,cb) {
		fcw.query_tx(enrollObj, {
			tx_id:id,
		}, function(err,obj){
			cb(err,obj);
		});		
	}




	// Other -------------------------------------------------------------------------------

	// Format Owner's Actual Key Name
	function build_state_name(username, company) {
		return username.toLowerCase() + '.' + company;
	}

	// random string of x length
	function randStr(length) {
		var text = '';
		var possible = 'abcdefghijkmnpqrstuvwxyz0123456789ABCDEFGHJKMNPQRSTUVWXYZ';
		for (var i = 0; i < length; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	}

	// left pad string with "0"s
	function leftPad(str, length) {
		for (var i = str.length; i < length; i++) str = '0' + String(str);
		return str;
	}

	return listings_chaincode;
};

