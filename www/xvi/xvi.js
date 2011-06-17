// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

var highlightedChange = 0;

var maxChangeNumber = 0;

// init functions

$(document).ready(function() {
  renderHexViewport(viewportAddress, viewportLength);
  selectAddress(viewportAddress, 'H');
  maxChangeNumber = getMaxChangelist();
  updateControlBox();
  initFileBox();
});

function updateControlBox() {
  $('#clnumber')[0].innerHTML = maxChangeNumber;
  $('#changecount')[0].innerHTML = '0x'+shex(objcount(pendingCommit));
  $('#hchangeinput')[0].value = highlightedChange;
  $('#vchangeinput')[0].value = currentChangeNumber;
}


// stop selecting my shit
//$("#xviroot").mousedown(function() { return false; });
document.onselectstart = function() { return false; };

// **** keyboard high level ****

var keyBindings = {};

function registerKeyHandler(num, fxn) {
  keyBindings[num] = fxn;
}

window.onkeydown = function(e) {
  if (getSelection().baseNode != null) {
    return;
  }
  var keynum = e.which;
  if (e.ctrlKey) keynum += CTRL;
  if (keyBindings[keynum] != null) {
    keyBindings[keynum](e);
    return false;
  }
};

// *** handle typing ***

var oldWhileTyping = null;
document.onkeypress = function(e) {
  if (getSelection().baseNode != null) {
    return;
  }
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

function setAddress(addr, asc) {
  $('#H'+shex(selectedAddress))[0].innerHTML = shex(asc, 2);
  $('#R'+shex(selectedAddress))[0].innerHTML = toPrintable(asc);

  $('#H'+shex(selectedAddress)).addClass("incurrentcl");
  $('#R'+shex(selectedAddress)).addClass("incurrentcl");
// add this to a pending changelist
  storeByteInPendingCommit(addr, asc);
  // fuck you javascript
  var count = JSON.stringify(pendingCommit).split(':').length-1;
  $('#changecount')[0].innerHTML = '0x'+shex(count);
}

// *** handle committing ***

function handleCommit() {
  for (addr in pendingCommit) {
    $('#H'+addr).removeClass("incurrentcl");
    $('#R'+addr).removeClass("incurrentcl");
  }
  maxChangeNumber = commit();
  updateControlBox();
}

