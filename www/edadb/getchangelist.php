<?php
require_once('thrift.php');
require_once('base.php');

$transport->open();
$clnumber = (int)$_GET['n'];
$wdata = $client->getChangelistWrittenExtents($clnumber);
$transport->close();

$ret = array();

foreach ($wdata as $addr => $data) {
  for ($i = 0; $i < strlen($data); $i++) {
    $ret[shex($addr+$i)] = ord(substr($data, $i, 1));
  }
}

echo json_encode($ret);



