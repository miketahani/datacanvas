/* 
    simple script to grab data from datacanvas.org's sensor API
    5m resolution for the past hour, every hour, for every sensor and every city overview
    todo: 
      - put into a database after saving files (having the original copy can't hurt)
      - clean up this code bc it's really ugly
      - make this a proper server or run it on cron -- setInterval isn't awesome
*/

var fs = require('fs'),
    request = require('request'),
    moment = require('moment');

console.log('welcome to the show');

// sensor and city ids
var ids = require('./ids.json');
var group = function (arr, n) {
  // divide an array into into groups containing <n> number of elements
  var temp = [];
  while (arr.length) {
    temp.push(arr.splice(0, n)); 
  }
  return temp;
};
// create groups of three (floor(1000 queries per request / (60 min / 5m resolution)))
// FIXME should calculate this every time in case you want to change the resolution
ids.sensors = group(ids.sensors, 3).map(String);

var interval = 60 * 1000,  // 60 min * 1000ms
    queryFmt = 'YYYY-MM-DDTHH:mm:ss-0800',  // api time format as a moment-formatted string
    fileFmt  = 'YYYY_MM_DDTHH_mm_ss',   // for the filename
    debugFmt = 'HH:mm:ss',  // for console.logging status updates
    baseUrl  = 'http://sensor-api.localdata.com/api/v1/aggregations';

var get = function (url, params, filename, debugInfo, error) {
  console.log(moment().format(debugFmt) + ': getting data ' + (debugInfo || ''));
  request
    .get({url: url, qs: params})
    .on('error', error || function (err) {
      console.log(err);
    })
    .pipe(fs.createWriteStream(filename));  // FIXME error checking on file-writing
};

// querystring parameters
var query = {
  fields: 'temperature,light,humidity,dust,airquality_raw,sound',
  count: 1000,  // not really necessary
  resolution: '5m',
  from: null, // earlier/start date
  before: null // later/end date
};

var getAllSensorData = function () {
  var toDate   = moment(),
      fromDate = toDate.clone().subtract(1, 'hour');

  ['cities', 'sensors'].forEach(function (type, i) {
    // query request type changes based on sensor request vs city request
    var qt = (i && 'each.sources') || 'over.city';
    ids[type].forEach(function (id) {
      var q = JSON.parse(JSON.stringify(query));  // hella lazy
      q.from   = fromDate.format(queryFmt);
      q.before = toDate.format(queryFmt);
      q[qt]    = id;
      // i am so sorry for this
      var filename = [
        'data/',
        id.replace(/\W/g, '_'),
        '-',
        fromDate.format(fileFmt),
        '-',
        toDate.format(fileFmt),
        '.json'
      ].join('');
      get(baseUrl, q, filename, id); 
    });
  });
};

// FIXME something better than setInterval
setInterval(getAllSensorData, interval);



