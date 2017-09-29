$(document).on('ready', function () {
    connect_to_server();

    $(document).on('click', '.addListing', function () {
        console.log('add listing');
        $('#tint').fadeIn();
        $('#createPanel').fadeIn();
    });

	$('#createMarbleButton').click(function () {
		console.log('creating listing');
		var id  = 
			 $('input[name="country"]').val() + 
			 '-' + $('input[name="sub-country"]').val() + 
			 '-' + $('input[name="township"]').val() + 
			 '-' + $('select[name="property-type"]').val() + 
			 '-' + $('input[name="parcel"]').val() + 
			 '-' + $('input[name="sub"]').val() 			
		
		var obj = {
			type: 'create',
            uid: id,
            sid: "registry",
			state_id: 's01506400852865zUFDm',
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

	/**  
	 * Audit Listing
	*/

	
	//right click opens audit on marble
	$(document).on('contextmenu', '.ball', function () {
		auditMarble(this, true);
		return false;
	});

	//left click audits marble
	$(document).on('click', '.ball', function () {
		auditMarble(this, false);
	});

	function auditMarble(that, open) {
		var listing_id = $(that).attr('id');
		$('.auditingMarble').removeClass('auditingMarble');

		if (!auditingMarbleId || listing_id != auditingMarbleId) {//different marble than before!
			for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
			$('.txHistoryWrap').html('');										//clear
		}
		console.log('\nuser clicked on marble', listing_id);

		if (open || $('#auditContentWrap').is(':visible')) {
			$(that).addClass('auditingMarble');
			$('#auditContentWrap').fadeIn();
			$('#marbleId').html(listing_id);
			$('#rightEverything').addClass('rightEverythingOpened');
			$('#leftEverything').fadeIn();
			var obj2 = {
				type: 'audit',
				listing_id: listing_id
			};
			ws.send(JSON.stringify(obj2));
		}
	}

	$('#auditClose').click(function () {
		$('#auditContentWrap').slideUp(500);
		$('.auditingMarble').removeClass('auditingMarble');												//reset
		for (var x in pendingTxDrawing) clearTimeout(pendingTxDrawing[x]);
		setTimeout(function () {
			$('.txHistoryWrap').html('<div class="auditHint">Click a Marble to Audit Its Transactions</div>');//clear
		}, 750);
		$('#marbleId').html('-');
		auditingMarble = null;

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





});

