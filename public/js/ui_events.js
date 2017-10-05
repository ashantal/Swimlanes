$(document).on('ready', function () {
    connect_to_server();

    $(document).on('click', '.addListing', function () {
        console.log('add listing');
        $('#tint').fadeIn();
		$('#createPanel').fadeIn();
    });

	$('#createMarbleButton').click(function () {
		var id  = populate_uid();					
		var obj = {
			type: 'create',
            uid: id,
            sid: "registry",
			state_id: 's01506732319513SMUHf',
			v: 1
		};
		console.log('creating listing, sending', obj);
		$('#createPanel').fadeOut();
		$('#tint').fadeOut();

		show_tx_step({ state: 'building_proposal' }, function () {
			ws.send(JSON.stringify(obj));

			refreshHomePanel();
		});

		return false;
	});

	$('#saveMarbleButton').click(function () {
		var obj = {
			type: 'update_source',
            listing_id: $('input[name=id]').val(),
            source_id:$('input[name=sid]').val()
		};
		console.log('saving listing, sending', obj);
		$('#marketPanel').fadeOut();
		$('#tint').fadeOut();

		show_tx_step({ state: 'building_proposal' }, function () {
			ws.send(JSON.stringify(obj));
			refreshHomePanel();
		});

		return false;
	});



	//close create panel
	$('#closeCreate').click(function () {
		$('#createPanel,#savePanel, #tint, #infoPanel').fadeOut();
	});

	/**  
	 * Audit Listing
	*/		
	$(document).on('contextmenu', '.ball', function () {
		auditMarble(this,'query_listing',$(this).attr('sid'));
		return false;
	});

	$(document).on('click', '.ball', function () {
		//auditMarble(this,'audit', $(this).attr('id'));
		console.log('edit listing');
		$('input[name=id]').val($(this).attr('id'));
		$('.market').html($(this).attr('uid'));		
        $('#tint').fadeIn();
		$('#marketPanel').fadeIn();				
	});

	function auditMarble(that, type, listing_id) {
		$('.auditingMarble').removeClass('auditingMarble');

		if (!auditingMarbleId || listing_id != auditingMarbleId) {//different marble than before!
			for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
			$('.txHistoryWrap').html('');										//clear
		}
		console.log('\nuser clicked on marble', listing_id);

		$(that).addClass('auditingMarble');
		$('#auditContentWrap').fadeIn();
		$('#marbleId').html(listing_id);
		$('#rightEverything').addClass('rightEverythingOpened');
		$('#leftEverything').fadeIn();
		var obj2 = {
			type: type,
			listing_id: listing_id
		};
		ws.send(JSON.stringify(obj2));
	}

	$('#auditClose').click(function () {
		$('#auditContentWrap').slideUp(500);
		$('.auditingMarble').removeClass('auditingMarble');												//reset
		for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
		setTimeout(function () {
			$('.txHistoryWrap').html('<div class="auditHint">Click a Marble to Audit Its Transactions</div>');//clear
		}, 750);
		$('#marbleId').html('-');
		auditingMarbleId = null;

		setTimeout(function () {
			$('#rightEverything').removeClass('rightEverythingOpened');
		}, 500);
		$('#leftEverything').fadeOut();
	});

	$('#auditButton').click(function () {
		$('#auditContentWrap').fadeIn();
		$('#rightEverything').addClass('rightEverythingOpened');
		$('#leftEverything').fadeIn();
	});



/**
 * Query
 */

	//username/company search
	$('#searchUsers').keyup(function (e) {
		if(e.keyCode==13){
			var qt = $('select[name="query-type"]').val();
			var input = $('#searchUsers').val();
			query_results(qt,'$regex',input)
		}
	});

	//username/company search
	$('#fips').keyup(function (e) {
		query_fips($('#fips').val());
	});
	$('input[name="parcel"').keyup(function (e) {
		populate_uid();
	});
	$('select[name="property-type"').change(function (e) {
		console.log(this);
		if($(this).val()!='S'){
			$('input[name="sub"').val('N');
		}
		populate_uid();
	});
	$('input[name="sub"').keyup(function (e) {
		populate_uid();
	});	
});

