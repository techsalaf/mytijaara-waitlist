<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/v1/auth/login', 'OPTIONS', [], [], [], [
    'HTTP_ORIGIN' => 'http://localhost:3000',
    'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
    'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,authorization',
]);
$response = $kernel->handle($request);
echo $response->headers->get('Access-Control-Allow-Origin') . PHP_EOL;
echo $response->headers->get('Access-Control-Allow-Headers') . PHP_EOL;
