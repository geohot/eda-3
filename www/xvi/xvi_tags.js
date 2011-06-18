// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var tagsAddress;

function updateTagsForAddress(address) {
  tagsAddress = address;
  getTagsAsync(address, updateTagsTable);
}

function updateTagsTable(tags) {
  var tabledata = "";
  for (tagname in tags) {
    tabledata += '<tr>';
    tabledata += '<td>'+tagname+'</td>';
    tabledata += '<td><input size=30 type="text" class="stealthinput" id="tagdata_'+tagname+'" value="'+tags[tagname]+'"/></td>';
    tabledata += '</tr>';
  }
  tabledata += '<tr>';
  tabledata += '<td><input size=10 type="text" class="stealthinput" id="tagname" /></td>';
  tabledata += '<td><input size=30 type="text" class="stealthinput" id="tagdata" /></td>';
  tabledata += '</tr>';

  $('#tageditor')[0].innerHTML = tabledata;

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
                           viewportData,
                           tagsAddress-viewportAddress)+'</td></tr>';
    }
  }

// the immed value
  if (tags['endian'] !== undefined && tags['len'] !== undefined) {
    if ( (tagsAddress+length) < (viewportAddress+viewportLength)) {
      tablehtml += '<tr><td>'+
        displayImmedFromRaw(fnum(tags['len']),
                            tags['endian'],
                            viewportData,
                            tagsAddress-viewportAddress)+'</td></tr>';
    }
  }

// the parsed instruction
  if (tags['parsed'] !== undefined) {
    tablehtml += '<tr><td>' + displayParsed(tags['parsed']) + '</td></tr>';
  }

// the comment
  if (tags['comment'] !== undefined) {
    tablehtml += '<tr><td>'+displayComment(tags['comment'])+'</td></tr>';
  }

  $('#tagsresolved')[0].innerHTML = tablehtml;
}

