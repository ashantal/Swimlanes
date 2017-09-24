'use strict';
/* global process */
var express = require('express');
var router = express.Router();
var helper = require(__dirname + '/../utils/helper.js')(process.env.creds_filename, console);

//anything in here gets passed to Pug template engine
function build_bag(req) {
	return {
		e: process.error,							//send any setup errors
		creds_filename: process.env.creds_filename,
		jshash: process.env.cachebust_js,			//js cache busting hash (not important)
		csshash: process.env.cachebust_css,			//css cache busting hash (not important)
		org: process.env.org,
		creds: get_credential_data()
	};
}

//get cred data
function get_credential_data() {
	const channel = helper.getChannelId();
	const first_org = helper.getFirstOrg();
	const first_ca = helper.getFirstCaName(first_org);
	const first_peer = helper.getFirstPeerName(channel);
	const first_orderer = helper.getFirstOrdererName(channel);
	var ret = {
		admin_id: helper.getEnrollObj(first_ca, 0).enrollId,
		admin_secret: helper.getEnrollObj(first_ca, 0).enrollSecret,
		orderer: helper.getOrderersUrl(first_orderer),
		ca: helper.getCasUrl(first_ca),
		peer: helper.getPeersUrl(first_peer),
		chaincode_id: helper.getChaincodeId(),
		channel: helper.getChannelId(),
		chaincode_version: helper.getChaincodeVersion(),
		listing_states: helper.getListingStates(),
	};
	for (var i in ret) {
		if (ret[i] == null) ret[i] = '';			//set to blank if not found
	}
	return ret;
}

// ============================================================================================================================
// Root
// ============================================================================================================================
router.route('/').get(function (req, res) {
	res.redirect('/home');
});

// ============================================================================================================================
// Login
// ============================================================================================================================
router.route('/login').get(function (req, res) {
	res.render('login', { title: 'MLS Blockchain Alliance - Login', bag: build_bag(req) });
});

router.route('/login').post(function (req, res) {
	req.session.user = { username: 'Admin' };
	res.redirect('/home');
});

router.route('/logout').get(function (req, res) {
	req.session.destroy();
	res.redirect('/login');
});


// ============================================================================================================================
// Home
// ============================================================================================================================
router.route('/home').get(function (req, res) {
	route_me(req, res);
});

router.route('/create').get(function (req, res) {
	route_me(req, res);
});

function route_me(req, res) {
	if (false/* || !req.session.user || !req.session.user.username*/) {
		res.redirect('/login');
	}
	else {
		res.render('listings', { title: 'Listings - Home', bag: build_bag(req) });
	}
}

module.exports = router;