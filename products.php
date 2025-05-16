<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db.php';

try {
    $stmt = $pdo->query('SELECT id, title, description, price, image_url FROM products ORDER BY id ASC');
    $products = $stmt->fetchAll();
    echo json_encode($products);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Gagal mengambil produk']);
}
?>
