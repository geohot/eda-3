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

var fileName = "";

function handleFileDrop(e) {
  e.stopPropagation();
  e.preventDefault();
  // should probably support multiple files
  if (e.dataTransfer.files.length > 0) {
    var file = e.dataTransfer.files[0];
    fileName = file.name;
    $('#dropzone')[0].innerHTML = "reading file";
    var reader = new FileReader();
    reader.onloadend = handleFileReadDone;
    reader.readAsArrayBuffer(file);
  }
}

function handleFileReadDone(e) {
  p(e.target.result);
  var d = new Uint32Array(e.target.result, 0, 4);
  if (d[0] == 0xFEEDFACE) {
    $('#dropzone')[0].innerHTML = "parsing Mach-O file";
    uploadMachOFile(e.target.result);
    $('#dropzone')[0].innerHTML = "Mach-O file uploaded";
    return;
  }
  if (fileName.lastIndexOf("@") == -1) {
    $('#dropzone')[0].innerHTML = "needs @address tag";
    return;
  }
  var fileAddress = fhex(fileName.substr(fileName.lastIndexOf("@")+1))
  maxChangeNumber = rawcommit(fileAddress, e.target.result);
  $('#dropzone')[0].innerHTML = "uploaded at 0x"+shex(fileAddress);
  updateControlBox();
  // highlight the new shit
  highlightChange(maxChangeNumber);
}

function asciiString(u8a, offset) {
  var ret = "";
  offset = offset || 0;
  for (var i = offset; i < u8a.length; i++) {
    if (u8a[i] === 0) break;
    ret += chr(u8a[i]);
  }
  return ret;
}

function uploadMachOFile(ab) {
  var LC_SEGMENT = 0x1; // segment of this file to be mapped
  var LC_SYMTAB = 0x2; // link-edit stab symbol table info
  var LC_DYSYMTAB = 0xB; // dynamic link-edit symbol table info
  var LC_LOAD_DYLINKER = 0xE; // load a dynamic linker
  var LC_UNIXTHREAD = 0x5; // unix thread (includes a stack)
  var LC_LOAD_DYLIB = 0xC; // load a dynamicly linked shared library

  var symbols = [];
  var symbol_offsets = [];

  var mach_header_64 = new Uint32Array(ab, 0, 0x1C);
  var ncmds = mach_header_64[4];
  var sizeofcmds = mach_header_64[5];
  var offset = 0x1C;

  for (var cmd = 0; cmd < ncmds; cmd++) {
    var load_command = new Uint32Array(ab, offset, 0x8);
    p('cmd: '+shex(load_command[0])+' len '+shex(load_command[1]));
    if (load_command[0] == LC_SEGMENT) {
      var segment_command = new Uint32Array(ab, offset, 14*4);
      var segname = asciiString(new Uint8Array(ab, offset+8, 0x10));
      var vmaddr = segment_command[6];
      var vmsize = segment_command[7];
      var fileoff = segment_command[8];
      var filesize = segment_command[9];
      var nsects = segment_command[12];
      p('  '+segname+': '+shex(vmaddr)+' '+shex(vmaddr+vmsize)+' in file at '+shex(fileoff)+' '+shex(fileoff+filesize));

      var S_NON_LAZY_SYMBOL_POINTERS = 0x6;
      var S_LAZY_SYMBOL_POINTERS = 0x7;
      var S_SYMBOL_STUBS = 0x8;

      var offset_sect = offset+14*4;
      for (var sect = 0; sect < nsects; sect++) {
        var section = new Uint32Array(ab, offset_sect, 0x44);
        var sectname = asciiString(new Uint8Array(ab, offset_sect, 0x10));
        var segname = asciiString(new Uint8Array(ab, offset_sect+0x10, 0x10));
        var reloff = section[12];
        var nreloc = section[13];
        var flags = section[14];
        var start = section[8];
        var len = section[9];
        p('    '+sectname+' '+segname+' @ '+shex(section[8])+' '+shex(section[9])+' relocs '+shex(reloff)+' '+nreloc+' flags '+shex(flags));

        if ((flags&0xF) == S_SYMBOL_STUBS) {
          symbol_stubs = section[8];
          for (var i = start; i < start+len; i+=0xC) {
            symbol_offsets.push(i);
          }
        }

        if ((flags&0xF) == S_NON_LAZY_SYMBOL_POINTERS) {
          nl_symbol_ptrs = section[8];
          for (var i = start; i < start+len; i+=4) {
            symbol_offsets.push(i);
          }
        }

        if ((flags&0xF) == S_LAZY_SYMBOL_POINTERS) {
          la_symbol_ptrs = section[8];
          for (var i = start; i < start+len; i+=4) {
            symbol_offsets.push(i);
          }
        }


        offset_sect += 0x44;
      }

      // this is hacky
      var segdata = new ArrayBuffer(filesize);
      var segdata_view = new Uint8Array(segdata);
      var segdata_live = new Uint8Array(ab, fileoff, filesize);
      for (var i = 0; i < filesize; i++) segdata_view[i] = segdata_live[i];

      rawcommit(vmaddr, segdata);
    }
    if (load_command[0] == LC_SYMTAB) {
      var REFERENCE_FLAG_UNDEFINED_NON_LAZY = 0;
      var REFERENCE_FLAG_UNDEFINED_LAZY = 1;
      var REFERENCE_FLAG_DEFINED = 2;
      var REFERENCE_FLAG_PRIVATE_DEFINED = 3;
      var REFERENCE_FLAG_PRIVATE_UNDEFINED_NON_LAZY = 4;
      var REFERENCE_FLAG_PRIVATE_UNDEFINED_LAZY = 5;

      var symtab_command = new Uint32Array(ab, offset, load_command[1]);
      var symoff = symtab_command[2];
      var nsyms = symtab_command[3];
      var stroff = symtab_command[4];
      var strsize = symtab_command[5];
      var strs =  new Uint8Array(ab, stroff, strsize);
      p('  symbol table: '+shex(symoff)+' '+nsyms+' '+shex(stroff)+' '+shex(strsize));
      for (var sym = 0; sym < nsyms; sym++) {
        var nlist = new Uint32Array(ab, symoff+sym*0xC, 0xC);
        var n_type = (nlist[1]>>24)&0xFF;
        var n_sect = (nlist[1]>>16)&0xFF;
        var n_desc = nlist[1] & 0xFFFF;
        var str = asciiString(strs, nlist[0]);
        symbols.push(str);
        p('  '+n_type+' '+n_sect+' '+n_desc+' '+shex(nlist[2])+' = '+str);

        if (n_desc == REFERENCE_FLAG_PRIVATE_DEFINED) {
          db.setTag(nlist[2], 'name', str);
        }
      }
    }
    if (load_command[0] == LC_DYSYMTAB) {
      var dysymtab_command = new Uint32Array(ab, offset, load_command[1]);
      //for(var i=0;i<20;i++) p(shex(dysymtab_command[i]));
      //p('  local symbols '+shex(dysymtab_command[2])+' len '+dysymtab_command[3]);
      //p('  defined external symbols '+shex(dysymtab_command[4])+' len '+dysymtab_command[5]);
      //p('  undefined symbols '+shex(dysymtab_command[6])+' len '+dysymtab_command[7]);
      var indirectsymoff = new Uint32Array(ab, dysymtab_command[14], dysymtab_command[15]);
      p(symbols);
      p(symbol_offsets);
      for(var indirectsym = 0; indirectsym < dysymtab_command[15]; indirectsym++) {
        var symoff = indirectsymoff[indirectsym];
        p(shex(symoff)+' '+symbols[symoff]+' @ '+symbol_offsets[indirectsym]);
        if(symoff != 0x80000000) {
          db.setTag(symbol_offsets[indirectsym], 'name', symbols[symoff]);
        }
      }
    }
    if (load_command[0] == LC_LOAD_DYLIB) {
      var dylib_command = new Uint32Array(ab, offset, load_command[1]);
      var lc_str = asciiString(new Uint8Array(ab, offset+dylib_command[2], load_command[1]-dylib_command[2]));
      p('  '+lc_str);
    }
    offset += load_command[1];
  }
}

