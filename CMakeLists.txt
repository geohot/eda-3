cmake_minimum_required(VERSION 2.6)

message("this is eda")

PROJECT(eda3)
SET(EDADB_SRCS
./edadb/byte.cc
./edadb/memory.cc
./cores/core.cc
./cores/armcore.cc
./edadb/edadb.cc
./edadb/gen-cpp/EDAdb.cpp
./edadb/gen-cpp/edadb_constants.cpp
./edadb/gen-cpp/edadb_types.cpp
)
INCLUDE_DIRECTORIES(./)
INCLUDE_DIRECTORIES(/opt/local/include)
INCLUDE_DIRECTORIES(/opt/local/include/thrift)
INCLUDE_DIRECTORIES(~/devtools/thrift-0.6.0/lib/cpp/src)
INCLUDE_DIRECTORIES(~/devtools/thrift-0.6.1/lib/cpp/src)
INCLUDE_DIRECTORIES(~/devtools/v8/include)
LINK_DIRECTORIES(/opt/local/lib)
LINK_DIRECTORIES(~/devtools/v8/out/native)
ADD_LIBRARY(edadb ${EDADB_SRCS})
ADD_EXECUTABLE(edadb_server
./edadb/main.cc
)
TARGET_LINK_LIBRARIES(edadb_server edadb "thrift" "boost_serialization" "v8_base" "v8_snapshot")

#-----testing below this line-----
SET(GTEST_DIR ~/devtools/gtest-1.6.0)

# tilde doesn't work in EXISTS, fuck you cmake
if(IS_DIRECTORY "/Users/geohot/devtools/gtest-1.6.0")
  message("including tests")
  SET(EDADB_TESTS
  ./edadb/byte_test.cc
  ./edadb/memory_test.cc
  ./cores/armcore_test.cc
  ./cores/mmio_test.cc
  )

  # hey I just met you
  # and this is crazy
  INCLUDE_DIRECTORIES(${GTEST_DIR}/include)
  LINK_DIRECTORIES(${GTEST_DIR}/lib/.libs)

  ADD_EXECUTABLE(edadb_test EXCLUDE_FROM_ALL ${GTEST_DIR}/src/gtest_main.cc ${EDADB_TESTS})
  TARGET_LINK_LIBRARIES(edadb_test edadb "thrift" "gtest" "pthread" "boost_serialization" "v8_base" "v8_snapshot") 
  ADD_CUSTOM_TARGET(test
    #COMMAND ./edadb_test --gtest_filter=MMIOTest*
    COMMAND ./edadb_test
    DEPENDS edadb_test
    SOURCES ${EDADB_TESTS})
else()
  message("tests NOT included")
endif()
