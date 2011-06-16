<?php
//error_reporting(E_ALL);

$GLOBALS['THRIFT_ROOT'] = '/root/devtools/thrift-0.6.0/lib/php/src';
require_once $GLOBALS['THRIFT_ROOT'].'/Thrift.php';
require_once $GLOBALS['THRIFT_ROOT'].'/protocol/TBinaryProtocol.php';
require_once $GLOBALS['THRIFT_ROOT'].'/transport/TSocket.php';
require_once $GLOBALS['THRIFT_ROOT'].'/transport/THttpClient.php';
require_once $GLOBALS['THRIFT_ROOT'].'/transport/TBufferedTransport.php';

$GEN_DIR = '/root/eda-3/edadb/gen-php';
require_once $GEN_DIR.'/edadb/EDAdb.php';
require_once $GEN_DIR.'/edadb/edadb_types.php';

$socket = new TSocket('localhost', 9090);
$transport = new TBufferedTransport($socket, 1024, 1024);
$protocol = new TBinaryProtocol($transport);
$client = new EDAdbClient($protocol);

