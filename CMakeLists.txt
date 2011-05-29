cmake_minimum_required(VERSION 2.6)

PROJECT(eda3)
SET(EDADB_SRCS
./EDAdb/Byte.cc
)
INCLUDE_DIRECTORIES(./)
ADD_LIBRARY(edadb ${EDADB_SRCS})

