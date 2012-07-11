// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/memory.h"
#include "gtest/gtest.h"

#include "armcore/armcore.h"

#include <pthread.h>

using namespace edadb;

extern void start_edadb();

void* server_thread(void* no) {
  start_edadb();
}

class ARMCoreTest : public testing::Test {
 public:
  ARMCoreTest() {
    pthread_t thread;
    pthread_create(&thread, NULL, server_thread, NULL);
    usleep(10000);
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

TEST_F(ARMCoreTest, PUSHPOP) {
  ARMCore ac;
  ac.init();
  ac.set32(R(0), 0x1234);
  ac.set32(R(1), 0x5678);
  ac.set32(R(13), 0x1000);
  ac.set32(R(15), 0x8);

  ac.set32(0, 0xe92d0003); // push {r0, r1}
  ac.set32(4, 0xe8bd0003); // pop {r0, r1}
  ac.done();

  ac.step();

  ac.init();
  ac.set32(R(0), 0);
  ac.set32(R(1), 0);
  ac.done();

  ac.step();

  EXPECT_EQ(0x1234, ac.get32(R(0)));
  EXPECT_EQ(0x5678, ac.get32(R(1)));
}

TEST_F(ARMCoreTest, LDRH) {
  ARMCore ac;
  ac.init();
  ac.set32(0x10010, 0xABCDEF12);
  ac.set32(R(1), 0x10000);
  ac.set32(R(15), 0x8);
  ac.set32(0, 0xE1D121B2); // LDRH R2, [R1, #0x12]
  ac.done();

  ac.step();

  EXPECT_EQ(0xABCD, ac.get32(R(2)));
}

TEST_F(ARMCoreTest, STRwriteback) {
  ARMCore ac;
  ac.init();
  ac.set32(R(11), 0x99887766);
  ac.set32(R(13), 0x10000);
  ac.set32(R(15), 0x8);
  ac.set32(0, 0xE52DB004); // STR R11, [SP, #-4]!
  ac.done();

  ac.step();

  EXPECT_EQ(0x99887766, ac.get32(0xFFFC));
  EXPECT_EQ(0xFFFC, ac.get32(R(13)));
}

TEST_F(ARMCoreTest, SimpleProgram) {
  Memory::Inst()->readFromFile("/Users/geohot/eda-3/armcore/tests/simple/simple.edb");

  //system("node ~/eda-3/armcore/tests/elfloader.js ~/eda-3/armcore/tests/simple/simple");
  ARMCore ac;
  
  int count = 0;

  while (ac.get32(R(15)) != 0x20008) {
    ac.step();
    count++;
  }
  
  printf("ran %d instructions\n", count);

  EXPECT_EQ(0x20008, ac.get32(R(15)));
  EXPECT_EQ(0x20000, ac.get32(R(14)));
  EXPECT_EQ(0x10000, ac.get32(R(13)));
  EXPECT_EQ(0x1234AABB, ac.get32(R(0)));
}


TEST_F(ARMCoreTest, SimpleProgramWithServer) {
// upload the elf file
  system("node ~/eda-3/armcore/tests/elfloader.js ~/eda-3/armcore/tests/simple/simple");

  ARMCore ac;
  ac.init();
  ac.set32(R(13), 0x10000);
  ac.set32(R(14), 0x20000);
  ac.set32(R(15), 0x8008);
  ac.done();

  int count = 0;
  while (ac.get32(R(15)) != 0x20008) {
    ac.step();
    count++;
  }
  
  printf("ran %d instructions\n", count);

  EXPECT_EQ(0x20008, ac.get32(R(15)));
  EXPECT_EQ(0x20000, ac.get32(R(14)));
  EXPECT_EQ(0x10000, ac.get32(R(13)));
  EXPECT_EQ(0x1234AABB, ac.get32(R(0)));
}

