<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$reflection = new ReflectionClass($kernel);
$property = $reflection->getProperty('middleware');
$property->setAccessible(true);
$middleware = $property->getValue($kernel);
echo "Global middleware:\n";
foreach ($middleware as $item) {
    echo $item . "\n";
}
