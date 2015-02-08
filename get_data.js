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

var queryFmt = 'YYYY-MM-DDTHH:mm:ss-0800',  // api time format as a moment-formatted string
    fileFmt  = 'YYYY_MM_DDTHH_mm_ss',   // for the filename
    debugFmt = 'HH:mm:ss',  // for console.logging status updates
    baseUrl  = 'http://sensor-api.localdata.com/api/v1/aggregations',
    interval = 60 * 60 * 1000;  // 60 min * 60 sec * 1000ms

// querystring parameters
var query = {
  fields: 'temperature,light,humidity,dust,airquality_raw,sound',
  count: 1000,  // not really necessary
  resolution: '5m',
  from: null, // earlier/start date
  before: null // later/end date
};

var group = function (arr, n) {
  // divide an array into groups containing <n> number of elements
  var temp = [];
  while (arr.length) {
    temp.push(arr.splice(0, n)); 
  }
  return temp;
};
// sensor and city ids
var ids = require('./ids.json'),
    // create groups of three (floor(1000 queries per request / (60 min / 5m resolution)))
    ids = group(ids.sensors, 3).map(function (d) {
      return {type: 'sensor', id: ''+d};
    }).concat(ids.cities.map(function (d) {
      return {type: 'city', id: d};
    }));

var get = function (url, params, filename, debugInfo, error) {
  console.log('[*] ' + moment().format(debugFmt) + ': getting data ' + (debugInfo || ''));
  request
    .get({url: url, qs: params})
    .on('error', error || function (err) {
      console.log(err);
    })
    .pipe(fs.createWriteStream(filename));  // TODO error checking on file-writing
};

var getAllSensorData = function () {
  var toDate   = moment(),
      fromDate = toDate.clone().subtract(1, 'hour');

  ids.forEach(function (d) {
    var q  = JSON.parse(JSON.stringify(query));  // hella lazy
        // query request type changes based on sensor request vs city request
        qt = d.type === 'sensor' ? 'each.sources' : 'over.city';
    q.from   = fromDate.format(queryFmt);
    q.before = toDate.format(queryFmt);
    q[qt]    = d.id;
    // i am so sorry for this
    var filename = [
      'data/', d.id.replace(/\W/g, '_'), '-', 
      fromDate.format(fileFmt), '-', toDate.format(fileFmt),
      '.json'
    ].join('');
    get(baseUrl, q, filename, d.id); 
  });
};

// FIXME something better than setInterval
// setInterval(getAllSensorData, interval);
getAllSensorData();

