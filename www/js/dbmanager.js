// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var pendingCommit = {};

// currently blocking and not caching...can be fixed
// this is still the call db.js uses
function fetchRawAddressRange(address, length, changenumber) {
  changenumber = changenumber || 0;

// WebSockets imp
  if (db.socket !== null) {
    //p("using websocket, fetchRawAddressRange");
    return db.wsFetchRawAddressRange(address, length, changenumber);
  } else {
    var req = new XMLHttpRequest();
    req.open('GET', '/eda/edadb/fetchrawextent.php?addr='+address+'&size='+length+'&changenumber='+changenumber, false);
    req.asBlob = true;
    req.overrideMimeType('text/plain; charset=x-user-defined');
    req.send(null);
    var b = new ArrayBuffer(req.response.length);
    var ret = new Uint8Array(b);
    for (var i = 0; i < req.response.length; i++) {
      ret[i] = req.response.charCodeAt(i);
      // add back current changes
      if (pendingCommit[shex(address+i)] != null) {
        ret[i] = pendingCommit[shex(address+i)];
      }
    }
    return ret;
  }
}

function storeByteInPendingCommit(address, data) {
  pendingCommit[shex(address)] = data;
}

// write the commit to the EDAdb
// returns the change number
function commit() {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/edadb/commit.php', false);
  var data = JSON.stringify(pendingCommit);
  req.send(data);

  pendingCommit = {};

  return fdec(req.response);
}

function rawcommit(address, data) {
  var req = new XMLHttpRequest();
  // maybe could be async one day
  req.open('POST', '/eda/edadb/rawcommit.php?addr='+address, false);
  req.asBlob = true;
  req.overrideMimeType('text/plain; charset=x-user-defined');
  req.send(data);
  return fdec(req.response);
}

function getcommit(clnumber) {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/getchangelist.php?n='+clnumber, false);
  req.send(null);
  return jQuery.parseJSON(req.response);
}

function getcommitextents(clnumber) {
  if (isNaN(clnumber)) {
    console.error('NaN isn\'t a changelist');
    return;
  }
  var req = new XMLHttpRequest();
  p(clnumber);
  req.open('GET', '/eda/edadb/getchangelistextents.php?n='+clnumber, false);
  req.send(null);
  p(req);
  return jQuery.parseJSON(req.response);
}

function getMaxChangelist() {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/maxchangelist.php', false);
  req.send(null);

  return fdec(req.response);
}

function setMultiTag(data) {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/edadb/setmultitag.php', false);
  req.send(data);
}

function setMultiTagAsync(data, callback) {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/edadb/setmultitag.php', true);
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 200) {
      callback();
    }
  };
  req.send(data);

}

function setTag(addr, name, data) {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/edadb/settag.php?addr='+addr+"&tagname="+name, false);
  req.send(data);
  invalidateTagCache(addr);
}

function setTagAsync(addr, name, data) {
  var req = new XMLHttpRequest();
  req.open('POST', '/eda/edadb/settag.php?addr='+addr+"&tagname="+name, true);
  req.send(data);
}

var tagCache = {};

function getTagsCached(addr) {
  if (tagCache[addr] === undefined) {
    //p('cache miss');
    tagCache[addr] = getTags(addr);
  }
  return tagCache[addr];
}

function invalidateTagCache(addr) {
  delete tagCache[addr];
}

function getTags(addr) {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/gettags.php?addr='+addr, false);
  req.send(null);
  return jQuery.parseJSON(req.response);
}

// puts the tags in cache
function getMultiTag(addr, len) {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/getmultitag.php?addr='+addr+'&len='+len, false);
  req.send(null);
  var resp = jQuery.parseJSON(req.response);
  for (addr in resp) {
    tagCache[addr] = resp[addr];
  }
  return resp;
}

function getTagsAsync(addr, callback) {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/gettags.php?addr='+addr, true);
  // omg closure
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      callback(jQuery.parseJSON(req.response));
    }
  };
  req.send(null);
}

// this shouldn't be in base...and shouldn't use offset
// supa hacks
function immed(length, endian, rawdata, offset) {
  offset = offset || 0;
  var i;
  var addr = offset;
  if (endian == 'little') {
    addr += length-1;
  }
  //var ret = 0;
  var retstring = '';
  for (i=0;i<length;i++) {
    //ret <<= 8;
    //ret |= rawdata[addr];
    retstring += shex(rawdata[addr], 2);
    if (endian == 'little') {
      addr -= 1;
    } else {
      addr += 1;
    }
  }
  //return ret;
  return fhex(retstring);
}

