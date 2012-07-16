<?php
require_once('thrift.php');

$tagdata = file_get_contents('php://input');

$transport->open();
$addrs = $client->allTagsWithName($_GET['tagname']);
$transport->close();

echo(json_encode($addrs));

