import distorm3
from elftools.elf.elffile import ELFFile

def go(f, daddr, tags):
  e = ELFFile(f)
  for seg in e.iter_segments():
    dat = seg.data()
    print seg.header
    for c in range(len(dat)):
      daddr[seg['p_vaddr']+c] = ord(dat[c])
  for sec in e.iter_sections():
    print sec.name, sec.header
    if sec['sh_flags'] & 4:
      dat = sec.data()
      for op in distorm3.DecomposeGenerator(sec['sh_addr'], dat, distorm3.Decode64Bits):
        p = "\\t{\\o{"+op.mnemonic+"}}"
        f = False
        for i in op.operands:
          if f == False:
            f = True
          else:
            p += ", "
          if i.type == "Immediate":
            p += "\\i{"+str(i.value)+"}"
          else:
            p += str(i)
          print i.type, dir(i)
        tags[op.address]['len'] = str(op.size)
        tags[op.address]['parsed'] = str(p)
        tags[op.address]['endian'] = 'little'
        print op.mnemonic, op.flowControl, op.size
        print dir(op)
  return hex(e.header['e_entry'])

