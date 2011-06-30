// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.


var viewportAddress = 0x4000A000;
var viewportLength = 0x200;

var totalAddress = viewportAddress;
var totalLength = 0x200;

var viewportData;
var viewportTags;

$(document).ready(function() {
  viewportData = fetchRawAddressRange(totalAddress, totalLength);
  viewportTags = getMultiTag(totalAddress, totalLength);
  renderFlatViewport(viewportAddress, viewportLength);
});

function renderFlatViewport(addr, len) {
  var i;
  var html = '<table>';
  for (i = addr; i < (addr+len);) {
    html += '<tr>';
    var tags = viewportTags[i];

    // add default tags
    if (tags === undefined) {
      tags = {};
    }
    if (tags['len'] === undefined) {
      tags['len'] = '1';
    }

    html += '<td>'+shex(i, 8)+'</td>'
    html += '<td>'+
      displayDumpFromRaw(fnum(tags['len']),
                         viewportData.subarray(i-viewportAddress))
                         +'</td>';
    if (tags['parsed'] !== undefined) {
      html += '<td>' + displayParsed(tags['parsed']) + '</td>';
    } else if (tags['endian'] !== undefined) {
      html += '<td>'+
        displayImmedFromRaw(fnum(tags['len']),
                            tags['endian'],
                            viewportData.subarray(i-viewportAddress))
                            +'</td>';
    }


    html += '</tr>';
    i += fnum(tags['len']);
  }
  html += '</table>';
  $('#viewport')[0].innerHTML = html;
}

