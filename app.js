'use strict';
/* global process */
/* global __dirname */
var express = require('express');
var session = require('express-session');
var compression = require('compression');
var serve_static = require('serve-static');
var path = require('path');
var cookieParser = require('cookie-parser');
var http = require('http');
var app = express();
var cors = require('cors');
var async = require('async');
var ws = require('ws');											//websocket module 
var winston = require('winston');								//logger module

// --- Get Our Modules --- //
var logger = new (winston.Logger)({
	level: 'debug',
	transports: [
		new (winston.transports.Console)({ colorize: true }),
	]
});

var misc = require('./utils/misc.js')(logger);					//random non-blockchain related functions
misc.check_creds_for_valid_json();
var helper = require(__dirname + '/utils/helper.js')(process.env.creds_filename, logger);				//parses our blockchain config file
var fcw = require('./utils/fc_wrangler/index.js')({ block_delay: helper.getBlockDelay() }, logger);		//fabric client wrangler wraps the SDK
var ws_server = require('./utils/websocket_server_side.js')({ block_delay: helper.getBlockDelay() }, fcw, logger);	//websocket logic

// ------------- Init ------------- //
var host = 'localhost';
var port = helper.getListingsPort();
var wss = {};
var enrollObj = null;
var listings_lib = null;

// -- states --//
var start_up_states = {												//Startup Steps
	checklist: { state: 'waiting', step: 'step1' },					// Step 1 - check config files for somewhat correctness
	enrolling: { state: 'waiting', step: 'step2' },					// Step 2 - enroll the admin
	find_chaincode: { state: 'waiting', step: 'step3' },			// Step 3 - find the chaincode on the channel
	register_states: { state: 'waiting', step: 'step4' },			// Step 4 - create the listing states
};
// Message to client to communicate where we are in the start up
function build_state_msg() {
	return {
		msg: 'app_state',
		state: start_up_states,
		first_setup: process.env.app_first_setup
	};
}
// Send to all connected clients
function broadcast_state(change_state, outcome) {
	try {
		start_up_states[change_state].state = outcome;
		wss.broadcast(build_state_msg());								//tell client our app state
	} catch (e) { }														//this is expected to fail for "checking"
}

// --- setup --- //
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(compression());
app.use(cookieParser());
app.use(serve_static(path.join(__dirname, 'public')));
app.use(session({ secret: 'lostmymarbles', resave: true, saveUninitialized: true }));
app.options('*', cors());
app.use(cors());

//---------------------
// Cache Busting Hash
//---------------------
process.env.cachebust_js = Date.now();
process.env.cachebust_css = Date.now();
process.env.org = helper.getCompanyName();

logger.debug('cache busting hash js', process.env.cachebust_js, 'css', process.env.cachebust_css);


// ============================================================================================================================
// 													Webserver Routing
// ============================================================================================================================
app.use(function (req, res, next) {
	logger.debug('------------------------------------------ incoming request ------------------------------------------');
	logger.debug('New ' + req.method + ' request for', req.url);
	req.bag = {};																			//create object for my stuff
	req.bag.session = req.session;
	next();
});
app.use('/', require('./routes/site_router'));

// ------ Error Handling --------
app.use(function (req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});
app.use(function (err, req, res, next) {
	logger.debug('Errors -', req.url);
	var errorCode = err.status || 500;
	res.status(errorCode);
	req.bag.error = { msg: err.stack, status: errorCode };
	if (req.bag.error.status == 404) req.bag.error.msg = 'Sorry, I cannot locate that file';
	res.render('template/error', { bag: req.bag });
});

// ============================================================================================================================
// 														Launch Webserver
// ============================================================================================================================
var server = http.createServer(app).listen(port, function () { });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_ENV = 'production';
server.timeout = 240000;																							// Ta-da.
console.log('\n');
console.log('----------------------------------- Server Up - ' + host + ':' + port + ' -----------------------------------');
process.on('uncaughtException', function (err) {
	logger.error('Caught exception: ', err.stack);		//demos never give up
	if (err.stack.indexOf('EADDRINUSE') >= 0) {			//except for this error
		logger.warn('---------------------------------------------------------------');
		logger.warn('----------------------------- Ah! -----------------------------');
		logger.warn('---------------------------------------------------------------');
		logger.error('You already have something running on port ' + port + '!');
		logger.error('Kill whatever is running on that port OR change the port setting in your marbles config file: ' + helper.config_path);
		process.exit();
	}
});

// ------------------------------------------------------------------------------------------------------------------------------
setupWebSocket();
process.env.app_first_setup = 'yes';
let config_error = helper.checkConfig();
if (config_error) {
	broadcast_state('checklist', 'failed');			
} else {
	broadcast_state('checklist', 'success');

	enroll_admin(1, function (e) {
		if (e != null) {
			logger.warn('Error enrolling admin');
			broadcast_state('enrolling', 'failed');
			startup_unsuccessful();
		} else {
			logger.info('Success enrolling admin');
			broadcast_state('enrolling', 'success');

			setup_lib(function () {
				detect_prev_startup({ startup: true }, function (err) {
					if (err) {
						create_states(helper.getListingStates()); 	//builds states, then starts webapp
					} else {
						logger.debug('Detected that we have launched successfully before');
						logger.debug('Welcome back - Initiating start up\n\n');
					}
				});
			});
		}
	});	
}

function setupWebSocket() {
	console.log('------------------------------------------ Websocket Up ------------------------------------------');
	wss = new ws.Server({ server: server });								//start the websocket now
	wss.on('connection', function connection(ws) {
		ws.on('message', function incoming(message) {
			logger.debug('[ws] received ws msg:', message);
			var data = null;
			try {
				data = JSON.parse(message);
			}
			catch (e) {
				logger.debug('[ws] message error', message, e.stack);
			}
			if (data) {
				ws_server.process_msg(ws, data);				
			}
		});
		ws.on('error', function (e) { logger.debug('[ws] error', e); });
		ws.on('close', function () { logger.debug('[ws] closed'); });
		ws.send(JSON.stringify(build_state_msg()));							//tell client our app state
	});

	// --- Send To All Connected Clients --- //
	wss.broadcast = function broadcast(data) {
		var i = 0;
		wss.clients.forEach(function each(client) {
			try {
				logger.debug('[ws] broadcasting to clients. ', (++i), data.msg);
				client.send(JSON.stringify(data));
			}
			catch (e) {
				logger.debug('[ws] error broadcast ws', e);
			}
		});
	};
}



//1. Enroll an admin with the CA for this peer/channel
function enroll_admin(attempt, cb) {
	fcw.enroll(helper.makeEnrollmentOptions(0), function (errCode, obj) {
		if (errCode != null) {
			logger.error('could not enroll...');

			// --- Try Again ---  //
			if (attempt >= 2) {
				if (cb) cb(errCode);
			} else {
				removeKVS();
				enroll_admin(++attempt, cb);
			}
		} else {
			enrollObj = obj;
			if (cb) cb(null);
		}
	});
}

//2. setup library and check if cc is instantiated
function setup_lib(cb) {
	var opts = helper.makeListingsLibOptions();
	listings_lib = require('./utils/listings_cc_lib.js')(enrollObj, opts, fcw, logger);
	ws_server.setup(wss.broadcast, listings_lib);
	logger.debug('Checking if chaincode is already instantiated or not');
	const channel = helper.getChannelId();
	const first_peer = helper.getFirstPeerName(channel);
	var options = {
		peer_urls: [helper.getPeersUrl(first_peer)],
	};
	listings_lib.check_if_already_instantiated(options, function (not_instantiated, enrollUser) {
		if (not_instantiated) {									//if this is truthy we have not yet instantiated.... error
			console.log('');
			logger.debug('Chaincode was not detected: "' + helper.getChaincodeId() + '", all stop');
			logger.debug('Open your browser to http://' + host + ':' + port + ' and login to tweak settings for startup');
			process.env.app_first_setup = 'yes';				//overwrite state, bad startup
			broadcast_state('find_chaincode', 'failed');
		}
		else {													//else we already instantiated
			console.log('\n----------------------------- Chaincode found on channel "' + helper.getChannelId() + '" -----------------------------\n');
			listings_lib.check_version(options, function (err, resp) {
				if (helper.errorWithVersions(resp)) {
					broadcast_state('find_chaincode', 'failed');
				} else {
					logger.info('Chaincode version is good');
					broadcast_state('find_chaincode', 'success');
					if (cb) cb(null);
				}
			});
		}
	});
}


//3. Find if this app started successfully before
function detect_prev_startup(opts, cb) {
	logger.info('Checking ledger for states listed in the config file');
	listings_lib.read_everything(null, function (err, resp) {			//read the ledger for states
		if (err != null) {
			logger.warn('Error reading ledger');
			if (cb) cb(true);
		} else {
			console.log(resp);
			if (!resp.parsed.states) {						//check if each state in the settings file has been created in the ledger
				logger.info('We need to create states');			//there are states that do not exist!
				broadcast_state('register_states', 'waiting');
				if (cb) cb(true);
			} else {
				broadcast_state('register_states', 'success');			//everything is good
				process.env.app_first_setup = 'no';
				logger.info('Everything is in place');
				if (cb) cb(false);
			}
		}
	});
}

// Create states
function create_states(states) {
	logger.info('Creating states');
	if (states && states.length > 0) {
		async.each(states, function (state, cb) {
			logger.debug('- creating state: ', state);
			create_state(state, function (errCode, resp) {
				cb();
			});
		}, function (err) {
			logger.info('finished creating states');
			if (err == null) {
				 all_done();								
			}
		});
	}
	else {
		logger.debug('- there are no new states to create');
		all_done();
	}
}

// Create State
function create_state(state, cbs) {
	const channel = helper.getChannelId();
	const first_peer = helper.getFirstPeerName(channel);
	var options = {
		peer_urls: [helper.getPeersUrl(first_peer)],
		args: {
			state_type: state.state_type,
			state_name:''
		}
	};

	async.each(state.state_names, function (state_name, cb) {
		logger.debug('- creating state: ', state_name);
		options.args.state_name = state_name;
		listings_lib.register_state(options, function (e, resp) {
			if (e != null) {
				logger.error('error creating the state', e, resp);
				cb(e, resp);
			}
			else {
				cb(null, resp);
			}
		});			
	});

	cbs();
}


// Clean Up OLD KVS
function removeKVS() {
	try {
		logger.warn('removing older kvs and trying to enroll again');
		misc.rmdir(helper.getKvsPath({ going2delete: true }));			//delete old kvs folder
		logger.warn('removed older kvs');
	} catch (e) {
		logger.error('could not delete old kvs', e);
	}
}

// Wait for the user to help correct the config file so we can startup!
function startup_unsuccessful() {
	process.env.app_first_setup = 'yes';
	console.log('');
	logger.info('Detected that we have NOT launched successfully yet');
	logger.debug('Open your browser to http://' + host + ':' + port + ' and login as "admin" to initiate startup\n\n');
	// we wait here for the user to go the browser, then setup_marbles_lib() will be called from WS msg
}

// We are done, inform the clients
function all_done() {
	console.log('\n------------------------------------------ All Done ------------------------------------------\n');
	broadcast_state('register_states', 'success');
	process.env.app_first_setup = 'no';

	ws_server.check_for_updates(null);									//call the periodic task to get the state of everything
}
