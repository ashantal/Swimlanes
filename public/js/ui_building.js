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
	var html = '';
	var colorClass = 'bluebg';
	var size = 'smalllisting';
	var auditing = '';

	listings[listing.id] = listing;
	listing.id = escapeHtml(listing.id);

	console.log('[ui] building : ', listing.id);
	if (auditinglisting && listing.id === auditinglisting.id) auditing = 'auditinglisting';

	html += '<span id="' + listing.id + '" class="ball ' + size + ' ' + colorClass + ' ' + auditing + ' title="' + listing.id + '"';
	html += ' state_name="' + listing.state.statename + '" state_type="' + listing.state.state_type + '" state_id="' + listing.state.id + '"></span>';

	$('.listingsWrap[state_id="' + listing.state.id + '"]').find('.innerlistingWrap').prepend(html);
	$('.listingsWrap[state_id="' + listing.state.id + '"]').find('.nolistingsMsg').hide();
	
	return html;
}

//redraw the state's listings
function populate_states_listings(msg) {

	//reset
	console.log('[ui] clearing listings for state ' + msg.id);
	$('.listingsWrap[state_id="' + msg.id + '"]').find('.innerlistingWrap').html('<i class="fa fa-plus addlisting"></i>');
	$('.listingsWrap[state_id="' + msg.state_id + '"]').find('.nolistingsMsg').show();

	for (var i in msg.listings) {
		build_listing(msg.listings[i]);
	}
}

//crayp resize - dsh to do, dynamic one
function size_state_name(name) {
	var style = '';
	if (name.length >= 10) style = 'font-size: 22px;';
	if (name.length >= 15) style = 'font-size: 18px;';
	if (name.length >= 20) style = 'font-size: 15px;';
	if (name.length >= 25) style = 'font-size: 11px;';
	return style;
}

function build_company_panel(company) {
	company = escapeHtml(company);
	console.log('[ui] building company panel ' + company);

	var mycss = '';
	if (company === escapeHtml(bag.marble_company)) mycss = 'myCompany';

	var html = `<div class="companyPanel" company="` + company + `">
					<div class="companyNameWrap ` + mycss + `">
					<span class="companyName">` + company + `&nbsp;-&nbsp;</span>
					<span class="companyVisible">0</span>/<span class="companyCount">0</span>`;
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
		console.log('[ui] building state panel ' + data[i].id);

		let disableHtml = '';
		html += `<div id="state` + i + `wrap" state_name="` + data[i].state_name + `" state_type="` + data[i].state_type +
			`" state_id="` + data[i].id + `" class="listingsWrap ` + colorClass + `">
					<div class="legend" style="` + size_state_name(data[i].state_name) + `">
						` + toTitleCase(data[i].state_name) + `
						<span class="fa fa-thumb-tack listingsFix" title="Never Hide state"></span>
						` + disableHtml + `
					</div>
					<div class="innerlistingWrap"><i class="fa fa-plus addlisting"></i></div>
					<div class="nolistingsMsg hint">No listings</div>
				</div>`;

		$('.companyPanel[company="' + data[i].company + '"]').find('.ownerWrap').append(html);
	}

	//drag and drop listing
	$('.innerlistingWrap').sortable({ connectWith: '.innerlistingWrap', items: 'span' }).disableSelection();
	$('.innerlistingWrap').droppable({
		drop:
		function (event, ui) {
			var listing_id = $(ui.draggable).attr('id');

			//  ------------ Delete listing ------------ //
			if ($(event.target).attr('id') === 'trashbin') {
				console.log('removing listing', listing_id);
				show_tx_step({ state: 'building_proposal' }, function () {
					var obj = {
						type: 'delete_listing',
						id: listing_id,
						v: 1
					};
					ws.send(JSON.stringify(obj));
					$(ui.draggable).addClass('invalid bounce');
					refreshHomePanel();
				});
			}

			//  ------------ Transfer listing ------------ //
			else {
				var dragged_state_id = $(ui.draggable).attr('state_id');
				var dropped_state_id = $(event.target).parents('.listingsWrap').attr('state_id');

				console.log('dropped a listing', dragged_state_id, dropped_state_id);
				if (dragged_state_id != dropped_state_id) {										//only transfer listings that changed states
					$(ui.draggable).addClass('invalid bounce');
					transfer_listing(listing_id, dropped_state_id);
					return true;
				}
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
		id = data.value.state.id;
		pid = data.value.color;
	}

	html += `<div class="txDetails">
				<div class="txCount">TX ` + (Number(pos) + 1) + `</div>
				<p>
					<div class="listingLegend">Transaction: </div>
					<div class="listingName txId">` + data.txId.substring(0, 14) + `...</div>
				</p>
				<p>
					<div class="listingLegend">Id: </div>
					<div class="listingName txId">` + pid +`</div>
				</p>
				<p>
					<div class="listingLegend">Event: </div>
					<div class="listingName">` + state_name + `</div>
				</p>
			</div>`;
	return html;
}
