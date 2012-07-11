// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/memory.h"
#include "gtest/gtest.h"

#include "armcore/armcore.h"

using namespace edadb;

class ARMCoreTest : public testing::Test {
 public:
  ARMCoreTest() {
  }
 protected:
  virtual void SetUp() {
  }
};

TEST_F(ARMCoreTest, GetAndSet) {
  ARMCore ac;
  ac.init();
  ac.set32(R(0), 0x99AABBCC);
  ac.set8(0, 0xDD);
  ac.done();

  EXPECT_EQ(0x99AABBCC, ac.get32(R(0)));
  EXPECT_EQ(0xCC, ac.get8(R(0)));
  EXPECT_EQ(0xDD, ac.get8(0));
}

TEST_F(ARMCoreTest, AddR0R1R2) {
  ARMCore ac;
  ac.init();
  ac.set32(R(15), 0x8);
// add r2, r0, r1  
  ac.set32(0, 0xe0802001);
  ac.set32(R(0), 0x11223344);
  ac.set32(R(1), 0x55667788);
  ac.done();

// do the step...
  ac.step();

  EXPECT_EQ(0x11223344+0x55667788, ac.get32(R(2)));
  EXPECT_EQ(0xC, ac.get32(R(15)));
}

TEST_F(ARMCoreTest, B24) {
  ARMCore ac;
  ac.init();
  ac.set32(R(15), 0x8);
// b 0x24
  ac.set32(0, 0xea000007);
  ac.done();

// do the step...
  ac.step();

  EXPECT_EQ(0x24+8, ac.get32(R(15)));
}

TEST_F(ARMCoreTest, BICR0) {
  ARMCore ac;
  ac.init();
  ac.set32(R(0), 0xFFFFFFFF);
  ac.set32(R(15), 0x30);
// bic R0, R0, #0x2000
  ac.set32(0x28, 0xE3C00D80);
  ac.done();

// do the step...
  ac.step();

  EXPECT_EQ(0xFFFFDFFF, ac.get32(R(0)));
  EXPECT_EQ(0x34, ac.get32(R(15)));
}

TEST_F(ARMCoreTest, CMPSBLO) {
  ARMCore ac;
  ac.init();
  ac.set32(R(0), 0x10000);
  ac.set32(R(1), 0x10004);

  ac.set32(0xA4, 0xe3a02000);
  ac.set32(0xA8, 0xe1500001);
  ac.set32(0xAC, 0x34802004);
  ac.set32(0xB0, 0x3AFFFFFB);

  ac.set32(R(15), 0xAC);
  ac.done();

  ac.step();
  ac.step();
  ac.step();
  ac.step();

  printf("cpsr: %8.8X\n", ac.get32(R(16)));

  EXPECT_EQ(0x10004, ac.get32(R(0)));
  EXPECT_EQ(0x10004, ac.get32(R(1)));
  EXPECT_EQ(0xAC, ac.get32(R(15)));

  ac.step();
  ac.step();
  ac.step();
  ac.step();

  printf("cpsr: %8.8X\n", ac.get32(R(16)));


  EXPECT_EQ(0xAC+0x10, ac.get32(R(15)));
}


