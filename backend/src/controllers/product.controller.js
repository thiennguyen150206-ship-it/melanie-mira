const pool = require("../config/db");
const sendServerError = require("../utils/errorResponse");
const parsePositiveInt = require("../utils/parseId");
const MAX_PRODUCT_STOCK = 999;
const MAX_PRODUCT_SLUG_LENGTH = 100;
const MAX_PRODUCT_GALLERY_IMAGES = 8;

function isValidProductSlug(slug) {
  if (!slug || typeof slug !== "string") {
    return false;
  }

  if (slug.length > MAX_PRODUCT_SLUG_LENGTH) {
    return false;
  }

  return /^[a-z0-9-]+$/.test(slug);
}

function normalizeProductImages(images) {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map(function (imageUrl) {
      return String(imageUrl || "").trim();
    })
    .filter(function (imageUrl) {
      return imageUrl !== "";
    });
}

// GET /api/products/admin/categories
async function getAdminCategories(req, res) {
  try {
    const [categories] = await pool.query(`
      SELECT
        id,
        name_vi,
        name_en,
        slug,
        created_at
      FROM categories
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    return sendServerError(res, "Cannot get categories", error);
  }
}

// POST /api/products/admin/categories
async function createAdminCategory(req, res) {
  try {
    const { name_vi, name_en, slug } = req.body;

    if (!name_vi || String(name_vi).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category Vietnamese name is required",
      });
    }

    if (!isValidProductSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category slug",
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO categories
      (
        name_vi,
        name_en,
        slug
      )
      VALUES (?, ?, ?)
      `,
      [
        String(name_vi).trim(),
        name_en ? String(name_en).trim() : null,
        String(slug).trim(),
      ],
    );

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: {
        id: result.insertId,
        name_vi: String(name_vi).trim(),
        name_en: name_en ? String(name_en).trim() : null,
        slug: String(slug).trim(),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Category slug already exists",
      });
    }

    return sendServerError(res, "Cannot create category", error);
  }
}

// PATCH /api/products/admin/categories/:id
async function updateAdminCategory(req, res) {
  try {
    const categoryId = parsePositiveInt(req.params.id);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    const { name_vi, name_en, slug } = req.body;

    if (!name_vi || String(name_vi).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Category Vietnamese name is required",
      });
    }

    if (!isValidProductSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category slug",
      });
    }

    const [categories] = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
      `,
      [categoryId],
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const [sameSlugCategories] = await pool.query(
      `
      SELECT id
      FROM categories
      WHERE slug = ? AND id <> ?
      LIMIT 1
      `,
      [String(slug).trim(), categoryId],
    );

    if (sameSlugCategories.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Category slug already exists",
      });
    }

    await pool.query(
      `
      UPDATE categories
      SET
        name_vi = ?,
        name_en = ?,
        slug = ?
      WHERE id = ?
      `,
      [
        String(name_vi).trim(),
        name_en ? String(name_en).trim() : null,
        String(slug).trim(),
        categoryId,
      ],
    );

    res.json({
      success: true,
      message: "Category updated successfully",
      data: {
        id: categoryId,
        name_vi: String(name_vi).trim(),
        name_en: name_en ? String(name_en).trim() : null,
        slug: String(slug).trim(),
      },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Category slug already exists",
      });
    }

    return sendServerError(res, "Cannot update category", error);
  }
}

// GET /api/products/admin/list
async function getAdminProducts(req, res) {
  try {
    const [products] = await pool.query(`
      SELECT 
        products.id,
        products.category_id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.price,
        products.old_price,
        products.image,
        products.hover_image,
        products.badge,
        products.description_vi,
        products.description_en,
        products.is_active,
products.deleted_at,
products.created_at,

        categories.name_vi AS category_vi,
        categories.name_en AS category_en,
        categories.slug AS category_slug,

        COALESCE(MAX(CASE WHEN product_sizes.size = 'S' THEN product_sizes.stock END), 0) AS stock_s,
        COALESCE(MAX(CASE WHEN product_sizes.size = 'M' THEN product_sizes.stock END), 0) AS stock_m,
        COALESCE(MAX(CASE WHEN product_sizes.size = 'L' THEN product_sizes.stock END), 0) AS stock_l,
        COALESCE(SUM(product_sizes.stock), 0) AS total_stock

      FROM products

      LEFT JOIN categories
      ON products.category_id = categories.id

      LEFT JOIN product_sizes
      ON products.id = product_sizes.product_id

      GROUP BY
        products.id,
        products.category_id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.price,
        products.old_price,
        products.image,
        products.hover_image,
        products.badge,
        products.description_vi,
        products.description_en,
        products.is_active,
products.deleted_at,
products.created_at,
        categories.name_vi,
        categories.name_en,
        categories.slug

      ORDER BY products.id DESC
    `);

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return sendServerError(res, "Cannot get admin products", error);
  }
}

// GET /api/products/admin/detail/:id
async function getAdminProductById(req, res) {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const [products] = await pool.query(
      `
      SELECT 
        products.id,
        products.category_id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.price,
        products.old_price,
        products.image,
        products.hover_image,
        products.badge,
        products.description_vi,
        products.description_en,
       products.is_active,
products.deleted_at,
products.created_at,

        categories.name_vi AS category_vi,
        categories.name_en AS category_en,
        categories.slug AS category_slug

      FROM products

      LEFT JOIN categories
      ON products.category_id = categories.id

      WHERE products.id = ?
      LIMIT 1
      `,
      [productId],
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = products[0];

    const [images] = await pool.query(
      `
      SELECT
        id,
        image_url,
        sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC
      `,
      [productId],
    );

    const [sizes] = await pool.query(
      `
      SELECT
        id,
        size,
        stock
      FROM product_sizes
      WHERE product_id = ?
      ORDER BY FIELD(size, 'S', 'M', 'L'), id ASC
      `,
      [productId],
    );

    res.json({
      success: true,
      data: {
        ...product,
        images: images,
        sizes: sizes,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot get admin product detail", error);
  }
}

// POST /api/products/admin
async function createAdminProduct(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
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
      description_en,
      stock_s,
      stock_m,
      stock_l,
      images,
      is_active,
    } = req.body;

    const categoryId = parsePositiveInt(category_id);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    if (!name_vi || String(name_vi).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product Vietnamese name is required",
      });
    }

    if (!isValidProductSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product slug",
      });
    }

    const productPrice = Number(price);

    if (
      Number.isNaN(productPrice) ||
      productPrice <= 0 ||
      productPrice > 999999999
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product price",
      });
    }

    let productOldPrice = null;

    if (old_price !== undefined && old_price !== null && old_price !== "") {
      productOldPrice = Number(old_price);

      if (
        Number.isNaN(productOldPrice) ||
        productOldPrice < 0 ||
        productOldPrice > 999999999
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid old price",
        });
      }
    }

    const stocks = [
      {
        size: "S",
        stock: Number(stock_s || 0),
      },
      {
        size: "M",
        stock: Number(stock_m || 0),
      },
      {
        size: "L",
        stock: Number(stock_l || 0),
      },
    ];

    for (let i = 0; i < stocks.length; i++) {
      if (
        Number.isNaN(stocks[i].stock) ||
        !Number.isInteger(stocks[i].stock) ||
        stocks[i].stock < 0 ||
        stocks[i].stock > MAX_PRODUCT_STOCK
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock quantity",
        });
      }
    }

    const galleryImages = normalizeProductImages(images);

    if (galleryImages.length > MAX_PRODUCT_GALLERY_IMAGES) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được thêm tối đa 8 ảnh phụ cho mỗi sản phẩm.",
      });
    }

    const [categories] = await connection.query(
      `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
      `,
      [categoryId],
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const activeValue = Number(is_active) === 0 || is_active === false ? 0 : 1;

    await connection.beginTransaction();

    const [productResult] = await connection.query(
      `
      INSERT INTO products
      (
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
        description_en,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        categoryId,
        String(name_vi).trim(),
        name_en ? String(name_en).trim() : null,
        String(slug).trim(),
        productPrice,
        productOldPrice,
        image ? String(image).trim() : null,
        hover_image ? String(hover_image).trim() : null,
        badge ? String(badge).trim() : null,
        description_vi ? String(description_vi).trim() : null,
        description_en ? String(description_en).trim() : null,
        activeValue,
      ],
    );

    const productId = productResult.insertId;

    for (let i = 0; i < stocks.length; i++) {
      await connection.query(
        `
        INSERT INTO product_sizes (product_id, size, stock)
        VALUES (?, ?, ?)
        `,
        [productId, stocks[i].size, stocks[i].stock],
      );
    }

    for (let i = 0; i < galleryImages.length; i++) {
      await connection.query(
        `
    INSERT INTO product_images (product_id, image_url, sort_order)
    VALUES (?, ?, ?)
    `,
        [productId, galleryImages[i], i + 1],
      );
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        id: productId,
        category_id: categoryId,
        name_vi: String(name_vi).trim(),
        name_en: name_en ? String(name_en).trim() : null,
        slug: String(slug).trim(),
        price: productPrice,
        old_price: productOldPrice,
        image: image ? String(image).trim() : null,
        hover_image: hover_image ? String(hover_image).trim() : null,
        badge: badge ? String(badge).trim() : null,
        description_vi: description_vi ? String(description_vi).trim() : null,
        description_en: description_en ? String(description_en).trim() : null,
        is_active: activeValue,
        stock_s: stocks[0].stock,
        stock_m: stocks[1].stock,
        stock_l: stocks[2].stock,
      },
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Product slug already exists",
      });
    }

    return sendServerError(res, "Cannot create product", error);
  } finally {
    connection.release();
  }
}

// PATCH /api/products/admin/:id
async function updateAdminProduct(req, res) {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const {
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
      description_en,
      stock_s,
      stock_m,
      stock_l,
      images,
      is_active,
    } = req.body;

    const categoryId = parsePositiveInt(category_id);

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "Invalid category id",
      });
    }

    if (!name_vi || String(name_vi).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Product Vietnamese name is required",
      });
    }

    if (!isValidProductSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product slug",
      });
    }

    const productPrice = Number(price);

    if (
      Number.isNaN(productPrice) ||
      productPrice <= 0 ||
      productPrice > 999999999
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product price",
      });
    }

    let productOldPrice = null;

    if (old_price !== undefined && old_price !== null && old_price !== "") {
      productOldPrice = Number(old_price);

      if (
        Number.isNaN(productOldPrice) ||
        productOldPrice < 0 ||
        productOldPrice > 999999999
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid old price",
        });
      }
    }

    const stocks = [
      {
        size: "S",
        stock: Number(stock_s || 0),
      },
      {
        size: "M",
        stock: Number(stock_m || 0),
      },
      {
        size: "L",
        stock: Number(stock_l || 0),
      },
    ];

    for (let i = 0; i < stocks.length; i++) {
      if (
        Number.isNaN(stocks[i].stock) ||
        !Number.isInteger(stocks[i].stock) ||
        stocks[i].stock < 0 ||
        stocks[i].stock > MAX_PRODUCT_STOCK
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock quantity",
        });
      }
    }

    const galleryImages = normalizeProductImages(images);

    if (galleryImages.length > MAX_PRODUCT_GALLERY_IMAGES) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được thêm tối đa 8 ảnh phụ cho mỗi sản phẩm.",
      });
    }

    const [existingProducts] = await connection.query(
      `
      SELECT id
      FROM products
      WHERE id = ?
      LIMIT 1
      `,
      [productId],
    );

    if (existingProducts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const [categories] = await connection.query(
      `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
      `,
      [categoryId],
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const [sameSlugProducts] = await connection.query(
      `
      SELECT id
      FROM products
      WHERE slug = ? AND id <> ?
      LIMIT 1
      `,
      [String(slug).trim(), productId],
    );

    if (sameSlugProducts.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Product slug already exists",
      });
    }

    const activeValue = Number(is_active) === 0 || is_active === false ? 0 : 1;

    await connection.beginTransaction();
    transactionStarted = true;

    await connection.query(
      `
      UPDATE products
      SET
        category_id = ?,
        name_vi = ?,
        name_en = ?,
        slug = ?,
        price = ?,
        old_price = ?,
        image = ?,
        hover_image = ?,
        badge = ?,
        description_vi = ?,
        description_en = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        categoryId,
        String(name_vi).trim(),
        name_en ? String(name_en).trim() : null,
        String(slug).trim(),
        productPrice,
        productOldPrice,
        image ? String(image).trim() : null,
        hover_image ? String(hover_image).trim() : null,
        badge ? String(badge).trim() : null,
        description_vi ? String(description_vi).trim() : null,
        description_en ? String(description_en).trim() : null,
        activeValue,
        productId,
      ],
    );

    for (let i = 0; i < stocks.length; i++) {
      await connection.query(
        `
        INSERT INTO product_sizes (product_id, size, stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE stock = VALUES(stock)
        `,
        [productId, stocks[i].size, stocks[i].stock],
      );
    }

    if (Array.isArray(images)) {
      await connection.query(
        `
    DELETE FROM product_images
    WHERE product_id = ?
    `,
        [productId],
      );

      for (let i = 0; i < galleryImages.length; i++) {
        await connection.query(
          `
      INSERT INTO product_images (product_id, image_url, sort_order)
      VALUES (?, ?, ?)
      `,
          [productId, galleryImages[i], i + 1],
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Product updated successfully",
      data: {
        id: productId,
        category_id: categoryId,
        name_vi: String(name_vi).trim(),
        name_en: name_en ? String(name_en).trim() : null,
        slug: String(slug).trim(),
        price: productPrice,
        old_price: productOldPrice,
        image: image ? String(image).trim() : null,
        hover_image: hover_image ? String(hover_image).trim() : null,
        badge: badge ? String(badge).trim() : null,
        description_vi: description_vi ? String(description_vi).trim() : null,
        description_en: description_en ? String(description_en).trim() : null,
        is_active: activeValue,
        stock_s: stocks[0].stock,
        stock_m: stocks[1].stock,
        stock_l: stocks[2].stock,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Product slug already exists",
      });
    }

    return sendServerError(res, "Cannot update product", error);
  } finally {
    connection.release();
  }
}

// PATCH /api/products/admin/:id/status
async function updateAdminProductStatus(req, res) {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const { is_active } = req.body;

    if (
      is_active !== 0 &&
      is_active !== 1 &&
      is_active !== true &&
      is_active !== false
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product status",
      });
    }

    const activeValue = is_active === 1 || is_active === true ? 1 : 0;

    const [products] = await pool.query(
      `
  SELECT id, name_vi, slug, is_active, deleted_at
  FROM products
  WHERE id = ?
  LIMIT 1
  `,
      [productId],
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (products[0].deleted_at) {
      return res.status(409).json({
        success: false,
        message: "Cannot change status of deleted product",
      });
    }

    await pool.query(
      `
      UPDATE products
      SET is_active = ?
      WHERE id = ?
      `,
      [activeValue, productId],
    );

    res.json({
      success: true,
      message:
        activeValue === 1 ? "Product is now visible" : "Product is now hidden",
      data: {
        id: productId,
        name_vi: products[0].name_vi,
        slug: products[0].slug,
        is_active: activeValue,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot update product status", error);
  }
}

// PATCH /api/products/admin/:id/delete
async function softDeleteAdminProduct(req, res) {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const [products] = await pool.query(
      `
      SELECT id, name_vi, slug, deleted_at
      FROM products
      WHERE id = ?
      LIMIT 1
      `,
      [productId],
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (products[0].deleted_at) {
      return res.status(409).json({
        success: false,
        message: "Product already deleted",
      });
    }

    await pool.query(
      `
      UPDATE products
      SET
        deleted_at = NOW(),
        is_active = 0
      WHERE id = ?
      `,
      [productId],
    );

    res.json({
      success: true,
      message: "Product deleted successfully",
      data: {
        id: productId,
        name_vi: products[0].name_vi,
        slug: products[0].slug,
        is_active: 0,
        deleted_at: new Date(),
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot delete product", error);
  }
}

// PATCH /api/products/admin/:id/restore
async function restoreAdminProduct(req, res) {
  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }

    const [products] = await pool.query(
      `
      SELECT id, name_vi, slug, deleted_at
      FROM products
      WHERE id = ?
      LIMIT 1
      `,
      [productId],
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!products[0].deleted_at) {
      return res.status(409).json({
        success: false,
        message: "Product is not deleted",
      });
    }

    await pool.query(
      `
      UPDATE products
      SET
        deleted_at = NULL,
        is_active = 0
      WHERE id = ?
      `,
      [productId],
    );

    res.json({
      success: true,
      message: "Product restored successfully",
      data: {
        id: productId,
        name_vi: products[0].name_vi,
        slug: products[0].slug,
        is_active: 0,
        deleted_at: null,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot restore product", error);
  }
}

// GET /api/products
async function getAllProducts(req, res) {
  try {
    const [products] = await pool.query(`
      SELECT 
        products.id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.price,
        products.old_price,
        products.image,
        products.hover_image,
        products.badge,
        products.description_vi,
        products.description_en,
        products.is_active,
        categories.name_vi AS category_vi,
        categories.name_en AS category_en,
        categories.slug AS category_slug
      FROM products
      LEFT JOIN categories
      ON products.category_id = categories.id
     WHERE products.is_active = 1
AND products.deleted_at IS NULL
      ORDER BY products.id DESC
    `);

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return sendServerError(res, "Cannot get products", error);
  }
}

// GET /api/products/:slug
async function getProductBySlug(req, res) {
  try {
    const slug = req.params.slug;
    if (!isValidProductSlug(slug)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product slug",
      });
    }

    const [products] = await pool.query(
      `
      SELECT 
        products.id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.price,
        products.old_price,
        products.image,
        products.hover_image,
        products.badge,
        products.description_vi,
        products.description_en,
        products.is_active,
        categories.name_vi AS category_vi,
        categories.name_en AS category_en,
        categories.slug AS category_slug
      FROM products
      LEFT JOIN categories
      ON products.category_id = categories.id
     WHERE products.slug = ?
AND products.is_active = 1
AND products.deleted_at IS NULL
      LIMIT 1
      `,
      [slug],
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = products[0];

    /*
  Gallery và size không phụ thuộc nhau,
  nên chạy đồng thời để giảm thời gian phản hồi.
*/
    const [imagesResult, sizesResult] = await Promise.all([
      pool.query(
        `
    SELECT image_url, sort_order
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC
    `,
        [product.id],
      ),

      pool.query(
        `
    SELECT size, stock
    FROM product_sizes
    WHERE product_id = ?
    ORDER BY id ASC
    `,
        [product.id],
      ),
    ]);

    const images = imagesResult[0];
    const sizes = sizesResult[0];

    res.json({
      success: true,
      data: {
        ...product,
        images: images,
        sizes: sizes,
      },
    });
  } catch (error) {
    return sendServerError(res, "Cannot get product detail", error);
  }
}

// GET /api/products/admin/stock
async function getAdminProductStock(req, res) {
  try {
    const [products] = await pool.query(`
      SELECT
        products.id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.image,
        categories.name_vi AS category_vi,
        categories.name_en AS category_en,
        categories.slug AS category_slug,

        COALESCE(MAX(CASE WHEN product_sizes.size = 'S' THEN product_sizes.stock END), 0) AS stock_s,
        COALESCE(MAX(CASE WHEN product_sizes.size = 'M' THEN product_sizes.stock END), 0) AS stock_m,
        COALESCE(MAX(CASE WHEN product_sizes.size = 'L' THEN product_sizes.stock END), 0) AS stock_l

      FROM products
      LEFT JOIN categories
      ON products.category_id = categories.id

      LEFT JOIN product_sizes
      ON products.id = product_sizes.product_id

     WHERE products.is_active = 1
AND products.deleted_at IS NULL

      GROUP BY
        products.id,
        products.name_vi,
        products.name_en,
        products.slug,
        products.image,
        categories.name_vi,
        categories.name_en,
        categories.slug

      ORDER BY products.id DESC
    `);

    res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    return sendServerError(res, "Cannot get product stock", error);
  }
}

// PATCH /api/products/admin/stock/:id
async function updateAdminProductStock(req, res) {
  const connection = await pool.getConnection();

  try {
    const productId = parsePositiveInt(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Invalid product id",
      });
    }
    const { stock_s, stock_m, stock_l } = req.body;

    const stocks = [
      {
        size: "S",
        stock: Number(stock_s),
      },
      {
        size: "M",
        stock: Number(stock_m),
      },
      {
        size: "L",
        stock: Number(stock_l),
      },
    ];

    for (let i = 0; i < stocks.length; i++) {
      if (
        Number.isNaN(stocks[i].stock) ||
        !Number.isInteger(stocks[i].stock) ||
        stocks[i].stock < 0 ||
        stocks[i].stock > MAX_PRODUCT_STOCK
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock quantity",
        });
      }
    }

    const [products] = await connection.query(
      `
      SELECT id
      FROM products
     WHERE id = ?
AND is_active = 1
AND deleted_at IS NULL
      LIMIT 1
      `,
      [productId],
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await connection.beginTransaction();

    for (let i = 0; i < stocks.length; i++) {
      await connection.query(
        `
        INSERT INTO product_sizes (product_id, size, stock)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE stock = VALUES(stock)
        `,
        [productId, stocks[i].size, stocks[i].stock],
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: "Product stock updated successfully",
      data: {
        product_id: Number(productId),
        stock_s: Number(stock_s),
        stock_m: Number(stock_m),
        stock_l: Number(stock_l),
      },
    });
  } catch (error) {
    await connection.rollback();

    return sendServerError(res, "Cannot update product stock", error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  updateAdminProductStatus,
  softDeleteAdminProduct,
  restoreAdminProduct,
  getAllProducts,
  getProductBySlug,
  getAdminProductStock,
  updateAdminProductStock,
};
