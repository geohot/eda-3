// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var tagsAddress;

function updateTagsForAddress(address) {
  tagsAddress = address;
  getTagsAsync(address, updateTagsTable);
}

function updateTagsTable(tags) {
  updateObjectEditor('tag', tags, 10, 30);
  updateTagsResolved(tags);
}

function updateTagsResolved(tags) {
  var tablehtml = "";

// the name
  if (tags['name'] !== undefined) {
    tablehtml += '<tr><td>'+tags['name']+'</td></tr>';
  }

// the dump
  if (tags['len'] !== undefined) {
    if ( (tagsAddress+length) < (viewportAddress+viewportLength)) {
      tablehtml += '<tr><td>'+
        displayDumpFromRaw(fnum(tags['len']),
                           viewportData.subarray(tagsAddress-viewportAddress))
                           +'</td></tr>';
    }
  }

// the immed value
  if (tags['endian'] !== undefined && tags['len'] !== undefined) {
    if ( (tagsAddress+length) < (viewportAddress+viewportLength)) {
      tablehtml += '<tr><td>'+
        displayImmedFromRaw(fnum(tags['len']),
                            tags['endian'],
                            viewportData.subarray(tagsAddress-viewportAddress))
                            +'</td></tr>';
    }
  }

// the parsed instruction
  if (tags['parsed'] !== undefined) {
    tablehtml += '<tr><td>' + displayParsed(tags['parsed']) + '</td></tr>';
  }

// the flow
  if (tags['flow'] !== undefined) {
    tablehtml += '<tr><td>'
    // fuck you jQuery JSON parser
    var flow_array = eval(tags['flow']);
    flow_array.map(function(t) {
      if(t == 'R') {
        tablehtml += '<span class="f_R">return</span>';
      } else {
        tablehtml += '<span class="f_'+t.substr(0,1)+'">'+t.substr(1)+'</span>';
      }
    });
    tablehtml += '</td></tr>';
  }

// the comment
  if (tags['comment'] !== undefined) {
    tablehtml += '<tr><td>'+displayComment(tags['comment'])+'</td></tr>';
  }

  $('#tagsresolved')[0].innerHTML = tablehtml;
}

