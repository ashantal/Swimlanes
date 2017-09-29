var wsTxt = '[ws]';
var getEverythingWatchdog = null;
var pendingTransaction = null;

// =================================================================================
// Socket Stuff
// =================================================================================
function connect_to_server() {
	var connected = false;
	connect();

	function connect() {
		var wsUri = null;
		if (document.location.protocol === 'https:') {
			wsTxt = '[wss]';
			wsUri = 'wss://' + document.location.hostname + ':' + document.location.port;
		} else {
			wsUri = 'ws://' + document.location.hostname + ':' + document.location.port;
		}
		console.log(wsTxt + ' Connecting to websocket', wsUri);

		ws = new WebSocket(wsUri);
		ws.onopen = function (evt) { onOpen(evt); };
		ws.onclose = function (evt) { onClose(evt); };
		ws.onmessage = function (evt) { onMessage(evt); };
		ws.onerror = function (evt) { onError(evt); };
	}

	function onOpen(evt) {
		console.log(wsTxt + ' CONNECTED');
		connected = true;
	}

	function onClose(evt) {
		console.log(wsTxt + ' DISCONNECTED', evt);
		connected = false;
		setTimeout(function () { connect(); }, 5000);					//try again one more time, server restarts are quick
	}

	function onMessage(msg) {
		console.log(wsTxt + ' MESSAGE');
		try {
			var msgObj = JSON.parse(msg.data);
			console.log(msgObj);

			if (msgObj.msg === 'everything') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				clearTimeout(getEverythingWatchdog);
				clearTimeout(pendingTransaction);
				$('#appStartingText').hide();
				build_company_panel("Swim Lanes");				
				build_state_panels(msgObj.everything.states);
				for (var i in msgObj.everything.listings) {
					populate_state_listings(msgObj.everything.listings[i]);
				}
				start_up = false;
			}else if (msgObj.msg === 'app_state') {
				console.log(wsTxt + ' rec', msgObj.msg, msgObj);
				setTimeout(function () {
					show_start_up_step(msgObj);
				}, 1000);
			}

		}
		catch (e) {
			console.log(wsTxt + ' error handling a ws message', e);
		}
	}

	function onError(evt) {
		console.log(wsTxt + ' ERROR ', evt);
	}
	
}


//get everything with timeout to get it all again!
function get_everything_or_else(attempt) {
	console.log(wsTxt + ' sending get everything msg');
	clearTimeout(getEverythingWatchdog);
	ws.send(JSON.stringify({ type: 'read_everything', v: 1 }));

	if (!attempt) attempt = 1;
	else attempt++;

	getEverythingWatchdog = setTimeout(function () {
		if (attempt <= 3) {
			console.log('\n\n! [timeout] did not get owners in time, impatiently calling it again', attempt, '\n\n');
			get_everything_or_else(attempt);
		}
		else {
			console.log('\n\n! [timeout] did not get owners in time, hopeless', attempt, '\n\n');
		}
	}, 5000 + getRandomInt(0, 10000));
}


