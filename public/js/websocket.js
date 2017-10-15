var wsTxt = '[ws]';
var getEverythingWatchdog = null;
var pendingTransaction = null;
var auditingMarbleId = null;
var pendingTxDrawing = [];

var ws = {};
var block_ui_delay = 15000; 
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
		ws.send(JSON.stringify({ type: 'read_everything', v: 1 }));
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
			console.log(wsTxt + ' rec', msgObj.msg, msgObj);			
			if (msgObj.msg === 'everything') {
				build_state_list(msgObj.everything.states);
			}else if (msgObj.msg === 'query_block') {
			 	build_a_block(msgObj.data);
			}else if (msgObj.msg === 'query_listing') {
				build_a_listing(msgObj.data);
			}else if (msgObj.msg === 'query_api') {
				build_api_results(msgObj.data);
			}else if (msgObj.msg === 'query_media') {
				build_a_media(msgObj.data);
			}else if (msgObj.msg === 'query_results') {
				populate_query_results(msgObj);
			}else if (msgObj.msg === 'query_fips') {
				populate_query_fips(msgObj);
			}else if (msgObj.msg === 'state_listings') {
				populate_state_listings(msgObj);
			}else if (msgObj.msg === 'app_state') {
				setTimeout(function () {
					show_start_up_step(msgObj);
				}, 1000);
			}else if (msgObj.msg === 'tx_step') {
				show_tx_step(msgObj);
			}else if (msgObj.msg === 'block') {
				if (msgObj.block_delay) block_ui_delay = msgObj.block_delay * 2;
				new_block(msgObj.block_height);											
			}else if (msgObj.msg === 'history') {
				var built = 0;
				var x = 0;
				var count = $('.txDetails').length;

				for(x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
				$('.txHistoryWrap').html('');					//clear				
				if (count <= 0) {									//if no tx shown yet, append to back
					for (x=msgObj.data.parsed.length-1; x >= 0; x--) {
						built++;
						slowBuildtx(msgObj.data.parsed[x], x, built);
					}
				} else {											//if we already showing tx, prepend to front
					console.log('skipping tx', count);
					for (x=msgObj.data.parsed.length-1; x >= count; x--) {
						var html = build_a_tx(msgObj.data.parsed[x], x);
						$('.txHistoryWrap').prepend(html);
						$('.txDetails:first').animate({ opacity: 1, left: 0 }, 600, function () {
						});
					}
				}
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

function refreshHomePanel() {
	clearTimeout(pendingTransaction);
	pendingTransaction = setTimeout(function () {								//need to wait a bit
		get_everything_or_else();
	}, block_ui_delay);
}

function transfer_listing(listingId, to_state_id) {
	show_tx_step({ state: 'building_proposal' }, function () {
		var obj = {
			type: 'transfer_listing',
			listing_id: listingId,
			state_id: to_state_id,
			v: 1
		};
		console.log(wsTxt + ' sending transfer msg', obj);
		ws.send(JSON.stringify(obj));
		refreshHomePanel();
	});
}

//get everything with timeout to get it all again!
function get_everything_or_else(attempt) {
	var qt = $('select[name="query-type"]').val();
	var input = $('#search').val();	
	if(input.length == 0){
		input='[a-zA-Z]';
	}
	query_results(qt,'$regex',input);		
		/*
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
		}, 5000 + getRandomInt(0, 10000));*/
}

//get everything with timeout to get it all again!
function query_results(l, o, r, ref) {
	console.log(wsTxt + ' sending query msg' + r);
	clearTimeout(getEverythingWatchdog);
	ws.send(JSON.stringify({ type: 'query_results', left:l,op:o,right: r, ref: ref }));
}

//get everything with timeout to get it all again!
function query_fips(st,text) {
	ws.send(JSON.stringify({ type: 'query_fips',state:st, search:text }));
}
function query_api(source,filter) {
	ws.send(JSON.stringify({ type: 'query_api', source:source, filter: filter }));
}

// delay build each transaction
function slowBuildtx(data, txNumber, built){
	pendingTxDrawing.push(setTimeout(function () {
		var html = build_a_tx(data, txNumber);
		$('.txHistoryWrap').append(html);
		$('.txDetails:last').animate({ opacity: 1, left: 0 }, 400, function () {
			$(this).click(function(){
				var obj = {
					type: 'query_listing',
					listing_id: $(this).attr('sid')
				};
				ws.send(JSON.stringify(obj));																		
			});					
		});
	}, (built * 100)));
}