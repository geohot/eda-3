// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var extents = {};

function fetchRawAddressRange(address, length) {
  //return extents[0x1000];
  /*var test = [];
  var i;
  for (i=0;i<0x200;i++) {
    test[i] = i%0x100;
  }
  return test;*/
  /*$.get(
    '/eda/edadb/fetchrawextent.php?addr='+address+'&size='+length+'&changenumber=0',
    function (data) {
      alert('hello');
      p('callback');
      var view = new jDataView(data);
      console.log(view.getUint8());
    }
    'binary'
  );*/
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/fetchrawextent.php?addr='+address+'&size='+length+'&changenumber=0', false);
  req.asBlob = true;
  req.overrideMimeType('text/plain; charset=x-user-defined');
  req.send(null);
  var b = new ArrayBuffer(req.response.length);
  var ret = new Uint8Array(b);
  for (var i = 0; i < req.response.length; i++) {
    ret[i] = req.response.charCodeAt(i);
  }
  return ret;
}

