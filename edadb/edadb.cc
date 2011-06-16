// EDA3 - geohot's internal tool of the gods
// Copyright 2011 George Hotz. All rights reserved.

#include <iostream>

#include "edadb/memory.h"

#include "edadb/gen-cpp/EDAdb.h"
#include <protocol/TBinaryProtocol.h>
#include <server/TSimpleServer.h>
#include <transport/TServerSocket.h>
#include <transport/TBufferTransports.h>

using namespace ::apache::thrift;
using namespace ::apache::thrift::protocol;
using namespace ::apache::thrift::transport;
using namespace ::apache::thrift::server;

using namespace edadb;

using boost::shared_ptr;
using std::cout;
using std::endl;

class EDAdbHandler : virtual public EDAdbIf {
 public:
  EDAdbHandler() {
  }

  int64_t commitExtents(const std::map<int64_t, std::string>& extentsmap) {
    uint64_t ret =  Memory::Inst()->commitExtents((const ExtentsMap&)extentsmap);
    cout << "commited " << ret << endl;
    return ret;
  }

  void fetchExtents(std::map<int64_t, std::string>& _return,
                    const std::map<int64_t, int32_t> & extentreqs,
                    const int64_t changenumber,
                    const bool tag) {
    cout << "fetching extents for change " << changenumber << endl;
    Memory::Inst()->fetchExtents((ExtentsMap&)_return,
                                 (const ExtentsReq&)extentreqs,
                                 changenumber,
                                 tag);
  }

  void getMatchingList(std::set<int64_t> & _return,
                       const std::map<int64_t, std::string>& searchpattern) {
    Memory::Inst()->getMatchingList((ChangelistList&)_return,
                                    (const ExtentsMap&)searchpattern);
  }

  void getWriterList(std::set<int64_t>& _return, const int64_t address) {
    Memory::Inst()->getWriterList((ChangelistList&)_return, address);
  }

  void getReaderList(std::set<int64_t>& _return, const int64_t address) {
    Memory::Inst()->getReaderList((ChangelistList&)_return, address);
  }

  int64_t getMaxChangelist() {
    return Memory::Inst()->getMaxChangelist();
  }

  void getChangelistWrittenExtents(std::map<int64_t, std::string>& _return,
                                   const int64_t changenumber) {
    Memory::Inst()->getChangelistWrittenExtents((ExtentsMap&)_return, changenumber);
  }

  void getChangelistReadExtents(std::map<int64_t, std::string>& _return,
                                const int64_t changenumber) {
    Memory::Inst()->getChangelistReadExtents((ExtentsMap&)_return, changenumber);
  }

  void getTags(std::map<std::string, std::string> & _return, const int64_t address) {
    Memory::Inst()->getTags(_return, address);
  }

  void setTag(const int64_t address, const std::string& tagname, const std::string& data) {
    Memory::Inst()->setTag(address, tagname, data);
  }

  void getTagsInRange(std::map<int64_t, std::map<std::string, std::string> > & _return,
                      const int64_t address_start,
                      const int64_t address_end) {
    // this is a naive way of writing this
    uint64_t i;
    uint64_t start = address_start;
    uint64_t end = address_end;
    for (i = start; i < end; i++) {
      std::map<std::string, std::string> _retlocal;
      Memory::Inst()->getTags(_retlocal, i);
      if (_retlocal.size() > 0) {
        _return.insert(std::make_pair(i,_retlocal));
      }
    }
  }
};

int main(int argc, char** argv) {
  int port = 9090;
  shared_ptr<EDAdbHandler> handler(new EDAdbHandler());
  shared_ptr<TProcessor> processor(new EDAdbProcessor(handler));
  shared_ptr<TServerTransport> serverTransport(new TServerSocket(port));
  shared_ptr<TTransportFactory> transportFactory(new TBufferedTransportFactory());
  shared_ptr<TProtocolFactory> protocolFactory(new TBinaryProtocolFactory());

  TSimpleServer server(processor,
                       serverTransport,
                       transportFactory,
                       protocolFactory);

  printf("starting the EDAdb...\n");
  server.serve();
  printf("exiting...\n");
  return 0;
}

