// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

function updateObjectEditor(name, obj, sizekey, sizedata) {
  var data = "";
  for (key in obj) {
    data += '<tr>';
    data += '<td>'+key+'</td>';
    data += '<td><input size='+sizedata+' type="text" id="'+name+'data_'+key+'" value="'+obj[key]+'"/></td>';
    data += '</tr>';
  }
  data += '<tr>';
  data += '<td><input size='+sizekey+' type="text" id="'+name+'key" /></td>';
  data += '<td><input size='+sizedata+' type="text" id="'+name+'data" /></td>';
  data += '</tr>';

  $('#'+name+'editor')[0].innerHTML = data;
}

// callback is called with key and data
function registerObjectEditor(name, callback) {
  $('#'+name+'editor')[0].onkeydown = function(e) {
    if (e.keyCode == 13) {
      e.target.blur();
      if (e.target.id == name+'data') {
        var key = $('#'+name+'key')[0].value;
        var data = $('#'+name+'data')[0].value;
        if (key.length > 0) {
          callback(key, data, name);
        }
      } else if (e.target.id.substr(0, (name+'data_').length) == (name+'data_')) {
        var key = e.target.id.substr((name+'data_').length);
        callback(key, e.target.value, name);
      }
    }
  };
}

