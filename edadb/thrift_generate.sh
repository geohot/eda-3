#!/bin/sh
rm -rf gen-*
thrift --gen cpp edadb.thrift
thrift --gen php edadb.thrift
mkdir -p ~/devtools/thrift-0.8.0/lib/php/src/packages/edadb/
cp gen-php/edadb/edadb_types.php ~/devtools/thrift-0.8.0/lib/php/src/packages/edadb/

