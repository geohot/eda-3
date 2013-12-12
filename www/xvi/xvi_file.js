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
    handleFile(file);
  }
}

function handleFile(file) {
  fileName = file.name;
  $('#dropzone')[0].innerHTML = "reading file";
  var reader = new FileReader();
  reader.onloadend = handleFileReadDone;
  reader.readAsArrayBuffer(file);
}

function handleFileSelect() {
  p("handleFileSelect called");
  handleFile($('#the_file')[0].files[0]);
  return false;
}

// fix for bug where Uint32Array doesn't work at all on non multiple 4 ArrayBuffers
function fourify(ab) {
  if((ab.byteLength&3) == 0) return ab;
  var ret = new ArrayBuffer((ab.byteLength+4) & 0xFFFFFFFC);
  var sview = new Uint8Array(ab);
  var dview = new Uint8Array(ret);
  for(var i=0;i<ab.byteLength;i++) {
    dview[i] = sview[i];
  }
  p(ret.byteLength);
  return ret;
}

function extractRegion(ab, fileoff, filesize) {
  // this is hacky
  var segdata = new ArrayBuffer(filesize);
  var segdata_view = new Uint8Array(segdata);
  var segdata_live = new Uint8Array(ab, fileoff, filesize);
  for (var i = 0; i < filesize; i++) segdata_view[i] = segdata_live[i];
  return segdata;
}

function handleFileReadDone(e) {
  var ab = fourify(e.target.result);
  p(ab);
  if (ab.byteLength >= 0x40) {
    var d = new Uint32Array(ab, 0, 0x40);
    p(shex(d[0]));
    if (d[0] == 0xFEEDFACE) {
      $('#dropzone')[0].innerHTML = "parsing Mach-O file";
      uploadMachOFile(ab, 0);
      $('#dropzone')[0].innerHTML = "Mach-O file uploaded";
      return;
    }
    if (d[0] == 0xFEEDFACF) {
      $('#dropzone')[0].innerHTML = "parsing Mach-O 64 file";
      uploadMachOFile(ab, 1);
      $('#dropzone')[0].innerHTML = "Mach-O file uploaded";
      return;
    }
    if (d[0] == 0x464C457F) {
      $('#dropzone')[0].innerHTML = "parsing ELF file";
      uploadELFFile(ab);
      $('#dropzone')[0].innerHTML = "ELF file uploaded";
      return;
    }
    if ( (d[0]&0xFFFF) == 0x5A4D && d[d[15]/4] == 0x4550) {
      $('#dropzone')[0].innerHTML = "parsing PE file";
      uploadPEFile(ab);
      $('#dropzone')[0].innerHTML = "PE file uploaded";
      return;
    }
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

function uploadPEFile(ab) {
  var PEHeaderOffset = (new Uint32Array(ab, 0x3C, 4))[0];
  var PE = new Uint32Array(ab, PEHeaderOffset+4, 20);

  var Machine = PE[0]&0xFFFF;
  var NumberOfSections = (PE[0]>>16)&0xFFFF;
  var PointerToSymbolTable = PE[2];
  var NumberOfSymbols = PE[3];
  var PointerToStringTable = PE[2]+PE[3]*18;
  var SizeOfOptionalHeader = PE[4]&0xFFFF;

  var ImageBase = PE[12];

  var StartAddress = ImageBase+PE[9];

  p('StartAddress: '+shex(StartAddress));
  p('PointerToSymbolTable: '+shex(PointerToSymbolTable)+' with '+shex(NumberOfSymbols));
  p('PointerToStringTable: '+shex(PointerToStringTable));

  var SectionOffset = PEHeaderOffset+4+0x14+SizeOfOptionalHeader;

  var Sections = [0];

  for (var i = SectionOffset; i < SectionOffset + NumberOfSections*0x28; i+= 0x28) {
    var Section = new Uint32Array(ab, i, 0x28/4);
    var Name = asciiString(new Uint8Array(ab, i, 8));
    var VirtualAddress = ImageBase+Section[3];
    var SizeOfRawData = Section[4];
    var PointerToRawData = Section[5];
    Sections.push(VirtualAddress);
    p(Name+' '+shex(VirtualAddress)+' '+shex(SizeOfRawData)+' @ '+shex(PointerToRawData));
    rawcommit(VirtualAddress, extractRegion(ab, PointerToRawData, SizeOfRawData));
  }


  p('SizeOfOptionalHeader: '+shex(PEHeaderOffset+4+0x14+SizeOfOptionalHeader));
  for (var i = PointerToSymbolTable; i < PointerToSymbolTable+18*NumberOfSymbols; i+=18) {
    var Symbol = new Uint32Array(extractRegion(ab, i, 0x10), 0, 4);
    var Name = asciiString(new Uint8Array(ab, i, 8));
    var Type = (Symbol[3]>>16)&0xFFFF;
    var SectionNumber = Symbol[3]&0xFFFF;
    if (Symbol[0] === 0 && Symbol[1] !== 0) {
      Name = asciiString(new Uint8Array(ab, PointerToStringTable+Symbol[1], ab.byteLength-(PointerToStringTable+Symbol[1])));
    }
    if (Type == 0x20) {
      p(SectionNumber+' '+shex(Sections[SectionNumber]+Symbol[2])+' = '+ Name);
      db.setTag(Sections[SectionNumber]+Symbol[2], 'name', Name);
    }
  }
}

function uploadELFFile(ab) {
  var Elf32_Ehdr = new Uint32Array(ab, 0, 0x40);

  var e_ident = Elf32_Ehdr[4];

  p('e_ident '+shex(e_ident));

  var off = 0;
  var is64 = 0
  if ((e_ident & 0xFF) == 2) {
    p('64 bit detected');
    off = 3;
    is64 = 1;
    /* dropping the high half on the floor */
    var e_entry = Elf32_Ehdr[6];
    var e_phoff = Elf32_Ehdr[8];  // Program headers
    var e_shoff = Elf32_Ehdr[10];  // Section headers
  } else {
    var e_entry = Elf32_Ehdr[6];
    var e_phoff = Elf32_Ehdr[7];  // Program headers
    var e_shoff = Elf32_Ehdr[8];  // Section headers
  }

  var e_phentsize = Elf32_Ehdr[10+off]>>16;
  var e_phnum = Elf32_Ehdr[11+off]&0xFFFF;
  var e_shentsize = Elf32_Ehdr[11+off]>>16;
  var e_shnum = Elf32_Ehdr[12+off]&0xFFFF;
  var e_shstrndx = Elf32_Ehdr[12+off]>>16; // The section of section strings
  p('entry point @ '+shex(e_entry));

  var SHT_SYMTAB = 2;
  var SHT_STRTAB = 3;

  var symtab;
  var strtab;

  p(e_shstrndx);
  for (var ph = e_phoff; ph < e_phoff+(e_phnum*e_phentsize); ph += e_phentsize) {
    var phd = new Uint32Array(ab, ph, e_phentsize/4);
    if (is64) {
      var p_offset = phd[2];
      var p_vaddr = phd[4];
      var p_filesz = phd[8];
    } else {
      var p_offset = phd[1];
      var p_vaddr = phd[2];
      var p_filesz = phd[4];
    }
    p('program '+shex(ph)+'  '+shex(p_offset)+' -> '+shex(p_vaddr)+'-'+shex(p_filesz));
    //for(var i=0;i<phd.length;i++) p('  '+shex(phd[i]));
    rawcommit(p_vaddr, extractRegion(ab, p_offset, p_filesz));
  }

  var shdstr = new Uint32Array(ab, e_shoff+(e_shstrndx*e_shentsize), e_shentsize/4);
  var shstrsraw = new Uint8Array(ab, shdstr[4], shdstr[5]);
  for (var sh = e_shoff; sh < e_shoff+(e_shnum*e_shentsize); sh += e_shentsize) {
    var shd = new Uint32Array(ab, sh, e_shentsize/4);
    var sh_name_str = asciiString(shstrsraw, shd[0]);

    if (is64) {
      var sh_type = shd[1];
      var sh_flags = shd[2];
      var sh_addr = shd[4];
      var sh_offset = shd[6];
      var sh_size = shd[8];
    } else {
      var sh_type = shd[1];
      var sh_flags = shd[2];
      var sh_addr = shd[3];
      var sh_offset = shd[4];
      var sh_size = shd[5];
    }

    p(shex(sh_offset)+'  '+shex(sh_addr)+' '+sh_name_str+' '+shex(sh_size)+' '+shex(sh_type)+' '+shex(sh_flags));
    if (sh_type == SHT_SYMTAB) symtab = new Uint32Array(ab, sh_offset, sh_size/4);
    if (sh_type == SHT_STRTAB) strtab = new Uint8Array(ab, sh_offset, sh_size);
    if (sh_name_str.substr(0,6) == '.debug') {
      hexdump(new Uint8Array(extractRegion(ab, sh_offset, sh_size)));
    }
  }

  if (symtab !== undefined && strtab !== undefined) {
    for (var i=0; i<symtab.length; i+=4) {
      if (is64) {
        var st_name = symtab[i+0];
        var st_value = symtab[i+2];
        var st_size = symtab[i+4];
      } else {
        var st_name = symtab[i+0];
        var st_value = symtab[i+1];
        var st_size = symtab[i+2];
      }
      if (st_name !== 0 && st_value !== 0) {
        var name = asciiString(strtab, st_name);
        p(shex(st_value)+' = '+shex(st_name)+'('+name+')');
        db.setTag(st_value, 'name', name);
      }
    }
  }
}

function uploadMachOFile(ab, is64) {
  var LC_SEGMENT = 0x1; // segment of this file to be mapped
  var LC_SEGMENT_64 = 0x19;
  var LC_SYMTAB = 0x2; // link-edit stab symbol table info
  var LC_DYSYMTAB = 0xB; // dynamic link-edit symbol table info
  var LC_LOAD_DYLINKER = 0xE; // load a dynamic linker
  var LC_UNIXTHREAD = 0x5; // unix thread (includes a stack)
  var LC_LOAD_DYLIB = 0xC; // load a dynamicly linked shared library

  var symbols = [];
  var symbol_offsets = [];


  var mach_header = new Uint32Array(ab, 0, 0x1C);
  var ncmds = mach_header[4];
  var sizeofcmds = mach_header[5];
  if (is64) {
    var ptr_size = 8;
    var offset = 0x20;
  } else {
    var ptr_size = 4;
    var offset = 0x1C;
  }

  for (var cmd = 0; cmd < ncmds; cmd++) {
    var load_command = new Uint32Array(ab, offset, 0x8);
    p('cmd: '+shex(load_command[0])+' len '+shex(load_command[1]));
    // this is wrong, 32 bit segments can be in 64 bit files?
    if (load_command[0] == LC_SEGMENT || load_command[0] == LC_SEGMENT_64) {
      var segment_command = new Uint32Array(ab, offset, 14*4);
      var segname = asciiString(new Uint8Array(ab, offset+8, 0x10));
      if (is64) {
        var vmaddr = segment_command[6];
        var vmsize = segment_command[8];
        var fileoff = segment_command[10];
        var filesize = segment_command[12];
        var nsects = segment_command[16];
      } else {
        var vmaddr = segment_command[6];
        var vmsize = segment_command[7];
        var fileoff = segment_command[8];
        var filesize = segment_command[9];
        var nsects = segment_command[12];
      }
      p('  '+segname+': '+shex(vmaddr)+' '+shex(vmaddr+vmsize)+' in file at '+shex(fileoff)+' '+shex(fileoff+filesize));
      db.setGlobalTag("rangestart", vmaddr);
      db.setGlobalTag("rangelength", vmsize);
      db.setGlobalTag("endian", "little");

      // hacks
      db.setGlobalTag("iset", "thumb");

      var S_NON_LAZY_SYMBOL_POINTERS = 0x6;
      var S_LAZY_SYMBOL_POINTERS = 0x7;
      var S_SYMBOL_STUBS = 0x8;

      if (is64) {
        var offset_sect = offset+18*4;
      } else {
        var offset_sect = offset+14*4;
      }
      for (var sect = 0; sect < nsects; sect++) {
        var section = new Uint32Array(ab, offset_sect, 0x44 + 8);
        var sectname = asciiString(new Uint8Array(ab, offset_sect, 0x10));
        var segname = asciiString(new Uint8Array(ab, offset_sect+0x10, 0x10));
        if (is64) {
          var start = section[8];
          var len = section[10];
          /* offset, align */
          var reloff = section[14];
          var nreloc = section[15];
          var flags = section[16];
        } else {
          var reloff = section[12];
          var nreloc = section[13];
          var flags = section[14];
          var start = section[8];
          var len = section[9];
        }
        p('    '+sectname+' '+segname+' @ '+shex(section[8])+' '+shex(section[9])+' relocs '+shex(reloff)+' '+nreloc+' flags '+shex(flags));

        if ((flags&0xF) == S_SYMBOL_STUBS) {
          p('      adding '+(len/ptr_size)+' symbol offsets SYMBOL_STUBS');
          symbol_stubs = start;
          //for (var i = start; i < start+len; i+=0xC) {
          for (var i = start; i < start+len; i+=ptr_size) {
            symbol_offsets.push(i);
          }
        }

        // symbol stubs point here
        if ((flags&0xF) == S_LAZY_SYMBOL_POINTERS) {
          p('      adding '+(len/ptr_size)+' symbol offsets LAZY_SYMBOL_POINTERS');
          la_symbol_ptrs = section[8];
          for (var i = start; i < start+len; i+=ptr_size) {
            symbol_offsets.push(i);
          }
        }

        if ((flags&0xF) == S_NON_LAZY_SYMBOL_POINTERS) {
          // was 0xC in divide, maybe wrong
          p('      adding '+(len/ptr_size)+' symbol offsets NON_LAZY_SYMBOL_POINTERS');
          nl_symbol_ptrs = section[8];
          for (var i = start; i < start+len; i+=ptr_size) {
            symbol_offsets.push(i);
          }
        }

        if (is64) {
          offset_sect += 0x44 + 8;
        } else {
          offset_sect += 0x44;
        }
      }
      rawcommit(vmaddr, extractRegion(ab, fileoff, filesize));
    }
    if (load_command[0] == LC_SYMTAB) {
      p('running LC_SYMTAB');
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

        // not sure why i had this
        //if (n_desc == REFERENCE_FLAG_PRIVATE_DEFINED) {
          db.setTag(nlist[2], 'name', str);
        //}
      }
    }
    if (load_command[0] == LC_DYSYMTAB) {
      var tags = {};
      //p('running LC_DYSYMTAB');
      var dysymtab_command = new Uint32Array(ab, offset, load_command[1]);
      //for(var i=0;i<20;i++) p(shex(dysymtab_command[i]));
      p('  local symbols '+shex(dysymtab_command[2])+' len '+dysymtab_command[3]);
      p('  defined external symbols '+shex(dysymtab_command[4])+' len '+dysymtab_command[5]);
      p('  undefined symbols '+shex(dysymtab_command[6])+' len '+dysymtab_command[7]);
      var indirectsymoff = new Uint32Array(ab, dysymtab_command[14], dysymtab_command[15]);
      //p(symbols);
      //p(symbol_offsets);
      for(var indirectsym = 0; indirectsym < dysymtab_command[15]; indirectsym++) {
        var symoff = indirectsymoff[indirectsym];
        if (symbol_offsets[indirectsym] !== undefined) {
          p(shex(symoff)+' '+symbols[symoff]+' @ '+shex(symbol_offsets[indirectsym]));
          if(symoff != 0x80000000) {
            if (tags[symbol_offsets[indirectsym]] === undefined) {
              tags[symbol_offsets[indirectsym]] = {'name': symbols[symoff]};
            } else {
              p('already set '+shex(symbol_offsets[indirectsym]));
            }
            //db.setTag(symbol_offsets[indirectsym], 'name', symbols[symoff]);
          }
        } else {
          p(shex(symoff)+' '+symbols[symoff]+' NO ADDR!!');
        }
      }
      p(tags);
      setMultiTagAsync(JSON.stringify(tags), function() { p('tags uploaded') });
    }
    if (load_command[0] == LC_LOAD_DYLIB) {
      var dylib_command = new Uint32Array(ab, offset, load_command[1]);
      var lc_str = asciiString(new Uint8Array(ab, offset+dylib_command[2], load_command[1]-dylib_command[2]));
      p('  '+lc_str);
    }
    offset += load_command[1];
  }
}

