<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

function response($code, $data) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

switch($method) {
    case 'GET': 
        $user_id = $_GET['user_id'] ?? null;
        if (!$user_id) response(400, ['error' => 'User ID dibutuhkan']);

        $stmt = $pdo->prepare("SELECT ci.product_id, ci.quantity, p.title, p.price, p.image_url 
                               FROM cart_items ci INNER JOIN products p ON ci.product_id = p.id 
                               WHERE ci.user_id = ?");
        $stmt->execute([$user_id]);
        $items = $stmt->fetchAll();
        response(200, $items);
        break;

    case 'POST': 
        $data = json_decode(file_get_contents('php://input'), true);
        $user_id = $data['user_id'] ?? null;
        $product_id = $data['product_id'] ?? null;
        $quantity = $data['quantity'] ?? 1;

        if (!$user_id || !$product_id) response(400, ['error'=>'Data tidak lengkap']);

        // Cek apakah item sudah ada
        $stmt = $pdo->prepare("SELECT id FROM cart_items WHERE user_id=? AND product_id=?");
        $stmt->execute([$user_id, $product_id]);
        $exists = $stmt->fetch();

        if ($exists) {
            $stmt = $pdo->prepare("UPDATE cart_items SET quantity = quantity + ? WHERE id = ?");
            $stmt->execute([$quantity, $exists['id']]);
        } else {
            $stmt = $pdo->prepare("INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)");
            $stmt->execute([$user_id, $product_id, $quantity]);
        }
        response(200, ['message'=>'Berhasil menambah ke keranjang']);
        break;

    case 'DELETE':
        $data = json_decode(file_get_contents('php://input'), true);
        $user_id = $data['user_id'] ?? null;
        $product_id = $data['product_id'] ?? null;

        if (!$user_id || !$product_id) response(400, ['error'=>'Data tidak lengkap']);
        $stmt = $pdo->prepare("DELETE FROM cart_items WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$user_id, $product_id]);
        response(200, ['message'=>'Item dihapus dari keranjang']);
        break;

    default:
        response(405, ['error'=>'Method tidak diijinkan']);
}
?>
