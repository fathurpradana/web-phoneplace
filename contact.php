<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Metode tidak diizinkan']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$message = trim($data['message'] ?? '');

if(empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['error' => 'Mohon lengkapi semua data']);
    exit;
}

if(!filter_var($email, FILTER_VALIDATE_EMAIL)){
    http_response_code(400);
    echo json_encode(['error' => 'Email tidak valid']);
    exit;
}

$stmt = $pdo->prepare("INSERT INTO contacts (name,email,message) VALUES (?,?,?)");
try {
    $stmt->execute([$name,$email,$message]);
    echo json_encode(['message' => 'Pesan berhasil dikirim!']);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Gagal menyimpan pesan']);
}
?>
