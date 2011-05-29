// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include "edadb/byte.h"
#include "gtest/gtest.h"

namespace edadb {

class ByteTest : public testing::Test {
 protected:
  virtual void SetUp() {
    t1_.commit(1, 0xAA);
    t1_.commit(2, 0xBB);
    t1_.commit(5, 0xCC);
  }
  Byte t0_;
  Byte t1_;
};


TEST_F(ByteTest, SimpleGet) {
  EXPECT_EQ(0xAA, t1_.get(1));
}

TEST_F(ByteTest, GetFromEmpty) {
  EXPECT_EQ(0, t0_.get(0));
}

TEST_F(ByteTest, GetLatestWithZero) {
  EXPECT_EQ(0xCC, t1_.get(0));
}

TEST_F(ByteTest, GetNonExistentChange) {
  EXPECT_EQ(0xBB, t1_.get(4));
}

}  // namespace edadb

