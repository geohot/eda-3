// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#ifndef EDA_CORE_H_
#define EDA_CORE_H_

#include "edadb/memory.h"
using namespace edadb;

class Core {
 public:
  Core();

// really shouldn't be public
// done for testing, though black box step tests would be much better
// get and set just make setup too easy
  void init() {
    commit.clear();
  }
  uint64_t done() {
    return Memory::Inst()->commitExtents(commit);
  }

  uint32_t get32(uint64_t addr) { return get(addr, 4); }
  uint16_t get16(uint64_t addr) { return get(addr, 2); }
  uint8_t get8(uint64_t addr) { return get(addr, 1); }
  uint64_t get(uint64_t addr, int len);

  void set32(uint64_t addr, uint32_t data) { return set(addr, data, 4); }
  void set16(uint64_t addr, uint16_t data) { return set(addr, data, 2); }
  void set8(uint64_t addr, uint8_t data) { return set(addr, data, 1); }
  void set(uint64_t addr, uint64_t data, int len);

  // override for each processor
  virtual uint64_t step();

  bool error;
 private:
  ExtentsMap commit;
};

// MMIO shit is part of core
#include <v8.h>
using namespace v8;

class MMIO {
 public:
  static MMIO* Inst();
  Handle<Value> exec(string src);
  uint64_t execr(string src);
  void execw(string src, uint64_t data, int len);

  void setCore(Core* core);
 protected:
  MMIO();
 private:
  static MMIO* inst_;
  static Core* core_;
  HandleScope handle_scope;
  Handle<ObjectTemplate> global;

// extra shit
  static Handle<Value> GetCallback(const Arguments&);
  static Handle<Value> SetCallback(const Arguments&);
};

#endif  // EDA_CORE_H

