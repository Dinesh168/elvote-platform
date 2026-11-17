require('dotenv').config();

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

const RouteMap = require('./src/routes/middleware/RouteMap.js');
const Swagger = require('./src/routes/middleware/Swagger.js');
const Db = require('./src/models/libs/Db');
const ErrorHandler = require('./src/errorhandlers/ErrorHandler');
const fileUpload = require('express-fileupload');
var cors = require('cors');

var app = express();

let corsOptions;
if (process.env.NODE_ENV === "production") {
	// TODO: Implement dynamic origins so as to accomodate all internal and third party domains
	corsOptions = {
		origin: function(origin, callback){
			return callback(null, true);
		},
		credentials: true,
		optionsSuccessStatus: 200
	};
} else {
	corsOptions = {
		origin: function(origin, callback){
			return callback(null, true);
		},
		exposedHeaders: ["X-Server-Start-Time", "X-Server-End-Time"],
		credentials: true,
		optionsSuccessStatus: 200
	};
}

app.use(cors(corsOptions))

app.use(express.json({
    limit: '100mb', 
    verify: (req, res, buf) => {
        req.rawBody = buf
    }
}));
app.use(express.urlencoded({limit: '100mb'}));

app.use(cookieParser());
app.use(fileUpload({
    limits: { fileSize: 100 * 1024 * 1024 },
  }));
app.use(express.static(path.join(__dirname, 'public')));

Swagger.setup(app);
RouteMap.setupRoutesAndAuth(app);
Db.init();


// error handler
app.use(ErrorHandler.handleError);

module.exports = app;
