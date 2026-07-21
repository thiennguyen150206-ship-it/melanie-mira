USE melanie_mira_db;

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_vi VARCHAR(100) NOT NULL,
    name_en VARCHAR(100),
    slug VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    name_vi VARCHAR(255) NOT NULL,
    name_en VARCHAR(255),
    slug VARCHAR(255) NOT NULL UNIQUE,
    price DECIMAL(12, 2) NOT NULL,
    old_price DECIMAL(12, 2),
    image VARCHAR(255),
    hover_image VARCHAR(255),
    badge VARCHAR(50),
    description_vi TEXT,
    description_en TEXT,
    is_active TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 0,

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE product_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(10) NOT NULL,
    stock INT DEFAULT 0,

    UNIQUE KEY unique_product_size (product_id, size),

    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NULL,
    role ENUM('customer', 'admin') DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_email VARCHAR(150),
    customer_phone VARCHAR(20) NOT NULL,
    customer_address VARCHAR(255) NOT NULL,
    note TEXT,
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('cod', 'bank_transfer') DEFAULT 'cod',
    status ENUM('pending', 'confirmed', 'shipping', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    size VARCHAR(10),
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,

    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE product_images;
TRUNCATE TABLE product_sizes;
TRUNCATE TABLE products;
TRUNCATE TABLE categories;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categories (id, name_vi, name_en, slug)
VALUES
(1, 'Váy ngắn', 'Mini Dress', 'vay-ngan'),
(2, 'Áo', 'Top', 'ao'),
(3, 'Set quần áo', 'Set', 'set-quan-ao');

INSERT INTO products (
    id,
    category_id,
    name_vi,
    name_en,
    slug,
    price,
    old_price,
    image,
    hover_image,
    badge,
    description_vi,
    description_en
)
VALUES
(1, 1, 'ARUL - Váy Đen Hai Dây Tafta', 'ARUL - Black Tafta Strappy Dress', 'arul', 488500, 520000, 'assets/img/products/ARUL/arul.webp', 'assets/img/products/ARUL/arul1.webp', 'New', 'Thiết kế dáng xòe thanh lịch, phù hợp đi tiệc và chụp ảnh.', 'An elegant flared design, perfect for parties and photoshoots.'),

(2, 1, 'Đầm Nữ Đỏ LUNA Hai Dây Lụa', 'LUNA - Red Silk Strappy Dress', 'luna', 471500, 650000, 'assets/img/products/LUNA/luna.webp', 'assets/img/products/LUNA/luna1.webp', 'New', 'Chất liệu lụa mềm mại, phối ren nữ tính và nổi bật.', 'Soft silk fabric with feminine lace details for a standout look.'),

(3, 1, 'CAMI - Đầm Trắng Cúp Ngực Tafta', 'CAMI - White Tafta Bustier Dress', 'cami', 489562, 520000, 'assets/img/products/CAMI/cami.webp', 'assets/img/products/CAMI/cami1.webp', 'New', 'Dáng váy nhẹ nhàng, tôn dáng, phù hợp đi chơi và dự tiệc.', 'A soft and flattering dress style, suitable for outings and parties.'),

(4, 1, 'DONNA - Váy Xòe Nhiều Lớp Xếp Tầng', 'DONNA - Layered Flared Mini Dress', 'donna', 478895, 560000, 'assets/img/products/DONNA/donna.webp', 'assets/img/products/DONNA/donna1.webp', 'Sale', 'Thiết kế xếp tầng bồng bềnh, phù hợp phong cách nổi bật.', 'A layered flared design for a bold, feminine and eye-catching style.'),

(5, 2, 'IVY - Áo Ren Cổ Vuông Tay Phồng', 'IVY - Square Neck Lace Puff Sleeve Top', 'ivy', 335187, 390000, 'assets/img/products/IVY/ivy.webp', 'assets/img/products/IVY/ivy1.webp', 'Hot', 'Áo ren nữ tính, dễ phối với chân váy hoặc quần dài.', 'A feminine lace top that pairs easily with skirts or trousers.'),

(6, 2, 'LIA - Áo Thun Trễ Vai Tay Dài', 'LIA - Off-Shoulder Long Sleeve Top', 'lia', 297687, 330000, 'assets/img/products/LIA/lia.webp', 'assets/img/products/LIA/lia1.webp', 'New', 'Chất vải co giãn, form ôm nhẹ, phù hợp mặc hằng ngày.', 'Stretchy fabric with a lightly fitted shape, suitable for everyday wear.'),

(7, 3, 'CHARVI SET - Set Gile Linen Cổ Yếm', 'CHARVI SET - Linen Halter Vest Set', 'charvi-set', 145250, 215000, 'assets/img/products/CHARVI SET/charvi.webp', 'assets/img/products/CHARVI SET/charvi1.webp', 'Office', 'Set quần áo thanh lịch, phù hợp đi làm hoặc gặp khách hàng.', 'An elegant set, suitable for work, meetings or polished daily outfits.'),

(8, 2, 'Áo Ống Croptop Nữ', 'Women''s Tube Croptop', 'croptop', 389000, 450000, 'assets/img/products/CROPTOP/croptop.webp', 'assets/img/products/CROPTOP/croptop1.webp', 'New', 'Áo croptop co giãn, dễ phối đồ, phù hợp đi chơi hoặc dạo phố.', 'A stretchy croptop that is easy to style for casual outings or streetwear looks.');

INSERT INTO product_sizes (product_id, size, stock)
VALUES
(1, 'S', 10), (1, 'M', 10), (1, 'L', 10),
(2, 'S', 10), (2, 'M', 10), (2, 'L', 10),
(3, 'S', 10), (3, 'M', 10), (3, 'L', 10),
(4, 'S', 10), (4, 'M', 10), (4, 'L', 10),
(5, 'S', 10), (5, 'M', 10), (5, 'L', 10),
(6, 'S', 10), (6, 'M', 10), (6, 'L', 10),
(7, 'S', 10), (7, 'M', 10), (7, 'L', 10),
(8, 'S', 10), (8, 'M', 10), (8, 'L', 10);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(500) NOT NULL,
  city VARCHAR(255) NULL,
  postal_code VARCHAR(50) NULL,
  country VARCHAR(100) DEFAULT 'Việt Nam',

  is_default TINYINT(1) DEFAULT 0,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_user_addresses_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);














  



  




