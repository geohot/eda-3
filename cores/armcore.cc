// EDA3 - geohot's internal tool of the gods
// Copyright 2012 George Hotz. All rights reserved.

#include "cores/armcore.h"

#include <iostream>
#include <map>
using std::make_pair;
using std::cout;
using std::endl;

#define lsl(x, a) (x<<a)
#define lsr(x, a) (x>>a)
#define asr(x, a) (x>>a)
#define ror(x, a) ((x>>a) | (x<<(32-a)))
#define SignExtend(x, b) ((x) | (((x) & (1 << (b-1)))?(0xFFFFFFFF<<b):0))

uint32_t ARMCore::shift(uint32_t op, int shift_type, uint32_t amount) {
  switch (shift_type) {
    case SHIFT_LSL: return lsl(op, amount);
    case SHIFT_LSR: return lsr(op, amount);
    case SHIFT_ASR: return asr(op, amount);
    case SHIFT_ROR: return ror(op, amount);
  }
}

// one big function, yay!
uint64_t ARMCore::step() {
  init();
// fetch the PC
  PC = get32(R(REG_PC));
// fetch the instruction
  opcode = get32(PC-8);
  encodingARM = ARMInstruction::getEncodingARM(opcode);
  in = (templateInstructionARM *)&opcode;
  templateRegisterCPSR cpsr;
  cpsr.cpsr = get32(R(REG_CPSR));
// check for thumb
  if (cpsr.T) {
    printf("thumb not implemented\n");
    return done();
  }
// check the condition
  bool cond_good = true;
  if (in->generic.cond != 0xE) {
    bool N = cpsr.N;
    bool Z = cpsr.Z;
    bool C = cpsr.C;
    bool V = cpsr.V;
    switch (in->generic.cond) {
      case COND_EQ: cond_good = Z; break;
      case COND_NE: cond_good = !Z; break;
      case COND_HS: cond_good = C; break;
      case COND_LO: cond_good = !C; break;
      case COND_MI: cond_good = N; break;
      case COND_PL: cond_good = !N; break;
      case COND_VS: cond_good = V; break;
      case COND_VC: cond_good = !V; break;

      case COND_HI: cond_good = C && !Z; break;
      case COND_LS: cond_good = !C || Z; break;
      case COND_GE: cond_good = N == V; break;
      case COND_LT: cond_good = N != V; break;
      case COND_GT: cond_good = !Z && (N==V); break;
      case COND_LE: cond_good = Z || (N!=V); break;
    }
  }
  
  //printf("has encoding %s\n", encodingsARM[encodingARM]);

if (cond_good == true) {
// do the processing here
  switch (encodingARM) {
    case ARM_DPIS: //Data processing immediate shift
    case ARM_DPRS: //Data processing register shift
    case ARM_DPI: //Data processing immediate
      doDataProcessing(); break;
    case ARM_LSIO: //Load/store immediate offset
    case ARM_LSRO: //Load/store register offset
    case ARM_MELS: //Multiply extra loads stores
      doLoadStore(); break;
    case ARM_LSM: //Load/store multiple
      doLoadStoreMultiple(); break;
    case ARM_MI: //Miscellaneous instructions
    case ARM_MISR: //Move immediate to status register
      doMiscellaneous(); break;
    case ARM_BBL: //Branch and branch with link
      doBranches(); break;
    case ARM_CLS: //Coprocessor load/store and double register transfers
    case ARM_CDP: //Coprocessor data processing
    case ARM_CRT: //Coprocessor register transfers
      doCoprocessor(); break;
    case ARM_SWI: //Software interrupt
      doSoftwareInterrupt(); break;
    default:
      printf("unknown instruction %8.8X\n", opcode);
  }
} else {
  set32(R(REG_PC), PC+4);
}

// and it's gone...
  return done();
}

#define SYS_WRITE 5
#define SYS_EXIT 0x18

void ARMCore::doSoftwareInterrupt() {
  set32(R(REG_PC), PC+4);
  uint32_t R0 = get32(R(0));
  uint32_t R1 = get32(R(1));
  uint32_t swi = in->swi.swi_number;
  printf("SWI %X @ %X --  R0: %X  R1: %X\n", swi, PC-8, R0, R1);
  if (swi == 0x123456) {
    if (R0 == SYS_WRITE) {
      uint32_t fs = get32(R1+0);
      uint32_t buf = get32(R1+4);
      uint32_t count = get32(R1+8);
      printf("  SYS_WRITE(%X,%X,%X): ", fs, buf, count);
      ExtentsReq req;
      ExtentsMap resp;
      req.insert(make_pair(buf, count));
      Memory::Inst()->fetchExtents(resp, req, 0, true);
      cout << resp[buf] << endl;
    }
    if (R0 == SYS_EXIT) {
      error = true;
    }
    set32(R(0), 0);
  }
}

void ARMCore::doCoprocessor() {
  switch (encodingARM) {
    case ARM_CLS:
      printf("CLS: not implemented\n");
      break;
    case ARM_CDP:
      printf("CDP: not implemented\n");
      break;
    case ARM_CRT:
      printf("CRT: not implemented\n");
      // this imp is so wrong
      /*if (in->crt.L) {
        set32(R(in->crt.Rd), get32(CR(in->crt.cp_num)));
      } else {
        set32(R(in->crt.cp_num), get32(CR(in->crt.Rd)));
      }*/
      break;
  }

  set32(R(REG_PC), PC+4);
}

void ARMCore::doDataProcessing() {
  uint32_t Rn = get32(R(in->generic.Rn));
  uint32_t op2;
  uint32_t Rd; // 64

  switch (encodingARM) {
    case ARM_DPIS:
      op2 = shift(get32(R(in->dpis.Rm)), in->dpis.shift, in->dpis.shift_imm);
      break;
    case ARM_DPRS:
      op2 = shift(get32(R(in->dprs.Rm)), in->dprs.shift, get32(R(in->dprs.Rs)));
      break;
    case ARM_DPI:
      op2 = ror(in->dpi.immed, in->dpi.rotate*2);
      break;
  }

  switch (in->dpi.opcode) {
    case OPCODE_AND: Rd = Rn & op2; break;
    case OPCODE_EOR: Rd = Rn ^ op2; break;
    case OPCODE_SUB: Rd = Rn - op2; break;
    case OPCODE_RSB: Rd = op2 - Rn; break;
    case OPCODE_ADD: Rd = Rn + op2; break;
    case OPCODE_ADC: Rd = Rn + op2; break;
    case OPCODE_SBC: Rd = Rn - op2; break;
    case OPCODE_RSC: Rd = Rn - op2; break;
    case OPCODE_TST: Rd = Rn & op2; break;
    case OPCODE_TEQ: Rd = Rn & op2; break;
    case OPCODE_CMP: Rd = Rn - op2; break;
    case OPCODE_CMN: Rd = Rn + op2; break;
    case OPCODE_ORR: Rd = Rn | op2; break;
    case OPCODE_MOV: Rd = op2; break;
    case OPCODE_BIC: Rd = Rn & (~op2); break;
    case OPCODE_MVN: Rd = ~op2; break;
  }

  if (in->dpi.S) {
    // update flags
    templateRegisterCPSR cpsr;
    cpsr.cpsr = get32(R(REG_CPSR))&0x0FFFFFFF;

    cpsr.Z = (Rd == 0);
    cpsr.N = (Rd & 0x80000000);

    switch (in->dpi.opcode) {
      case OPCODE_SUB:
      case OPCODE_CMP:
        cpsr.C = Rn >= op2;
        cpsr.V = Rn < op2;
        break;
      case OPCODE_ADD:
      case OPCODE_CMN:
        cpsr.C = ((uint64_t)Rn+(uint64_t)op2)>>32LL;
        cpsr.V = ((uint64_t)Rn+(uint64_t)op2)>>32LL;
        break;
    }
    set32(R(REG_CPSR), cpsr.cpsr);
  }

  if (in->generic.Rd == REG_PC) {
    Rd += 8;
  } else {
    set32(R(REG_PC), PC+4);
  }

  if (in->dpi.opcode < OPCODE_TST || in->dpi.opcode > OPCODE_CMN) {
    set32(R(in->generic.Rd), Rd);
  }
}

void ARMCore::doLoadStore() {
  uint32_t offset;
  uint32_t addr;
  switch (encodingARM) {
    case ARM_LSIO: //Load/store immediate offset
      offset = in->lsio.immed;
      break;
    case ARM_LSRO: //Load/store register offset
      offset = shift(get32(R(in->lsro.Rm)), in->lsro.shift, in->lsro.shift_imm);
      break;
    case ARM_MELS:
      if (in->mels.I) {
        offset = ((in->mels.addr_mode_hi) << 4) | in->mels.addr_mode_lo;
      } else {
        offset = get32(R(in->lsro.Rm));
      }
      break;
  }
  if (!(in->lsio.U)) offset *= -1;

  if (in->lsio.P) {
    addr = offset + get32(R(in->generic.Rn));
  } else {
    addr = get32(R(in->generic.Rn));
  }

  // writeback
  if (in->lsio.W) {
    set32(R(in->generic.Rn), addr);
  }

  // post indexed
  if (!in->lsio.P) {
    set32(R(in->generic.Rn), addr+offset);
  }

  int bits = 4;
  if (encodingARM == ARM_MELS) {
    if (in->mels.H) bits = 2;
  } else if (in->lsio.B) {
    bits = 1;
  }

  if (in->lsio.L) {
    if (in->generic.Rd == REG_PC) {
      set(R(in->generic.Rd), get(addr, bits)+8, 4);
    } else {
      set(R(in->generic.Rd), get(addr, bits), 4);
    }
  } else {
    set(addr, get32(R(in->generic.Rd)), bits);
  }

  if (in->generic.Rd != REG_PC) {
    set32(R(REG_PC), PC+4);
  }
}

void ARMCore::doLoadStoreMultiple() {
  // P == 0 is after, P == 1 is before
  // U == 1 is increment, U == 0 is decrement

  uint32_t addr = get32(R(in->lsm.Rn));

  int rl = in->lsm.register_list;
  for (int rrn = 0; rrn <= 15; rrn++) {
    int rn = rrn;
    if (!in->lsm.U) rn = 15-rn; // reverse the order, hacky a little
    if ((rl>>rn)&1) {
      if (in->lsm.P) addr += 4*((in->lsm.U)?1:-1);

      if (in->lsm.L) {
        if (rn == REG_PC) {
          set32(R(rn), get32(addr)+8);
        } else {
          set32(R(rn), get32(addr));
        }
      } else {
        set32(addr, get32(R(rn)));
      }
      
      if (!(in->lsm.P)) addr += 4*((in->lsm.U)?1:-1);
    }
  }

  if (in->lsm.W) set32(R(in->lsm.Rn), addr);

  if (!(in->lsm.register_list & 0x8000) || !in->lsm.L) {
    set32(R(REG_PC), PC+4);
  }
}

void ARMCore::doMiscellaneous() {
  if ((opcode & 0x0FF000D0) == 0x01200010) { // BX or BLX
    if (opcode & 0x20) {
      set32(R(REG_LR), PC-4);
    }
    uint32_t target = get32(R(in->generic.Rm));
    if (target&1) {
      // switch to thumb
      templateRegisterCPSR cpsr;
      cpsr.cpsr = get32(R(REG_CPSR));
      cpsr.T = 1;
      set32(R(REG_CPSR), cpsr.cpsr);
    }
    set32(R(REG_PC), target+8);
  } else {
    set32(R(REG_PC), PC+4);
  }
}

void ARMCore::doBranches() {
  if (in->bbl.L) {
    set32(R(REG_LR), PC-4);
  }

  set32(R(REG_PC), SignExtend(in->bbl.offset<<2, 26)+8+PC);
}

namespace ARMInstruction {

int getEncodingARM(uint32_t opcode) {
  if ((opcode & 0x0E000090) == 0x00000090)
    return ARM_MELS;

  if ((opcode & 0x0F900000) == 0x01000000)
    return ARM_MI;

  if ((opcode & 0x0E000010) == 0x00000000)
    return ARM_DPIS;
  if ((opcode & 0x0E000090) == 0x00000010)
    return ARM_DPRS;

  if ((opcode & 0x0FB00000) == 0x03200000)
    return ARM_MISR;
  if ((opcode & 0x0E000000) == 0x02000000)
    return ARM_DPI;

  if ((opcode & 0x0E000000) == 0x04000000)
    return ARM_LSIO;
  if ((opcode & 0x0E000010) == 0x06000000)
    return ARM_LSRO;

  if ((opcode & 0x0E000000) == 0x08000000)
    return ARM_LSM;

  if ((opcode & 0x0E000000) == 0x0A000000)
    return ARM_BBL;

  if ((opcode & 0x0E000000) == 0x0C000000)
    return ARM_CLS;
  if ((opcode & 0x0F000010) == 0x0E000000)
    return ARM_CDP;
  if ((opcode & 0x0F000010) == 0x0E000010)
    return ARM_CRT;

  if ((opcode & 0x0F000000) == 0x0F000000)
    return ARM_SWI;

  return ARM_UNKNOWN;
}

}

