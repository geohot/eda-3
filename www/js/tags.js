// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var spanlookup = {
  't':'i_tab',
  'o':'i_opcode',
  'c':'i_condition',
  'l':'i_location',
  'i':'i_immed'};

var spanfunction = {
  't':displayParsed,
  'l':parseLocation};

function displayParsed(parsed) {
  var ret = "";
  var i;
  for (i = 0; i < parsed.length; i++) {
    var c = parsed.substr(i, 1);
    if (c == '\\') {
      i += 1;
      var m = parsed.substr(i, 1);
      i += 2;
      var ss = "";
      var nested = 1;
      var j;
      while (i < parsed.length) {
        c = parsed.substr(i, 1);
        if (c == '{') nested++;
        if (c == '}') nested--;
        if (nested == 0) break;
        ss += c;
        i++;
      }
      if (spanfunction[m] !== undefined) {
        ss = spanfunction[m](ss);
      }
      ret += '<span class="'+spanlookup[m]+'">'+ss+'</span>';
    } else {
      ret += c;
    }
  }
  return ret;
}

// this shouldn't have to do a network fetch
function parseLocation(ss) {
  var addr = fnum(ss);
  var tags = getTags(addr);
  if (tags['name'] !== undefined) {
    return tags['name'];
  } else {
    return '0x'+shex(addr);
  }
}

function displayComment(comment) {
  return '<span class="comment">// '+comment+'</span>';
}

function displayImmedFromRaw(length, endian, rawdata, offset) {
  var row = '<span class="i_immed">0x';
  var i;
  var addr = offset;
  if (endian == 'little') {
    addr += length-1;
  }
  for (i=0;i<length;i++) {
    row += shex(rawdata[addr],2);
    if (endian == 'little') {
      addr -= 1;
    } else {
      addr += 1;
    }
  }
  row += '</span>';
  return row;
}

function displayDumpFromRaw(length, rawdata, offset) {
  var row = '<span class="i_dump">';
  for (var i=0; i<length; i++) {
    row += shex(rawdata[offset+i],2)+" ";
  }
  row += '</span>';
  return row;
}

