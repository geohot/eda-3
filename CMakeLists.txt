cmake_minimum_required(VERSION 2.6)

PROJECT(eda3)
SET(EDADB_SRCS
./edadb/byte.cc
)
INCLUDE_DIRECTORIES(./)
ADD_LIBRARY(edadb ${EDADB_SRCS})

#-----testing below this line-----
SET(GTEST_DIR ~/devtools/gtest-1.6.0)

SET(EDADB_TESTS
./edadb/byte_test.cc
)

ADD_EXECUTABLE(edadb_test EXCLUDE_FROM_ALL ${GTEST_DIR}/src/gtest_main.cc ${EDADB_TESTS})
TARGET_LINK_LIBRARIES(edadb_test edadb "gtest" "pthread")
ADD_CUSTOM_TARGET(test
  COMMAND ./edadb_test
  DEPENDS edadb_test
  SOURCES ${EDADB_TESTS})

