#!/bin/sh
rm -rf gen-*
thrift --gen cpp edadb.thrift
thrift --gen php edadb.thrift

