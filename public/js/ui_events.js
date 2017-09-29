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
    
});

