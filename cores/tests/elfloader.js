// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

// test framework allowing elf loads

var included = {};

var fs = require('fs');
var vm = require('vm');
var http = require('http');
var querystring = require('querystring');

// hacky shit bro
XMLHttpRequest = function() {
  this.open = function(method, url, async) {
    p(method+" "+url);
    this.options['method'] = method;
    this.options['path'] = url;
  };
  this.send = function(data) {
    //p('sending data...');
    if (this.options['method'] == 'POST') {
      if (this.asBlob === true) {
        this.options['headers']['Content-Length'] = data.byteLength;
      } else {
        this.options['headers']['Content-Length'] = data.length;
      }
    }
    var req = http.request(this.options, function(res) {
      //p('req done');
    });
    if (data !== null) {
      if (this.asBlob === true) {
        //p(data);
        var rdata = ""
        for (var i=0;i<data.byteLength;i++) {
          rdata += String.fromCharCode(data[i]);
        }
        req.write(rdata, 'binary');
        //req._writeRaw(rdata, 'binary');
      } else {
        req.write(data);
      }
    }
    req.end();
  };
  this.overrideMimeType = function(newtype) {
    this.options['headers']['Content-Type'] = newtype;
  };
  this.options = {
    host: 'localhost',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    //agent: false, // or rdata is a bitch
    port: 80};
};

main(process.argv);

function main(argv) {
  if (argv.length > 2) {
    eda_require('js/base.js');
    eda_require('js/dbmanager.js');
    eda_require('js/db.js');
    eda_require('xvi/xvi_file.js');
    p('loading '+argv[2]);
    var data = fs.readFileSync(argv[2]);
    var ab = new ArrayBuffer(data.length);
    var sview = new Uint8Array(ab);

    for (var i=0;i<data.length;i++) {
      sview[i] = data[i];
    }

    uploadELFFile(ab);

  } else {
    p('usage: elfloader.js program.elf');
  }
}

// base.js like functionality

// fuck js namespacing, hence eda_require
function eda_require(name) {
  if (included[name] == true) return;
  included[name] = true;
  console.log('including '+name);

  var code = fs.readFileSync('/Users/geohot/eda-3/www/'+name);

  //eval(data.toString('ascii'));
  vm.runInThisContext(code, name);
}




