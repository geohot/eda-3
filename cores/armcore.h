// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDA_ARMCORE_H_
#define EDA_ARMCORE_H_

#include "cores/core.h"
#include "cores/armtemplate.h"

#define R(x) (0xEDA00000+x*4)
//#define CR(x) (0xEDA00000+(18+x)*4)

// R0 is 0xEDA00000

// all can be made generic later
// a core is a black box that exports a step function
// a step function is guaranteed to do one commit
// returns the commit number

// i guess put thumb in here too
// hackiness for the win, and it really is one core

class ARMCore : public Core {
 public:
  ARMCore() {
  }

  uint64_t step();
 private:
  uint32_t shift(uint32_t op, int shift_type, uint32_t amount);

  void doDataProcessing();
  void doLoadStore();
  void doLoadStoreMultiple();
  void doMiscellaneous();
  void doBranches();
  void doCoprocessor();
  void doSoftwareInterrupt();
  uint32_t opcode;
  templateInstructionARM *in;
  int encodingARM;
  uint32_t PC;
};

namespace ARMInstruction {
  int getEncodingARM(uint32_t opcode);
}

#endif  // EDA_ARMCORE_H_

