// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDA_ARMCORE_H_
#define EDA_ARMCORE_H_


#include "edadb/memory.h"
using namespace edadb;

#include "armcore/armtemplate.h"

#define R(x) (0xEDA00000+x*4)
//#define CR(x) (0xEDA00000+(18+x)*4)

// R0 is 0xEDA00000

// all can be made generic later
// a core is a black box that exports a step function
// a step function is guaranteed to do one commit
// returns the commit number

// i guess put thumb in here too
// hackiness for the win, and it really is one core

class ARMCore {
 public:
  ARMCore() {
  }
  uint64_t step();

// really shouldn't be public
// done for testing, though black box step tests would be much better
// get and set just make setup too easy
  void init() {
    commit.clear();
  }
  uint64_t done() {
    return Memory::Inst()->commitExtents(commit);
  }

  uint32_t shift(uint32_t op, int shift_type, uint32_t amount);

  uint32_t get32(uint64_t addr) { return get(addr, 4); }
  uint16_t get16(uint64_t addr) { return get(addr, 2); }
  uint8_t get8(uint64_t addr) { return get(addr, 1); }
  uint64_t get(uint64_t addr, int len);

  void set32(uint64_t addr, uint32_t data) { return set(addr, data, 4); }
  void set16(uint64_t addr, uint16_t data) { return set(addr, data, 2); }
  void set8(uint64_t addr, uint8_t data) { return set(addr, data, 1); }
  void set(uint64_t addr, uint64_t data, int len);

 private:
  void doDataProcessing();
  void doLoadStore();
  void doLoadStoreMultiple();
  void doMiscellaneous();
  void doBranches();
  void doCoprocessor();
  ExtentsMap commit;
  uint32_t opcode;
  templateInstructionARM *in;
  int encodingARM;
  uint32_t PC;
};

namespace ARMInstruction {
  int getEncodingARM(uint32_t opcode);
}

#endif  // EDA_ARMCORE_H_

