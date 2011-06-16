// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var pendingCommit = {};

// currently blocking and not caching...can be fixed
function fetchRawAddressRange(address, length, changenumber) {
  // fuck you javascript
  if (!changenumber) changenumber = 0;
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
  req.send(data);
  return fdec(req.response);
}

function getcommit(clnumber) {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/getchangelist.php?n='+clnumber, false);
  req.send(null);
  return jQuery.parseJSON(req.response);
}

function getMaxChangelist() {
  var req = new XMLHttpRequest();
  req.open('GET', '/eda/edadb/maxchangelist.php', false);
  req.send(null);

  return fdec(req.response);
}

