/* global bag, $, ws*/
/* global escapeHtml, toTitleCase, formatDate, known_companies, transfer_listing, record_state_type, show_tx_step, refreshHomePanel, auditinglisting*/
/* exported build_listing, record_state_type, build_state_panels, build_state_type_panel, build_notification, populate_states_listings*/
/* exported build_a_tx, listings */

var listings = {};
var default_state = {};
// =================================================================================
//	UI Building
// =================================================================================
//build a listing
function build_listing(listing) {
	var colorClass =listing.state.state_type+'Lane';
	var size = 'smallMarble';
	var auditing = '';

	listings[listing.id] = listing;
	listing.id = escapeHtml(listing.id);
	//if (auditinglisting && listing.id === auditinglisting.id) auditing = 'auditinglisting';
	var html = '<span id="' + listing.id + 
	'" uid="' + listing.uid + 
	'" sid="' + listing.sid + '" class="ball ' + size + ' ' + colorClass + ' ' + auditing + 
	'" state_id="' + listing.state.id + 
	'" state_type="' + listing.state.state_type + '" state_name="' + listing.state.state_name + '"></span>';
	$('.listingsWrap[state_id="' + listing.state.id + '"]').find('.innerlistingWrap').prepend(html);
	$('.listingsWrap[state_id="' + listing.state.id + '"]').find('.nolistingsMsg').hide();	
}

//redraw the state's listings
function populate_state_listings(msg) {
	//reset
	$('.listingsWrap[state_id="' + msg.state_id + '"]').find('.innerlistingWrap').html('');
	$('.listingsWrap[state_id="' + msg.state_id + '"]').find('.nolistingsMsg').show();
	for (var i in msg.listings) {
		build_listing(msg.listings[i]);
	}
}


//show query results
function populate_query_fips(msg) {
	if(msg.data!=null){
		console.log(msg.data.STATEFP);
		console.log(msg.data.COUNTYFP);
		var s = ('00' + msg.data.STATEFP).slice(-2)
		var c = ('000' + msg.data.COUNTYFP).slice(-3)
		$('input[name="county"]').val(s+c);
		$('input[name="sub-county"]').val('N');
		populate_uid();
		$('.reg').html(msg.data.COUNTYNAME +', ' + msg.data.STATE);
	}
}

function populate_uid(){
	var uid = $('input[name="country"]').val() + 
	'-' + $('input[name="county"]').val() 
	if($('input[name="parcel"]').val()!=''){ 
	uid = uid +
	'-' + $('input[name="sub-county"]').val() + 
	'-' + $('select[name="property-type"]').val() + 
	'-' + $('input[name="parcel"]').val() + 
	'-' + $('input[name="sub"]').val() 
	}
	$('.sreg').html(uid);
	return uid;   	
}


//crayp resize - dsh to do, dynamic one
function size_state_name(name) {
	return 'font-size: 12px;';
}

function build_lane_panel(lane) {
	lane = escapeHtml(lane);
	var html = `<div class="lanePanel bluebg" lane="` + lane + `">
					<div class="laneNameWrap ` + lane + `Lane">
					<span class="laneName">` + toTitleCase(lane) + `</span>`;
					if(lane=='offmarket'){
						html +=`<span id='registerProperty' class="fa fa-plus floatRight"></span>`;
					}else{
						html += '<span class="fa fa-exchange floatRight"></span>';
					}
					html += `	</div>
				<div class="ownerWrap"></div>
			</div>`;
	$('#allUserPanelsWrap').append(html);
	$('#registerProperty').click(function () {
		$('#tint').fadeIn();
		$('#createPanel').fadeIn();
	});
}
//build state panel
function build_state_panel(data){
	var html = '';
	var colorClass = '';
	data.id = escapeHtml(data.id);
	data.state_name = escapeHtml(data.state_name);
	var lane =$('.lanePanel[lane="' + data.state_type + '"]');
	if(lane.length==0){
		build_lane_panel(data.state_type);							
	}
	var state = $('.listingsWrap[state_id="' + data.id  + '"]');
	if(state.length>0){			
		state.find('.innerlistingWrap').html('');
	}else{		
		let disableHtml = '';
		html += `<div state_name="` + data.state_name + `" state_type="` + data.state_type +
			`" state_id="` + data.id + `" class="listingsWrap ` + colorClass + `">
					<div class="legend" style="` + size_state_name(data.state_name) + `">
						` + toTitleCase(data.state_name) + `
						` + disableHtml + `
					</div>
					<div class="innerlistingWrap innerMarbleWrap"></div>
					<div class="nolistingsMsg hint">No listings</div>
				</div>`;
		$('.lanePanel[lane="' + data.state_type + '"]').find('.ownerWrap').append(html);
	}	
}

//drag and drop listing
function setup_drag_drop(){
	$('.innerlistingWrap').sortable({ connectWith: '.innerlistingWrap', items: 'span' }).disableSelection();
	$('.innerlistingWrap').droppable({
		drop:
		function (event, ui) {
				var listing_id = $(ui.draggable).attr('id');
				var dragged_state_id = $(ui.draggable).attr('state_id');
				var dropped_state_id = $(event.target).parents('.listingsWrap').attr('state_id');

				console.log('dropped a listing', dragged_state_id, dropped_state_id);
				if (dragged_state_id != dropped_state_id) {										//only transfer listings that changed states
					$(ui.draggable).addClass('invalid bounce');
					transfer_listing(listing_id, dropped_state_id);
					return true;
				}
			}
	});
}

//build all state panels
function build_state_list(states) {
	for (var i in states) {
		var data = states[i];
		data.id = escapeHtml(data.id);
		data.state_name = escapeHtml(data.state_name);
		if(data.state_name=="registered"){
			default_state = data;			
		}
		var html = `<div class="targetState `+ data.state_type +`Lane " state_id="` + data.id + `">` + toTitleCase(data.state_name) + `</div>`;
		$('.stateNames').append(html);
	}
	$('.targetState').click(function () {
		$('#tint,#stateNamesPanel').fadeOut();		
		transfer_listing($('input[name="xfr_id"]').val(), $(this).attr('state_id'));
	});	
}

//show query results
function populate_query_results(msg) {
	$('#allUserPanelsWrap').html('');
	//$('.listingsWrap').find('.innerlistingWrap').html('');	
	for (var i in msg.data.parsed) {
		build_state_panel(msg.data.parsed[i].Record.state);				
	}
	setup_drag_drop();	
	for (var i in msg.data.parsed) {
		build_listing(msg.data.parsed[i].Record);
	}	
}

//build a notification msg, `error` is boolean
function build_notification(error, msg) {
	var html = '';
	var css = '';
	var iconClass = 'fa-check';
	if (error) {
		css = 'warningNotice';
		iconClass = 'fa-minus-circle';
	}

	html += `<div class="notificationWrap ` + css + `">
				<span class="fa ` + iconClass + ` notificationIcon"></span>
				<span class="noticeTime">` + formatDate(Date.now(), `%M/%d %I:%m:%s`) + `&nbsp;&nbsp;</span>
				<span>` + escapeHtml(msg) + `</span>
				<span class="fa fa-close closeNotification"></span>
			</div>`;
	return html;
}


//build a tx history div
function build_a_tx(data, pos) {
	var html = '';
	if (data && data.value) {
		html += `<div class="txDetails">
				<div class="txCount"><strong>Tx ` + (Number(pos) + 1) + '</strong> ' + data.value.sid +' <strong>'+ data.value.state.state_name + `</strong></div>
				<div class="txId">`+`</div>
			</div>`;
	}
	return html;
}

//build a tx history div
function build_a_listing(data) {
	var html = '';
	if(data.length>0){
		var o = data[0];		
		html = `<div class="txListingDetails"><div class="txListingImageWrap"/>
			<strong>`+ o['PropertyType'] +` (#`+ o['ParcelNumber'] + `)</strong> 
			<br/>
			`+ o['UnparsedAddress'] +`
			<br/>
			` +  o['StateOrProvince'] +` `+ o['CountyOrParish'] +`
			<hr/>
			`+ o['PropertySubType']  +` Built ` + o['YearBuilt'] +`
			<br/>
			Listed For $`+  o['ListPrice']+` By ` + o['ListAgentFullName'] +` ` + o['ListOfficeName'] +` 
			<hr/>
			`+ o['AssociationAmenities'] +` `+ o['Appliances'] +` `+ o['RoomBathroomFeatures'] +` `+ o['RoomBedroomFeatures'] +` `+ o['RoomDiningRoomFeatures']
			+`</div>`;
		var obj = {
			type: 'query_media',
			listing_key: o["ListingKeyNumeric"]
		}
		ws.send(JSON.stringify(obj));				   			  		
	}
	$('.txListingWrap').html(html);
	$('.txListingDetails').animate({ opacity: 1, left: 0 }, 600, function () {
		//after animate
	});
}
function build_a_media(data) {
	var html = '';
	if(data.length>0){
		var o = data[0];		
		html = `<img class="txListingImage" src="`+ o['MediaURL'] +`"/>`
	}
	$('.txListingImageWrap').html(html);
	$('.txListingImage').animate({ opacity: 1, left: 0 }, 600, function () {
		//after animate
	});
}


function build_a_block(obj) {
	var html = `<div class="txDetails">` + render_obj(obj) + `</div>`;
	$('.txHistoryWrap').html(html);
	$('.txDetails').animate({ opacity: 1, left: 0 }, 600, function () {
		//after animate
	});	
}

function render_obj(obj){
		var result = "";		
		$.each(obj, function(k, v) {
			if(v.constructor === Object || v.constructor === Array){
				result += "<strong>" + k + "</strong><div style='margin-left:10px'>" + render_obj(v) + "</div>";
			}else{
				result += "<strong>" + k + "</strong>&nbsp;" + v + "<br/>";
			}
		});		
		return result;
}

function auditMarble(id,sid,uid) {
	var obj1 = {
		type: 'query_listing',
		listing_id: sid
	};
	var obj2 = {
		type: 'audit',
		listing_id: id
	};		
	openAuditPanel(uid.toUpperCase());
	ws.send(JSON.stringify(obj1));		
	ws.send(JSON.stringify(obj2));
}

function auditBlock(block_id){
	var obj = { 
		type: 'query_block', 
		id:block_id
	}			
	openAuditPanel("Block #" + block_id);		
	ws.send(JSON.stringify(obj));			
}

function openAuditPanel(title){
	$('.txHistoryWrap').html('');
	$('.txListingWrap').html('');	
	$('#marbleId').html(title);		
	$('#auditContentWrap').fadeIn();
	$('#rightEverything').addClass('rightEverythingOpened');
	$('#leftEverything').fadeIn();
}