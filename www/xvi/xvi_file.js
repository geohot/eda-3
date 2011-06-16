// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

function initFileBox() {
  $('#dropzone')[0].addEventListener("dragenter", trash, false);
  $('#dropzone')[0].addEventListener("dragexit", trash, false);
  $('#dropzone')[0].addEventListener("dragover", trash, false);
  $('#dropzone')[0].addEventListener("drop", handleFileDrop, false);
}

function trash(e) {
  e.stopPropagation();
  e.preventDefault();
}

var fileAddress = 0;

function handleFileDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  // should probably support multiple files
  if (e.dataTransfer.files.length > 0) {
    var file = e.dataTransfer.files[0];
    if (file.name.lastIndexOf("@") == -1) {
      $('#dropzone')[0].innerHTML = "needs @address tag";
      return;
    }
    var name = file.name;
    fileAddress = fhex(name.substr(name.lastIndexOf("@")+1))
    $('#dropzone')[0].innerHTML = "reading file";
    var reader = new FileReader();
    reader.onloadend = handleFileReadDone;
    reader.readAsBinaryString(file);
  }
}

function handleFileReadDone(e) {
  maxChangeNumber = rawcommit(fileAddress, e.target.result);
  $('#dropzone')[0].innerHTML = "uploaded at 0x"+shex(fileAddress);
  updateControlBox();
  // highlight the new shit
  highlightChange(clnumber);
}

