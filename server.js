
/*
var cluster = require('cluster');

if (cluster.isMaster) {
  var numCPUs = require('os').cpus().length;

  for (var i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', function() {
    console.log('A worker process died, restarting...');
    cluster.fork();
  });
} else {
*/

	var express = require('express');
	var app = express();
	var port = process.env.PORT || 3000;
	var compress = require('compression');

	var cookieParser = require('cookie-parser');
	var session = require('express-session');
	var morgan = require('morgan');
	var mongoose = require('mongoose');
	var bodyParser = require('body-parser');
	var passport = require('passport');
	var flash = require('connect-flash');
	var fs = require('fs');
	var http = require('http');
  var helmet = require('helmet');

	var configDB = require('./config/database.js');
	mongoose.connect(configDB.url);
	require('./config/passport')(passport);
	//static files for client
	app.use(compress());
	app.use(express.static(__dirname + "/public"));

  //Helmet helps you secure your Express apps by setting various HTTP headers
  app.use(helmet());
	app.use(morgan('dev'));
	app.use(cookieParser());
	app.use(bodyParser.urlencoded({extended: false}));
	app.use(session({secret: 'secret',
					 saveUninitialized: true,
					 resave: true}));

	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	app.use(flash()); // use connect-flash for flash messages stored in session

	app.use('/data', express.static('data'));//For Default image

	app.set('view engine', 'ejs');

	require('./app/routes.js')(app, passport);

	app.listen(port);
	console.log('Server running on port: ' + port);

	module.exports = app;
//}
