<?php
require_once('thrift.php');

$tagdata = file_get_contents('php://input');

$transport->open();
$addrs = $client->searchTags($_GET['tagname'], $_GET['data']);
$transport->close();

echo(json_encode($addrs));

