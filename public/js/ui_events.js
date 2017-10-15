$(document).on('ready', function () {
	connect_to_server();
	$('#registerProperty').click(function () {
		$('#tint').fadeIn();
		$('#createPanel').fadeIn();
	});
	
	$('#createMarbleButton').click(function () {
		var id  = populate_uid();					
		var obj = {
			type: 'create',
            uid: id,
            sid: "registry",
			state_id: default_state.id,
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

	//right click opens audit on marble
	$(document).on('contextmenu', '.ball', function () {
		$('input[name="xfr_id"]').val($(this).attr('id'));
		$('#tint,#stateNamesPanel').fadeIn();
		return false;
	});

	//close create panel
	$('.fa-close').click(function () {
		$('#createPanel,#marketPanel, #tint, #infoPanel,#stateNamesPanel,#importPanel').fadeOut();
	});

	/**  
	 * Audit Listing
	*/		
	$(document).on('click', '.ball', function () {
		var state = $(this).attr('state_type');
		var id=$(this).attr('id');
		var sid=$(this).attr('sid');
		var uid=$(this).attr('uid')
		if(state=="premarket"){
			$('input[name=id]').val(id);
			$('input[name=sid]').val(sid);
			$('.market').html(uid);		
			$('#tint').fadeIn();
			$('#marketPanel').fadeIn();
		}else{
			auditMarble(id,uid);					
		}				
	});

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
		openAuditPanel('Audit');
	});

	/**
	 * Query
 	*/
	//username/company search
	$('#search').keyup(function (e) {
		if(e.keyCode==13){
			get_everything_or_else();
		}
	});

	$('#importProperty').click(function () {
		$('#tint').fadeIn();		
		query_api($('select[name="apiSource"]').val(),$('select[name="apiFunction"]').val()+"("+ $('select[name="apiField"]').val()+",'"+$('#apiFilter').val()+"')");
	});	
	$('#apiFilter').keyup(function (e) {
		if(e.keyCode==13){
			query_api($('select[name="apiSource"]').val(),$('select[name="apiFunction"]').val()+"("+ $('select[name="apiField"]').val()+",'"+$('#apiFilter').val()+"')");
		}
	});	
	$('.fa-search').click(function (e) {
		query_api($('select[name="apiSource"]').val(),$('select[name="apiFunction"]').val()+"("+ $('select[name="apiField"]').val()+",'"+$('#apiFilter').val()+"')");
	});

	//username/company search
	$('#fips').keyup(function (e) {
		query_fips($('#state').val(),$('#fips').val());
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
	
	//story mode selection
	$('.fa-toggle-off').click(function () {
		fromLS.story_mode = true;
		$('.fa-toggle-off').fadeOut(function(){
			$('.fa-toggle-on').fadeIn();			
		});
	});
	$('.fa-toggle-on').click(function () {
		fromLS.story_mode = false;
		$('.fa-toggle-on').fadeOut(function(){
			$('.fa-toggle-off').fadeIn();			
		});		
	});	
});
