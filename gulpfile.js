var path = require('path');
var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var cleanCSS = require('gulp-clean-css');
var rename = require('gulp-rename');
var spawn = require('child_process').spawn;
var node, env = process.env;

// -------------------- Run -------------------- //
gulp.task('server', function (a, b) {
	if (node) node.kill();
	node = spawn('node', ['app.js'], { env: env, stdio: 'inherit' });	//command, file, options
});

// -------------- Watch for File Changes --------------- //
gulp.task('watch-server', function () {
	gulp.watch(path.join(__dirname, '/routes/**/*.js'), ['server']);
	gulp.watch([path.join(__dirname, '/utils/fc_wrangler/*.js')], ['server']);
	gulp.watch([path.join(__dirname, '/utils/*.js')], ['server']);
	gulp.watch(path.join(__dirname, '/app.js'), ['server']);
});

// ---------------- Runnable Gulp Tasks ---------------- //
gulp.task('default', ['watch-server', 'server']);

// Local Fabric via Docker Compose
gulp.task('env_local', function () {
	env['creds_filename'] = 'marbles_local.json';
});