// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include <sstream>
#include <map>
using std::make_pair;

#include "cores/core.h"

Core::Core() {
  error = false;
  
  // last constructed is used
  MMIO::Inst()->setCore(this);
}

// ***really generic core shit***

// wtf, why do i need this?
uint64_t Core::step() {
  printf("I can't step, I'm a generic core\n");
  return 0;
}

// set32, set16, and set8 defined in header
void Core::set(uint64_t addr, uint64_t data, int len) {
  string mmio = Memory::Inst()->getTag(addr, "mmio");
  if (mmio != "") {
    MMIO::Inst()->execw(mmio, data, len);
  }
  // like write this bro
  string r = "";
  for (int i = 0; i < len; i++) {
    r.push_back(data&0xFF);
    data >>= 8;
  }

  commit.insert(make_pair(addr, r));
}

// get32, get16, and get8 defined in header
uint64_t Core::get(uint64_t addr, int len) {
  ExtentsReq req;
  ExtentsMap resp;
  req.insert(make_pair(addr, len));
  Memory::Inst()->fetchExtents(resp, req, 0, true);

  string mmio = Memory::Inst()->getTag(addr, "mmio");
  if (mmio != "") {
    // don't get the real value, but still mark the read
    return MMIO::Inst()->execr(mmio);
  }

  string r = resp[addr];
  uint64_t ret = 0;
  // little endian
  for (int i = r.length()-1; i >= 0; i--) {
    ret <<= 8;
    ret |= ((uint8_t)r[i]) & 0xFF;
  }
  return ret;
}

// have to init the statics
MMIO* MMIO::inst_ = NULL;
Core* MMIO::core_ = NULL;

MMIO* MMIO::Inst() {
  if (inst_ == NULL) {
    inst_ = new MMIO();
  }
  return inst_;
}

MMIO::MMIO() {
  printf("MMIO being constructed\n");
  //context = Context::New();
  global = ObjectTemplate::New();
  global->Set(String::New("get"), FunctionTemplate::New(GetCallback));
  global->Set(String::New("set"), FunctionTemplate::New(SetCallback));
}

void MMIO::setCore(Core* core) {
  core_ = core;
}

Handle<Value> MMIO::GetCallback(const Arguments& args) {
  if (args.Length() == 2) {
    printf("MMIO get callback called\n");
    for (int i = 0; i < 2; i++) {
      if (args[i]->IsNumber() == false) {
        printf("arg %d isn't number :(\n", i);
        return Integer::New(-1);
      }
    }
    uint64_t val = core_->get(args[0]->IntegerValue(), args[1]->IntegerValue());
    return Integer::NewFromUnsigned(val);
  }
}

Handle<Value> MMIO::SetCallback(const Arguments& args) {
  if (args.Length() == 3) {
    printf("MMIO set callback called\n");
    for (int i = 0; i < 3; i++) {
      if (args[i]->IsNumber() == false) {
        printf("arg %d isn't number :(\n", i);
        return Integer::New(-1);
      }
    }
    core_->set(args[0]->IntegerValue(), args[1]->IntegerValue(), args[2]->IntegerValue());
  }
  return Integer::New(0);
}

Handle<Value> MMIO::exec(string src) {
  // some of this can go to constructor?
  Persistent<Context> context = Context::New(NULL, global);
  Context::Scope context_scope(context);  // why never ref?

  Handle<String> source = String::New(src.c_str());
  Handle<Script> script = Script::Compile(source);

  Handle<Value> result = script->Run();

  context.Dispose();

  return result;
}

uint64_t MMIO::execr(string src) {
  std::stringstream jscode;
  jscode << "m(null,null); function m(d,l) { " << src << "}";
  return exec(jscode.str())->IntegerValue();
}

void MMIO::execw(string src, uint64_t data, int len) {
  std::stringstream jscode;
  jscode << "m(" << data << ", " << len << "); function m(d,l) { " << src << "}";

  //printf("test: %s\n", jscode.str().c_str());
  
  exec(jscode.str());
}

