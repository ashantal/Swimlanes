/* global bag, $, ws*/
/* global escapeHtml, toTitleCase, formatDate, known_companies, transfer_listing, record_state_type, show_tx_step, refreshHomePanel, auditinglisting*/
/* exported build_listing, record_state_type, build_state_panels, build_state_type_panel, build_notification, populate_states_listings*/
/* exported build_a_tx, listings */

var listings = {};

// =================================================================================
//	UI Building
// =================================================================================
//build a listing
function build_listing(listing) {
	var colorClass = 'whitebg';
	var size = 'smallMarble';
	var auditing = '';

	listings[listing.id] = listing;
	listing.id = escapeHtml(listing.id);
	console.log('[ui] building : ', listing);
	//if (auditinglisting && listing.id === auditinglisting.id) auditing = 'auditinglisting';
	var html = '<span id="' + listing.id + '" class="ball ' + size + ' ' + colorClass + ' ' + auditing + ' title="' + listing.id + '" state_id="' + listing.state.id + '"></span>';

	$('.listingsWrap[state_id="' + listing.state.id + '"]').find('.innerlistingWrap').prepend(html);
	$('.listingsWrap[state_id="' + listing.state.id + '"]').find('.nolistingsMsg').hide();
	
	return html;
}

//redraw the state's listings
function populate_state_listings(msg) {
	//reset
	console.log('[ui] clearing listings for state ');
	$('.listingsWrap[state_id="' + msg.state_id + '"]').find('.innerlistingWrap').html('');
	$('.listingsWrap[state_id="' + msg.state_id + '"]').find('.nolistingsMsg').show();
	console.log(msg);
	for (var i in msg.listings) {
		build_listing(msg.listings[i]);
	}
}

//crayp resize - dsh to do, dynamic one
function size_state_name(name) {
	return 'font-size: 12px;';
}

function build_company_panel(company) {
	company = escapeHtml(company);
	console.log('[ui] building company panel ' + company);

	var mycss = '';
	if (company === escapeHtml(bag.marble_company)) mycss = 'myCompany';

	var html = `<div class="companyPanel bluebg" style="width:22%;margin:5px;height:1200px;overflow:hiddel;float:left" company="` + company + `">
					<div class="companyNameWrap ` + mycss + `">
					<span class="companyName">` + toTitleCase(company) + `</span>`;
	if (company === escapeHtml(bag.marble_company)) {
		html += '<span class="fa fa-exchange floatRight"></span>';
	} else {
		html += '<span class="fa fa-long-arrow-left floatRight"></span>';
	}
	html += `	</div>
				<div class="ownerWrap"></div>
			</div>`;
	$('#allUserPanelsWrap').append(html);
}

//build all state panels
function build_state_panels(data) {
	//reset
	console.log('[ui] clearing all state panels');
	
	$('.stateWrap').html('');
	for (var i in data) {
		var html = '';
		var colorClass = '';
		data[i].id = escapeHtml(data[i].id);
		data[i].state_name = escapeHtml(data[i].state_name);
		var lane =$('.companyPanel[company="' + data[i].state_type + '"]');
		if(lane.length==0){
			build_company_panel(data[i].state_type);							
		}
		var state = $('.listingsWrap[state_id="' + data[i].id  + '"]');
		if(state.length>0){			
			state.find('.innerlistingWrap').html('');
		}else{		
			let disableHtml = '';
			html += `<div id="state` + i + `wrap" state_name="` + data[i].state_name + `" state_type="` + data[i].state_type +
				`" state_id="` + data[i].id + `" class="listingsWrap ` + colorClass + `">
						<div class="legend" style="` + size_state_name(data[i].state_name) + `">
							` + toTitleCase(data[i].state_name) + `
							` + disableHtml + `
						</div>
						<div class="innerlistingWrap innerMarbleWrap"></div>
						<div class="nolistingsMsg hint">No listings</div>
					</div>`;
			$('.companyPanel[company="' + data[i].state_type + '"]').find('.ownerWrap').append(html);
		}
	}

	//drag and drop listing
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

	//state count
	$('#foundstates').html(data.length);
	$('#totalstates').html(data.length);
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
	var state_name = '-';
	var state_type = '-';
	var id = '-';
	var pid = '-'
	if (data && data.value && data.value.state && data.value.state.state_name) {
		state_name = data.value.state.state_name;
		state_type = data.value.state.state_type;
		uid = data.value.uid;
	}

	html += `<div class="txDetails">
				<div class="txCount">TX ` + (Number(pos) + 1) + `</div>
				<p>
					<div class="listingName txId">` + data.txId.substring(0, 20) + `...</div>
				</p>
				<p>
					<div class="listingName txId">` + uid +`</div>
				</p>
				<p>
					<div class="listingName">` + state_name + `-` + state_type + `</div>
				</p>
			</div>`;
	return html;
}
