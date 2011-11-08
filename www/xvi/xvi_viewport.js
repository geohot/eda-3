// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

// this is the viewport drawing functions

var viewportAddress = 0;
var viewportLength = 0x200;
var viewportWidth = 0x10;
var viewportData;

var selectedAddress = null;
var selectedType = null;

var currentChangeNumber = 0;

var highlightedCommit = {};

function highlightChange(vc) {
  highlightedChange = vc;
  $('#hchangeinput')[0].value = highlightedChange;
  if (highlightedChange == 0) {
    highlightedCommit = {};
    renderHexViewport(viewportAddress, viewportLength);
    selectAddress(selectedAddress, 'H');
    return;
  }
  highlightedCommit = getcommitextents(highlightedChange);
  var fc = objfirst(highlightedCommit);
  if (fc != null) {
    fc = fhex(fc);
    if (!addressOnScreen(fc)) {
      selectAddress(fc, 'H');
    } else {
      renderHexViewport(viewportAddress, viewportLength);
      selectAddress(selectedAddress, selectedType);
    }
  } else {
    renderHexViewport(viewportAddress, viewportLength);
    selectAddress(selectedAddress, selectedType);
  }
}

$('#hexdata').delegate('td', 'mousedown', function(){
  selectAddress(fhex($(this)[0].id.substr(1)), 'H');
});

$('#rawdata').delegate('td', 'mousedown', function(){
  selectAddress(fhex($(this)[0].id.substr(1)), 'R');
});

function selectAddress(addr, type, selectAtBottom) {
  if (addr < 0) return;
  updateTagsForAddress(addr);
  if (!addressOnScreen(addr)) {
    viewportAddress = addr-(addr%viewportWidth);
    if (selectAtBottom == true) {
      viewportAddress -= (viewportLength-viewportWidth);
    }
    renderHexViewport(viewportAddress, viewportLength);
  }
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
  if (selectedAddress != null && $('#H'+shex(selectedAddress)).length > 0) {
    $('#N'+shex(selectedAddress-((selectedAddress-viewportAddress)%0x10)))[0].className = "";
    $('#H'+shex(selectedAddress)).removeClass("selected mselected");
    $('#R'+shex(selectedAddress)).removeClass("selected mselected");
  }
  selectedAddress = addr;
  selectedType = type;
  $('#N'+shex(selectedAddress-((selectedAddress-viewportAddress)%0x10)))[0].className = "mselected";
  $('#H'+shex(selectedAddress)).addClass((selectedType=='H')?'selected':'mselected');
  $('#R'+shex(selectedAddress)).addClass((selectedType=='R')?'selected':'mselected');
}

function addressOnScreen(address) {
  if (address >= viewportAddress && address < (viewportAddress + viewportLength)) {
    return true;
  } else {
    return false;
  }
}

function renderHexViewport(address, length) {
  var i, j;
  var numbers = "";
  var hexdata = "";
  var rawdata = "";
  viewportData = fetchRawAddressRange(address, length, currentChangeNumber);
  $('#addressinput')[0].value = shex(address);
  for (i = address; i < (address+length); i+=viewportWidth) {
    numbers += '<tr><td id="N'+shex(i)+'">' + shex(i) + '</td></tr>';
    hexdata += '<tr>';
    rawdata += '<tr>';
    for (j = i; j < (address+length) && j < (i+viewportWidth); j++) {
      classes = (pendingCommit[shex(j)] != null)?"incurrentcl":"";

      // this is so shitty
      for (key in highlightedCommit) {
        if (fhex(key) <= j && j < fhex(key)+highlightedCommit[key]) {
          classes += "inpastcl";
          break;
        }
      }
      hexdata += '<td class="'+classes+'" id="H'+shex(j)+'">'
      hexdata += shex(viewportData[j-address], 2)+'</td>';
      rawdata += '<td class="'+classes+'" id="R'+shex(j)+'">'
      rawdata += toPrintable(viewportData[j-address])+'</td>';
    }
    hexdata += '</tr>';
    rawdata += '</tr>';
  }
  $('#numbers')[0].innerHTML = numbers;
  $('#hexdata')[0].innerHTML = hexdata;
  $('#rawdata')[0].innerHTML = rawdata;
  return true;
}

