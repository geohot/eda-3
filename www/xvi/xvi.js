// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

$(document).ready(function() {
  renderHexViewport(0x1000, 0x200);
  selectAddress(0x1000, 'H');
});

// specific functions
function toPrintable(chr) {
  if (chr >= 0x20 && chr < 0x80) {
    return String.fromCharCode(chr);
  } else if (chr >= 0xA0 && chr < 0x100 && chr != 0xAD) {
    return String.fromCharCode(chr);
  } else {
    return String.fromCharCode(0x1700);
  }
}

var selectedAddress = null;
var selectedType = null;

// stop selecting my shit
$(document).mousedown(function() { return false; });


// this is about moving
window.onkeydown = function(e) {
  // i hate xvi32's backspace behavior
  if (e.which == 37 || e.which == 8) {
    selectAddress(selectedAddress - 1, selectedType);
    return false;
  } else if (e.which == 40) {
    selectAddress(selectedAddress + 0x10, selectedType);
    return false;
  } else if (e.which == 38) {
    selectAddress(selectedAddress - 0x10, selectedType);
    return false;
  } else if (e.which == 39) {
    selectAddress(selectedAddress + 1, selectedType);
    return false;
  }
};

var oldWhileTyping = null;

document.onkeypress = function(e) {
  if (selectedType == 'R') {
    setAddress(selectedAddress, e.charCode);
    selectAddress(selectedAddress + 1, selectedType);
  } else if (selectedType == 'H') {
    if ((e.which >= 0x41 && e.which < 0x47) ||
        (e.which >= 0x61 && e.which < 0x67) ||
        (e.which >= 0x30 && e.which < 0x3A)) {
      var ele = $('#H'+shex(selectedAddress))[0];
      if (ele.innerHTML.substr(1, 1) == " ") {
        oldWhileTyping = null;
        setAddress(selectedAddress, fhex(ele.innerHTML.substr(0, 1)+chr(e.which)));
        selectAddress(selectedAddress + 1, selectedType);
      } else {
        oldWhileTyping = ele.innerHTML;
        ele.innerHTML = chr(e.which).toUpperCase()+" ";
      }
    }
  }
};

$('#hexdata').delegate('td', 'mousedown', function(){
  selectAddress(fhex($(this)[0].id.substr(1)), 'H');
});

$('#rawdata').delegate('td', 'mousedown', function(){
  selectAddress(fhex($(this)[0].id.substr(1)), 'R');
});


function setAddress(addr, asc) {
  $('#H'+shex(selectedAddress))[0].innerHTML = shex(asc, 2);
  $('#R'+shex(selectedAddress))[0].innerHTML = toPrintable(asc);
// add this to a pending changelist
}

function selectAddress(addr, type) {
  if (oldWhileTyping != null) {
    $('#H'+shex(selectedAddress))[0].innerHTML = oldWhileTyping;
    oldWhileTyping = null;
  }
  if (selectedType != type) {
    if (type == 'H') {
      $('#hexdata')[0].className = "tselected";
      $('#rawdata')[0].className = "";
    } else if (type == 'R') {
      $('#rawdata')[0].className = "tselected";
      $('#hexdata')[0].className = "";
    }
  }
  if (selectedAddress != null) {
    $('#N'+shex(selectedAddress-(selectedAddress%0x10)))[0].className = "";
    $('#H'+shex(selectedAddress))[0].className = "";
    $('#R'+shex(selectedAddress))[0].className = "";
  }
  selectedAddress = addr;
  selectedType = type;
  $('#N'+shex(selectedAddress-(selectedAddress%0x10)))[0].className = "mselected";
  $('#H'+shex(selectedAddress))[0].className = (selectedType=='H')?'selected':'mselected';
  $('#R'+shex(selectedAddress))[0].className = (selectedType=='R')?'selected':'mselected';
}

function renderHexViewport(address, length) {
  var i, j;
  var numbers = "";
  var hexdata = "";
  var rawdata = "";
  var data = fetchRawAddressRange(address, length);
  for (i = address; i < (address+length); i+=0x10) {
    numbers += '<tr><td id="N'+shex(i)+'">' + shex(i) + '</td></tr>';
    hexdata += '<tr>';
    rawdata += '<tr>';
    for (j = i; j < (address+length) && j < (i+0x10); j++) {
      hexdata += '<td id="H'+shex(j)+'">'+shex(data[j-address], 2)+'</td>';
      rawdata += '<td id="R'+shex(j)+'">'+toPrintable(data[j-address])+'</td>';
    }
    hexdata += '</tr>';
    rawdata += '</tr>';
  }
  $('#numbers')[0].innerHTML = numbers;
  $('#hexdata')[0].innerHTML = hexdata;
  $('#rawdata')[0].innerHTML = rawdata;
  return true;
}

