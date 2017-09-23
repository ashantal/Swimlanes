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
var port = helper.getMarblesPort();
var wss = {};

// --- Module Setup --- //
app.options('*', cors());
app.use(cors());

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
// Life Starts Here!
// ------------------------------------------------------------------------------------------------------------------------------
process.env.app_first_setup = 'yes';				//init
let config_error = helper.checkConfig();
setupWebSocket();

if (config_error) {
	broadcast_state('checklist', 'failed');			//checklist step is done
} else {
	broadcast_state('checklist', 'success');		//checklist step is done
	console.log('\n');
	logger.info('Using settings in ' + process.env.creds_filename + ' to see if we have launch marbles before...');
}

// ============================================================================================================================
// 												WebSocket Communication Madness
// ============================================================================================================================
function setupWebSocket() {
	console.log('------------------------------------------ Websocket Up ------------------------------------------');
	wss = new ws.Server({ server: server });								//start the websocket now
	wss.on('connection', function connection(ws) {
		ws.on('message', function incoming(message) {
			console.log(' ');
			console.log('-------------------------------- Incoming WS Msg --------------------------------');
			logger.debug('[ws] received ws msg:', message);
			var data = null;
			try {
				data = JSON.parse(message);
			}
			catch (e) {
				logger.debug('[ws] message error', message, e.stack);
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
