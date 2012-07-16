// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "cores/armcore.h"
#include "gtest/gtest.h"

class MMIOTest : public testing::Test {
 public:
  MMIOTest() {
  }
};

TEST_F(MMIOTest, HelloWorld) {
  Handle<Value> result = MMIO::Inst()->exec("'Hello' + ' World'");

  // not function, typecast op+ dumb
  String::AsciiValue ascii(result);
  EXPECT_STREQ("Hello World", *ascii);
}

TEST_F(MMIOTest, GetFunction) {
  ARMCore ac;
  ac.init();
  ac.set32(0x1234, 0xAABBCCDD);
  ac.done();
  // test this shit
  Handle<Value> result = MMIO::Inst()->exec("get(0x1234, 4)");
  uint64_t val = result->IntegerValue();
  EXPECT_EQ(0xAABBCCDD, val);
}

TEST_F(MMIOTest, SetFunction) {
  ARMCore ac;

  ac.init();
  MMIO::Inst()->exec("set(0x1234, 0x55667788, 4)");
  ac.done();

  EXPECT_EQ(0x55667788, ac.get32(0x1234));
}

TEST_F(MMIOTest, execr) {
  ARMCore ac;
  EXPECT_EQ(0x5566, MMIO::Inst()->execr("return 0x5566;"));
}

TEST_F(MMIOTest, MMIOFunction) {
  ARMCore ac;
  ac.init();
  ac.set32(0x1234, 0xAABBCCDD);
  ac.done();

  EXPECT_EQ(0xAABBCCDD, ac.get32(0x1234));

  // actually sets address 0x10
  // always returns 0x565656
  Memory::Inst()->setTag(0x1234, "mmio", "if(d != null) { set(0x10, d, l); } else { return 0x565656; }");

  ac.init();
  ac.set32(0x1234, 0x111222);
  ac.done();

  EXPECT_EQ(0x111222, ac.get32(0x10));
  EXPECT_EQ(0x565656, ac.get32(0x1234));
}

