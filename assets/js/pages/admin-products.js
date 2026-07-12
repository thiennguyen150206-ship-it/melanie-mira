let allAdminProducts = [];
let allAdminProductCategories = [];
let adminProductSearchTimer = null;
let isLoadingAdminProducts = false;
let isUpdatingAdminProductStatus = false;
let isChangingAdminProductDeleteState = false;
let productFormMode = "create";
let editingProductId = null;
let categoryFormMode = "create";
let editingCategoryId = null;
let isSavingCategory = false;
const MAX_GALLERY_IMAGES = 8;

function formatAdminProductMoney(price) {
  return Number(price || 0).toLocaleString("vi-VN") + "đ";
}

function escapeAdminProductHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidImageUrl(value) {
  const imageUrl = String(value || "").trim();

  if (!imageUrl) {
    return false;
  }

  return (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("assets/") ||
    imageUrl.startsWith("./assets/") ||
    imageUrl.startsWith("/assets/")
  );
}

async function uploadProductImageFile(file) {
  const adminToken = await getAdminProductToken();

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(API_BASE_URL + "/products/admin/upload-image", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + adminToken,
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể upload ảnh.");
  }

  return result.data;
}

function setUploadNote(selector, message, type) {
  const note = $(selector);

  note.removeClass("is-loading is-success is-error").text(message || "");

  if (type) {
    note.addClass(type);
  }
}

function clearProductUploadNotes() {
  setUploadNote("#mainImageUploadNote", "", "");
  setUploadNote("#hoverImageUploadNote", "", "");
  setUploadNote("#galleryImageUploadNote", "", "");
}

async function handleMainImageUpload(file) {
  try {
    setUploadNote(
      "#mainImageUploadNote",
      "Đang upload ảnh chính...",
      "is-loading",
    );

    const uploadData = await uploadProductImageFile(file);

    $("#createProductImage").val(uploadData.image_url);

    renderSingleImagePreview(
      "#createProductImage",
      "#previewMainImageBox",
      "Chưa có ảnh chính",
    );

    setUploadNote(
      "#mainImageUploadNote",
      "Upload ảnh chính thành công.",
      "is-success",
    );
  } catch (error) {
    setUploadNote(
      "#mainImageUploadNote",
      error.message || "Upload ảnh chính thất bại.",
      "is-error",
    );
  }
}

async function handleHoverImageUpload(file) {
  try {
    setUploadNote(
      "#hoverImageUploadNote",
      "Đang upload ảnh hover...",
      "is-loading",
    );

    const uploadData = await uploadProductImageFile(file);

    $("#createProductHoverImage").val(uploadData.image_url);

    renderSingleImagePreview(
      "#createProductHoverImage",
      "#previewHoverImageBox",
      "Chưa có ảnh hover",
    );

    setUploadNote(
      "#hoverImageUploadNote",
      "Upload ảnh hover thành công.",
      "is-success",
    );
  } catch (error) {
    setUploadNote(
      "#hoverImageUploadNote",
      error.message || "Upload ảnh hover thất bại.",
      "is-error",
    );
  }
}
async function handleGalleryImagesUpload(files) {
  try {
    if (!files.length) {
      return;
    }

    const currentGalleryImages = getGalleryImageLines();
    const totalGalleryImages = currentGalleryImages.length + files.length;

    if (totalGalleryImages > MAX_GALLERY_IMAGES) {
      setUploadNote(
        "#galleryImageUploadNote",
        "Chỉ được chọn tối đa " +
          MAX_GALLERY_IMAGES +
          " ảnh phụ. Hiện có " +
          currentGalleryImages.length +
          " ảnh.",
        "is-error",
      );

      $("#errCreateImages").text(
        "Chỉ được thêm tối đa " + MAX_GALLERY_IMAGES + " ảnh phụ.",
      );

      return;
    }

    setUploadNote(
      "#galleryImageUploadNote",
      "Đang upload ảnh phụ...",
      "is-loading",
    );

    const uploadedUrls = [];

    for (let i = 0; i < files.length; i++) {
      const uploadData = await uploadProductImageFile(files[i]);
      uploadedUrls.push(uploadData.image_url);
    }

    const oldLines = getGalleryImageLines();
    const finalLines = oldLines.concat(uploadedUrls);

    $("#createProductImages").val(finalLines.join("\n"));

    renderGalleryImagePreview();

    setUploadNote(
      "#galleryImageUploadNote",
      "Upload ảnh phụ thành công.",
      "is-success",
    );
  } catch (error) {
    setUploadNote(
      "#galleryImageUploadNote",
      error.message || "Upload ảnh phụ thất bại.",
      "is-error",
    );
  }
}

function getGalleryImageLines() {
  return $("#createProductImages")
    .val()
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(function (line) {
      return line !== "";
    });
}

function getInvalidImageUrls(imageUrls) {
  return imageUrls.filter(function (imageUrl) {
    return !isValidImageUrl(imageUrl);
  });
}

function renderSingleImagePreview(inputSelector, previewSelector, emptyText) {
  const imageUrl = String($(inputSelector).val() || "").trim();

  if (!isValidImageUrl(imageUrl)) {
    $(previewSelector).html("<span>" + emptyText + "</span>");
    return;
  }

  $(previewSelector).html(
    '<img src="' +
      escapeAdminProductHtml(imageUrl) +
      '" alt="Preview ảnh sản phẩm" />',
  );
}

function renderGalleryImagePreview() {
  const imageText = String($("#createProductImages").val() || "").trim();

  if (!imageText) {
    $("#previewGalleryImagesBox").html("<span>Chưa có ảnh phụ</span>");
    return;
  }

  const imageUrls = imageText
    .split("\n")
    .map(function (item) {
      return item.trim();
    })
    .filter(function (item) {
      return isValidImageUrl(item);
    });

  if (imageUrls.length === 0) {
    $("#previewGalleryImagesBox").html("<span>Chưa có ảnh phụ hợp lệ</span>");
    return;
  }

  const html = imageUrls
    .map(function (imageUrl) {
      return (
        '<img src="' +
        escapeAdminProductHtml(imageUrl) +
        '" alt="Preview ảnh phụ" />'
      );
    })
    .join("");

  $("#previewGalleryImagesBox").html(html);
}

function renderAllProductImagePreviews() {
  renderSingleImagePreview(
    "#createProductImage",
    "#previewMainImageBox",
    "Chưa có ảnh chính",
  );

  renderSingleImagePreview(
    "#createProductHoverImage",
    "#previewHoverImageBox",
    "Chưa có ảnh hover",
  );

  renderGalleryImagePreview();
}

async function getAdminProductToken() {
  if (typeof getValidAdminToken === "function") {
    return await getValidAdminToken();
  }

  const possibleTokenKeys = [
    "adminToken",
    "melanieAdminToken",
    "admin_token",
    "melanie_admin_token",
  ];

  for (let i = 0; i < possibleTokenKeys.length; i++) {
    const token = localStorage.getItem(possibleTokenKeys[i]);

    if (token) {
      return token;
    }
  }

  throw new Error("Vui lòng đăng nhập admin trước.");
}

function handleAdminProductAuthError(response) {
  if (response.status === 401 || response.status === 403) {
    if (typeof handleAdminSessionExpired === "function") {
      handleAdminSessionExpired();
    }

    throw new Error("Phiên admin đã hết hạn. Vui lòng đăng nhập lại.");
  }
}

async function fetchAdminProductCategories() {
  const adminToken = await getAdminProductToken();

  const response = await fetch(API_BASE_URL + "/products/admin/categories", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + adminToken,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể tải danh mục sản phẩm.");
  }

  return result.data;
}

async function createAdminCategory(data) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(API_BASE_URL + "/products/admin/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể thêm danh mục.");
  }

  return result.data;
}

async function updateAdminCategory(categoryId, data) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(
    API_BASE_URL + "/products/admin/categories/" + categoryId,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + adminToken,
      },
      body: JSON.stringify(data),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể cập nhật danh mục.");
  }

  return result.data;
}

async function fetchAdminProducts() {
  const adminToken = await getAdminProductToken();

  const response = await fetch(API_BASE_URL + "/products/admin/list", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + adminToken,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể tải sản phẩm.");
  }

  return result.data;
}

async function fetchAdminProductDetail(productId) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(
    API_BASE_URL + "/products/admin/detail/" + productId,
    {
      method: "GET",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể tải chi tiết sản phẩm.");
  }

  return result.data;
}

async function updateAdminProductStatus(productId, isActive) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(
    API_BASE_URL + "/products/admin/" + productId + "/status",
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + adminToken,
      },
      body: JSON.stringify({
        is_active: isActive,
      }),
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(
      result.message || "Không thể cập nhật trạng thái sản phẩm.",
    );
  }

  return result.data;
}

async function softDeleteAdminProductById(productId) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(
    API_BASE_URL + "/products/admin/" + productId + "/delete",
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể xóa sản phẩm.");
  }

  return result.data;
}

async function restoreAdminProductById(productId) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(
    API_BASE_URL + "/products/admin/" + productId + "/restore",
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + adminToken,
      },
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể khôi phục sản phẩm.");
  }

  return result.data;
}

function updateProductInAdminList(productId, data) {
  for (let i = 0; i < allAdminProducts.length; i++) {
    if (Number(allAdminProducts[i].id) === Number(productId)) {
      allAdminProducts[i] = {
        ...allAdminProducts[i],
        ...data,
      };

      break;
    }
  }
}

async function createAdminProduct(data) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(API_BASE_URL + "/products/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể thêm sản phẩm.");
  }

  return result.data;
}

async function updateAdminProduct(productId, data) {
  const adminToken = await getAdminProductToken();

  const response = await fetch(API_BASE_URL + "/products/admin/" + productId, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + adminToken,
    },
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    handleAdminProductAuthError(response);
    throw new Error(result.message || "Không thể cập nhật sản phẩm.");
  }

  return result.data;
}

function renderAdminProductCategoryFilter() {
  let html = `<option value="all">Tất cả danh mục</option>`;

  for (let i = 0; i < allAdminProductCategories.length; i++) {
    const category = allAdminProductCategories[i];

    html += `
      <option value="${Number(category.id)}">
        ${escapeAdminProductHtml(category.name_vi)}
      </option>
    `;
  }

  $("#adminProductCategoryFilter").html(html);
}

function renderCreateProductCategoryOptions() {
  let html = `<option value="">Chọn danh mục</option>`;

  for (let i = 0; i < allAdminProductCategories.length; i++) {
    const category = allAdminProductCategories[i];

    html += `
      <option value="${Number(category.id)}">
        ${escapeAdminProductHtml(category.name_vi)}
      </option>
    `;
  }

  $("#createProductCategory").html(html);
}

function renderAdminCategories() {
  if (allAdminProductCategories.length === 0) {
    $("#adminCategoriesTableBody").html(`
      <tr>
        <td colspan="5" class="text-center">Không có danh mục nào</td>
      </tr>
    `);
    return;
  }

  let html = "";

  for (let i = 0; i < allAdminProductCategories.length; i++) {
    const category = allAdminProductCategories[i];

    html += `
      <tr>
        <td>${Number(category.id)}</td>

        <td>
          <strong>${escapeAdminProductHtml(category.name_vi)}</strong>
        </td>

        <td>${escapeAdminProductHtml(category.name_en || "")}</td>

        <td>
          <span class="category-slug-text">
            ${escapeAdminProductHtml(category.slug)}
          </span>
        </td>

        <td>
          <div class="category-action-row">
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm btn-edit-admin-category"
              data-id="${Number(category.id)}"
            >
              Sửa
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  $("#adminCategoriesTableBody").html(html);
}

function isDeletedAdminProduct(product) {
  return Boolean(product.deleted_at);
}

function getFilteredAdminProducts() {
  const keyword = $("#adminProductSearchInput").val().trim().toLowerCase();
  const categoryFilter = $("#adminProductCategoryFilter").val();
  const statusFilter = $("#adminProductStatusFilter").val();

  let products = allAdminProducts;

  if (statusFilter === "deleted") {
    products = products.filter(function (product) {
      return isDeletedAdminProduct(product);
    });
  } else {
    products = products.filter(function (product) {
      return !isDeletedAdminProduct(product);
    });
  }

  if (keyword !== "") {
    products = products.filter(function (product) {
      const text = [
        product.id,
        product.name_vi,
        product.name_en,
        product.slug,
        product.category_vi,
        product.category_en,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(keyword);
    });
  }

  if (categoryFilter !== "all") {
    products = products.filter(function (product) {
      return Number(product.category_id) === Number(categoryFilter);
    });
  }

  if (statusFilter === "visible") {
    products = products.filter(function (product) {
      return Number(product.is_active) === 1;
    });
  }

  if (statusFilter === "hidden") {
    products = products.filter(function (product) {
      return Number(product.is_active) === 0;
    });
  }

  return products;
}

function renderAdminProducts() {
  const products = getFilteredAdminProducts();

  if (products.length === 0) {
    $("#adminProductsTableBody").html(`
      <tr>
        <td colspan="7" class="text-center">Không có sản phẩm phù hợp</td>
      </tr>
    `);
    return;
  }

  let html = "";

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const productId = Number(product.id);
    const isActive = Number(product.is_active) === 1;
    const isDeleted = isDeletedAdminProduct(product);

    let statusClass = "product-status-hidden";
    let statusText = "Đang ẩn";

    if (isDeleted) {
      statusClass = "product-status-deleted";
      statusText = "Đã xóa";
    } else if (isActive) {
      statusClass = "product-status-visible";
      statusText = "Đang hiển thị";
    }

    const toggleText = isActive ? "Ẩn" : "Hiện";
    const nextStatus = isActive ? 0 : 1;

    let actionButtons = "";

    if (isDeleted) {
      actionButtons = `
        <button
          type="button"
          class="btn btn-outline-success btn-sm btn-restore-admin-product"
          data-id="${productId}"
        >
          Khôi phục
        </button>
      `;
    } else {
      actionButtons = `
        <button
          type="button"
          class="btn btn-outline-dark btn-sm btn-view-admin-product"
          data-id="${productId}"
        >
          Xem
        </button>

        <button
          type="button"
          class="btn btn-outline-secondary btn-sm btn-edit-admin-product"
          data-id="${productId}"
        >
          Sửa
        </button>

        <button
          type="button"
          class="btn btn-outline-danger btn-sm btn-toggle-admin-product-status"
          data-id="${productId}"
          data-active="${nextStatus}"
        >
          ${toggleText}
        </button>

        <button
          type="button"
          class="btn btn-danger btn-sm btn-delete-admin-product"
          data-id="${productId}"
        >
          Xóa
        </button>
      `;
    }

    html += `
      <tr class="${isDeleted ? "product-admin-deleted-row" : ""}">
        <td>${productId}</td>

        <td>
          <div class="product-admin-info">
            <img
              src="${escapeAdminProductHtml(product.image)}"
              alt="${escapeAdminProductHtml(product.name_vi)}"
              class="product-admin-image"
            />

            <div>
              <div class="product-admin-name">
                ${escapeAdminProductHtml(product.name_vi)}
              </div>

              <div class="product-admin-slug">
                ${escapeAdminProductHtml(product.slug)}
              </div>
            </div>
          </div>
        </td>

        <td>${escapeAdminProductHtml(product.category_vi || "Chưa phân loại")}</td>

        <td>
          <strong>${formatAdminProductMoney(product.price)}</strong>
          ${
            product.old_price
              ? `<div class="text-muted small">Giá cũ: ${formatAdminProductMoney(product.old_price)}</div>`
              : ""
          }
        </td>

        <td>
          <div class="product-stock-mini">
            S: ${Number(product.stock_s || 0)}<br />
            M: ${Number(product.stock_m || 0)}<br />
            L: ${Number(product.stock_l || 0)}<br />
            Tổng: ${Number(product.total_stock || 0)}
          </div>
        </td>

        <td>
          <span class="product-status-badge ${statusClass}">
            ${statusText}
          </span>
        </td>

        <td>
          <div class="product-action-row">
            ${actionButtons}
          </div>
        </td>
      </tr>
    `;
  }

  $("#adminProductsTableBody").html(html);
}

async function loadAdminProductSection() {
  if (isLoadingAdminProducts) {
    return;
  }

  isLoadingAdminProducts = true;
  $("#productAdminMessage").removeClass("text-danger text-success");
  $("#productAdminMessage").text("Đang tải sản phẩm...");

  try {
    allAdminProductCategories = await fetchAdminProductCategories();
    allAdminProducts = await fetchAdminProducts();

    renderAdminProductCategoryFilter();
    renderCreateProductCategoryOptions();
    renderAdminProducts();

    $("#productAdminMessage")
      .addClass("text-success")
      .text("Đã tải sản phẩm thành công.");
  } catch (error) {
    $("#productAdminMessage").addClass("text-danger").text(error.message);
  } finally {
    isLoadingAdminProducts = false;
  }
}

async function loadAdminCategorySection() {
  $("#categoryAdminMessage").removeClass("text-danger text-success");
  $("#categoryAdminMessage").text("Đang tải danh mục...");

  try {
    allAdminProductCategories = await fetchAdminProductCategories();
    renderAdminCategories();
    renderAdminProductCategoryFilter();
    renderCreateProductCategoryOptions();
    renderAdminProducts();

    $("#categoryAdminMessage")
      .addClass("text-success")
      .text("Đã tải danh mục thành công.");
  } catch (error) {
    $("#categoryAdminMessage").addClass("text-danger").text(error.message);
  }
}

async function toggleAdminProductStatus(productId, nextStatus) {
  if (isUpdatingAdminProductStatus) {
    return;
  }

  const confirmMessage =
    Number(nextStatus) === 1
      ? "Bạn có chắc muốn hiện sản phẩm này trên website không?"
      : "Bạn có chắc muốn ẩn sản phẩm này khỏi website không?";

  if (!confirm(confirmMessage)) {
    return;
  }

  isUpdatingAdminProductStatus = true;
  $("#productAdminMessage").removeClass("text-danger text-success");
  $("#productAdminMessage").text("Đang cập nhật trạng thái sản phẩm...");

  try {
    await updateAdminProductStatus(productId, Number(nextStatus));

    for (let i = 0; i < allAdminProducts.length; i++) {
      if (Number(allAdminProducts[i].id) === Number(productId)) {
        allAdminProducts[i].is_active = Number(nextStatus);
        break;
      }
    }

    renderAdminProducts();

    $("#productAdminMessage")
      .addClass("text-success")
      .text("Đã cập nhật trạng thái sản phẩm.");
  } catch (error) {
    $("#productAdminMessage").addClass("text-danger").text(error.message);
  } finally {
    isUpdatingAdminProductStatus = false;
  }
}

async function restoreDeletedAdminProduct(productId) {
  if (isChangingAdminProductDeleteState) {
    return;
  }

  if (
    !confirm(
      "Bạn có chắc muốn khôi phục sản phẩm này không? Sau khi khôi phục, sản phẩm vẫn đang ẩn.",
    )
  ) {
    return;
  }

  isChangingAdminProductDeleteState = true;

  $("#productAdminMessage")
    .removeClass("text-danger text-success")
    .text("Đang khôi phục sản phẩm...");

  try {
    const restoredProduct = await restoreAdminProductById(productId);

    updateProductInAdminList(productId, {
      is_active: restoredProduct.is_active || 0,
      deleted_at: null,
    });

    renderAdminProducts();

    $("#productAdminMessage")
      .addClass("text-success")
      .text("Đã khôi phục sản phẩm. Sản phẩm hiện đang ẩn.");
  } catch (error) {
    $("#productAdminMessage").addClass("text-danger").text(error.message);
  } finally {
    isChangingAdminProductDeleteState = false;
  }
}

async function softDeleteAdminProduct(productId) {
  if (isChangingAdminProductDeleteState) {
    return;
  }

  if (
    !confirm(
      "Bạn có chắc muốn xóa sản phẩm này không? Sản phẩm sẽ vào thùng rác và không hiện ngoài website.",
    )
  ) {
    return;
  }

  isChangingAdminProductDeleteState = true;

  $("#productAdminMessage")
    .removeClass("text-danger text-success")
    .text("Đang xóa sản phẩm...");

  try {
    const deletedProduct = await softDeleteAdminProductById(productId);

    updateProductInAdminList(productId, {
      is_active: 0,
      deleted_at: deletedProduct.deleted_at || new Date().toISOString(),
    });

    renderAdminProducts();

    $("#productAdminMessage")
      .addClass("text-success")
      .text("Đã xóa sản phẩm vào thùng rác.");
  } catch (error) {
    $("#productAdminMessage").addClass("text-danger").text(error.message);
  } finally {
    isChangingAdminProductDeleteState = false;
  }
}

function resetAdminProductSection() {
  clearTimeout(adminProductSearchTimer);

  allAdminProducts = [];
  allAdminProductCategories = [];

  $("#adminProductSearchInput").val("");
  $("#adminProductCategoryFilter").html(
    `<option value="all">Tất cả danh mục</option>`,
  );
  $("#adminCategoriesTableBody").html(`
  <tr>
    <td colspan="5" class="text-center">Chưa tải danh mục</td>
  </tr>
`);

  $("#categoryAdminMessage").removeClass("text-danger text-success").text("");
  $("#adminProductStatusFilter").val("all");

  $("#adminProductsTableBody").html(`
    <tr>
      <td colspan="7" class="text-center">Chưa tải sản phẩm</td>
    </tr>
  `);

  $("#productAdminMessage").removeClass("text-danger text-success").text("");
}

function clearCreateProductErrors() {
  $("#errCreateCategory").text("");
  $("#errCreateNameVi").text("");
  $("#errCreateSlug").text("");
  $("#errCreatePrice").text("");
  $("#errCreateOldPrice").text("");
  $("#errCreateStock").text("");

  $("#errCreateImage").text("");
  $("#errCreateHoverImage").text("");
  $("#errCreateImages").text("");
}

function resetCreateProductForm() {
  $("#createProductForm")[0].reset();

  $("#editingProductId").val("");
  $("#createProductStatus").val("1");
  $("#createProductStockS").val(0);
  $("#createProductStockM").val(0);
  $("#createProductStockL").val(0);

  clearCreateProductErrors();
  renderAllProductImagePreviews();
  clearProductUploadNotes();
}

function openCreateProductModal() {
  productFormMode = "create";
  editingProductId = null;

  resetCreateProductForm();
  clearCreateProductErrors();

  $("#editingProductId").val("");
  $("#productFormTitle").text("Thêm sản phẩm mới");
  $("#btnSaveCreateProduct").text("Lưu sản phẩm");

  if (allAdminProductCategories.length === 0) {
    $("#productAdminMessage")
      .removeClass("text-success")
      .addClass("text-danger")
      .text("Vui lòng bấm Tải sản phẩm trước để tải danh mục.");

    return;
  }

  renderCreateProductCategoryOptions();
  $("#createProductModalOverlay").addClass("active");
}

function fillProductForm(product) {
  clearProductUploadNotes();
  $("#editingProductId").val(product.id);

  $("#createProductCategory").val(product.category_id);
  $("#createProductStatus").val(Number(product.is_active));

  $("#createProductNameVi").val(product.name_vi || "");
  $("#createProductNameEn").val(product.name_en || "");
  $("#createProductSlug").val(product.slug || "");
  $("#createProductBadge").val(product.badge || "");

  $("#createProductPrice").val(Number(product.price || 0));
  $("#createProductOldPrice").val(
    product.old_price === null || product.old_price === undefined
      ? ""
      : Number(product.old_price),
  );

  $("#createProductImage").val(product.image || "");
  $("#createProductHoverImage").val(product.hover_image || "");

  $("#createProductDescriptionVi").val(product.description_vi || "");
  $("#createProductDescriptionEn").val(product.description_en || "");

  let stockS = 0;
  let stockM = 0;
  let stockL = 0;

  if (Array.isArray(product.sizes)) {
    for (let i = 0; i < product.sizes.length; i++) {
      const sizeItem = product.sizes[i];

      if (sizeItem.size === "S") {
        stockS = Number(sizeItem.stock || 0);
      }

      if (sizeItem.size === "M") {
        stockM = Number(sizeItem.stock || 0);
      }

      if (sizeItem.size === "L") {
        stockL = Number(sizeItem.stock || 0);
      }
    }
  }

  $("#createProductStockS").val(stockS);
  $("#createProductStockM").val(stockM);
  $("#createProductStockL").val(stockL);

  let imageText = "";

  if (Array.isArray(product.images)) {
    imageText = product.images
      .map(function (image) {
        return image.image_url;
      })
      .filter(function (imageUrl) {
        return imageUrl && String(imageUrl).trim() !== "";
      })
      .join("\n");
  }

  $("#createProductImages").val(imageText);
  renderAllProductImagePreviews();
}

async function openEditProductModal(productId) {
  productFormMode = "edit";
  editingProductId = Number(productId);

  clearCreateProductErrors();

  if (allAdminProductCategories.length === 0) {
    $("#productAdminMessage")
      .removeClass("text-success")
      .addClass("text-danger")
      .text("Vui lòng bấm Tải sản phẩm trước khi sửa sản phẩm.");

    return;
  }

  $("#productAdminMessage")
    .removeClass("text-danger text-success")
    .text("Đang tải chi tiết sản phẩm...");

  try {
    const product = await fetchAdminProductDetail(productId);

    renderCreateProductCategoryOptions();
    fillProductForm(product);

    $("#productFormTitle").text("Sửa sản phẩm #" + productId);
    $("#btnSaveCreateProduct").text("Cập nhật sản phẩm");

    $("#createProductModalOverlay").addClass("active");

    $("#productAdminMessage").text("");
  } catch (error) {
    $("#productAdminMessage").addClass("text-danger").text(error.message);
  }
}

function closeCreateProductModal() {
  $("#createProductModalOverlay").removeClass("active");

  productFormMode = "create";
  editingProductId = null;

  $("#productFormTitle").text("Thêm sản phẩm mới");
  $("#btnSaveCreateProduct").text("Lưu sản phẩm");
  renderAllProductImagePreviews();
}

function isValidCreateStockValue(value) {
  const numberValue = Number(value);

  return (
    !Number.isNaN(numberValue) &&
    Number.isInteger(numberValue) &&
    numberValue >= 0 &&
    numberValue <= 999
  );
}

function validateCreateProductForm(data) {
  let isValid = true;

  clearCreateProductErrors();

  if (!data.category_id) {
    $("#errCreateCategory").text("Vui lòng chọn danh mục.");
    isValid = false;
  }

  if (!data.name_vi || data.name_vi.trim() === "") {
    $("#errCreateNameVi").text("Vui lòng nhập tên sản phẩm tiếng Việt.");
    isValid = false;
  }

  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    $("#errCreateSlug").text(
      "Slug chỉ được dùng chữ thường, số và dấu gạch ngang.",
    );
    isValid = false;
  }

  if (Number.isNaN(Number(data.price)) || Number(data.price) <= 0) {
    $("#errCreatePrice").text("Giá bán phải lớn hơn 0.");
    isValid = false;
  }

  if (
    data.old_price !== "" &&
    data.old_price !== null &&
    Number(data.old_price) < 0
  ) {
    $("#errCreateOldPrice").text("Giá cũ không được âm.");
    isValid = false;
  }

  if (
    !isValidCreateStockValue(data.stock_s) ||
    !isValidCreateStockValue(data.stock_m) ||
    !isValidCreateStockValue(data.stock_l)
  ) {
    $("#errCreateStock").text("Tồn kho phải là số nguyên từ 0 đến 999.");
    isValid = false;
  }

  if (!data.image || data.image.trim() === "") {
    $("#errCreateImage").text("Vui lòng nhập ảnh chính của sản phẩm.");
    isValid = false;
  } else if (!isValidImageUrl(data.image)) {
    $("#errCreateImage").text(
      "Ảnh chính phải là link http/https hoặc đường dẫn assets/.",
    );
    isValid = false;
  }

  if (data.hover_image && !isValidImageUrl(data.hover_image)) {
    $("#errCreateHoverImage").text(
      "Ảnh hover phải là link http/https hoặc đường dẫn assets/.",
    );
    isValid = false;
  }

  const invalidGalleryImages = getInvalidImageUrls(data.images || []);

  if (invalidGalleryImages.length > 0) {
    $("#errCreateImages").text(
      "Ảnh phụ có link không hợp lệ. Mỗi dòng phải là http/https hoặc assets/.",
    );
    isValid = false;
  }
  if ((data.images || []).length > MAX_GALLERY_IMAGES) {
    $("#errCreateImages").text(
      "Chỉ được thêm tối đa " + MAX_GALLERY_IMAGES + " ảnh phụ.",
    );
    isValid = false;
  }

  return isValid;
}

function getCreateProductFormData() {
  const imageLines = getGalleryImageLines();

  return {
    category_id: Number($("#createProductCategory").val()),
    name_vi: $("#createProductNameVi").val().trim(),
    name_en: $("#createProductNameEn").val().trim(),
    slug: $("#createProductSlug").val().trim(),
    price: Number($("#createProductPrice").val()),
    old_price: $("#createProductOldPrice").val().trim(),
    image: $("#createProductImage").val().trim(),
    hover_image: $("#createProductHoverImage").val().trim(),
    badge: $("#createProductBadge").val().trim(),
    description_vi: $("#createProductDescriptionVi").val().trim(),
    description_en: $("#createProductDescriptionEn").val().trim(),
    stock_s: Number($("#createProductStockS").val()),
    stock_m: Number($("#createProductStockM").val()),
    stock_l: Number($("#createProductStockL").val()),
    images: imageLines,
    is_active: Number($("#createProductStatus").val()),
  };
}

async function submitCreateProductForm() {
  const data = getCreateProductFormData();

  if (!validateCreateProductForm(data)) {
    return;
  }

  const isEditMode = productFormMode === "edit" && editingProductId;

  $("#btnSaveCreateProduct")
    .prop("disabled", true)
    .text(isEditMode ? "Đang cập nhật..." : "Đang lưu...");

  $("#productAdminMessage").removeClass("text-danger text-success").text("");

  try {
    if (isEditMode) {
      await updateAdminProduct(editingProductId, data);
    } else {
      await createAdminProduct(data);
    }

    closeCreateProductModal();
    resetCreateProductForm();

    await loadAdminProductSection();

    $("#productAdminMessage")
      .addClass("text-success")
      .text(
        isEditMode
          ? "Đã cập nhật sản phẩm thành công."
          : "Đã thêm sản phẩm mới thành công.",
      );
  } catch (error) {
    $("#productAdminMessage").addClass("text-danger").text(error.message);
  } finally {
    $("#btnSaveCreateProduct")
      .prop("disabled", false)
      .text(isEditMode ? "Cập nhật sản phẩm" : "Lưu sản phẩm");
  }
}

function clearCategoryFormErrors() {
  $("#errCategoryNameVi").text("");
  $("#errCategorySlug").text("");
}

function resetCategoryForm() {
  $("#categoryForm")[0].reset();

  $("#editingCategoryId").val("");
  categoryFormMode = "create";
  editingCategoryId = null;

  $("#categoryFormTitle").text("Thêm danh mục mới");
  $("#btnSaveCategory").text("Lưu danh mục");

  clearCategoryFormErrors();
}

function openCreateCategoryModal() {
  resetCategoryForm();
  $("#categoryModalOverlay").addClass("active");
}

function closeCategoryModal() {
  $("#categoryModalOverlay").removeClass("active");
  resetCategoryForm();
}

function findAdminCategoryById(categoryId) {
  for (let i = 0; i < allAdminProductCategories.length; i++) {
    if (Number(allAdminProductCategories[i].id) === Number(categoryId)) {
      return allAdminProductCategories[i];
    }
  }

  return null;
}

function openEditCategoryModal(categoryId) {
  const category = findAdminCategoryById(categoryId);

  if (!category) {
    $("#categoryAdminMessage")
      .removeClass("text-success")
      .addClass("text-danger")
      .text("Không tìm thấy danh mục cần sửa.");
    return;
  }

  categoryFormMode = "edit";
  editingCategoryId = Number(categoryId);

  $("#editingCategoryId").val(categoryId);
  $("#categoryFormTitle").text("Sửa danh mục #" + categoryId);
  $("#btnSaveCategory").text("Cập nhật danh mục");

  $("#categoryNameVi").val(category.name_vi || "");
  $("#categoryNameEn").val(category.name_en || "");
  $("#categorySlug").val(category.slug || "");

  clearCategoryFormErrors();

  $("#categoryModalOverlay").addClass("active");
}

function getCategoryFormData() {
  return {
    name_vi: $("#categoryNameVi").val().trim(),
    name_en: $("#categoryNameEn").val().trim(),
    slug: $("#categorySlug").val().trim(),
  };
}

function validateCategoryForm(data) {
  let isValid = true;

  clearCategoryFormErrors();

  if (!data.name_vi || data.name_vi.trim() === "") {
    $("#errCategoryNameVi").text("Vui lòng nhập tên danh mục tiếng Việt.");
    isValid = false;
  }

  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    $("#errCategorySlug").text(
      "Slug chỉ được dùng chữ thường, số và dấu gạch ngang.",
    );
    isValid = false;
  }

  return isValid;
}

async function submitCategoryForm() {
  if (isSavingCategory) {
    return;
  }

  const data = getCategoryFormData();

  if (!validateCategoryForm(data)) {
    return;
  }

  const isEditMode = categoryFormMode === "edit" && editingCategoryId;

  isSavingCategory = true;

  $("#btnSaveCategory")
    .prop("disabled", true)
    .text(isEditMode ? "Đang cập nhật..." : "Đang lưu...");

  $("#categoryAdminMessage").removeClass("text-danger text-success").text("");

  try {
    if (isEditMode) {
      await updateAdminCategory(editingCategoryId, data);
    } else {
      await createAdminCategory(data);
    }

    closeCategoryModal();

    allAdminProductCategories = await fetchAdminProductCategories();

    renderAdminCategories();
    renderAdminProductCategoryFilter();
    renderCreateProductCategoryOptions();

    $("#categoryAdminMessage")
      .addClass("text-success")
      .text(
        isEditMode
          ? "Đã cập nhật danh mục thành công."
          : "Đã thêm danh mục mới thành công.",
      );
  } catch (error) {
    $("#categoryAdminMessage").addClass("text-danger").text(error.message);
  } finally {
    isSavingCategory = false;

    $("#btnSaveCategory")
      .prop("disabled", false)
      .text(isEditMode ? "Cập nhật danh mục" : "Lưu danh mục");
  }
}

function initAdminProductEvents() {
  $("#btnLoadAdminProducts").click(function () {
    loadAdminProductSection();
  });

  $("#btnLoadAdminCategories").click(function () {
    loadAdminCategorySection();
  });

  $("#btnOpenCategoryModal").click(function () {
    openCreateCategoryModal();
  });

  $("#btnCloseCategoryModal").click(function () {
    closeCategoryModal();
  });

  $("#btnCancelCategoryForm").click(function () {
    closeCategoryModal();
  });

  $("#categoryModalOverlay").click(function (event) {
    if (event.target === this) {
      closeCategoryModal();
    }
  });

  $("#categoryForm").submit(function (event) {
    event.preventDefault();
    submitCategoryForm();
  });

  $(document).on("click", ".btn-edit-admin-category", function () {
    const categoryId = $(this).data("id");

    openEditCategoryModal(categoryId);
  });

  $("#btnOpenCreateProductModal").click(function () {
    openCreateProductModal();
  });

  $("#btnCloseCreateProductModal").click(function () {
    closeCreateProductModal();
  });

  $("#btnCancelCreateProduct").click(function () {
    closeCreateProductModal();
  });

  $("#createProductModalOverlay").click(function (event) {
    if (event.target === this) {
      closeCreateProductModal();
    }
  });

  $("#createProductForm").submit(function (event) {
    event.preventDefault();
    submitCreateProductForm();
  });

  $("#adminProductSearchInput").on("input", function () {
    clearTimeout(adminProductSearchTimer);

    adminProductSearchTimer = setTimeout(function () {
      renderAdminProducts();
    }, 300);
  });

  $("#adminProductCategoryFilter").change(function () {
    renderAdminProducts();
  });

  $("#adminProductStatusFilter").change(function () {
    renderAdminProducts();
  });

  $("#btnClearAdminProductFilter").click(function () {
    $("#adminProductSearchInput").val("");
    $("#adminProductCategoryFilter").val("all");
    $("#adminProductStatusFilter").val("all");

    renderAdminProducts();
  });

  $(document).on("click", ".btn-toggle-admin-product-status", function () {
    const productId = $(this).data("id");
    const nextStatus = $(this).data("active");

    toggleAdminProductStatus(productId, nextStatus);
  });

  $(document).on("click", ".btn-edit-admin-product", function () {
    const productId = $(this).data("id");

    openEditProductModal(productId);
  });

  $(document).on("click", ".btn-delete-admin-product", function () {
    const productId = $(this).data("id");

    softDeleteAdminProduct(productId);
  });

  $(document).on("click", ".btn-restore-admin-product", function () {
    const productId = $(this).data("id");

    restoreDeletedAdminProduct(productId);
  });

  $(document).on("click", ".btn-view-admin-product", function () {
    const productId = Number($(this).data("id"));

    const product = allAdminProducts.find(function (item) {
      return Number(item.id) === productId;
    });

    if (!product || !product.slug) {
      alert("Không tìm thấy slug sản phẩm để mở trang xem.");
      return;
    }

    window.open(
      "product-detail.html?id=" + encodeURIComponent(product.id),
      "_blank",
    );
  });

  $("#btnAdminLogout").click(function () {
    resetAdminProductSection();
  });
}

$(document).ready(function () {
  initAdminProductEvents();
  $("#createProductImage").on("input", function () {
    renderSingleImagePreview(
      "#createProductImage",
      "#previewMainImageBox",
      "Chưa có ảnh chính",
    );
  });

  $("#createProductHoverImage").on("input", function () {
    renderSingleImagePreview(
      "#createProductHoverImage",
      "#previewHoverImageBox",
      "Chưa có ảnh hover",
    );
  });

  $("#createProductImages").on("input", function () {
    renderGalleryImagePreview();
  });

  $("#btnChooseMainImage").click(function () {
    $("#createProductImageFile").click();
  });

  $("#createProductImageFile").change(function () {
    const file = this.files[0];

    if (!file) {
      return;
    }

    handleMainImageUpload(file);
    $(this).val("");
  });

  $("#btnChooseHoverImage").click(function () {
    $("#createProductHoverImageFile").click();
  });

  $("#createProductHoverImageFile").change(function () {
    const file = this.files[0];

    if (!file) {
      return;
    }

    handleHoverImageUpload(file);
    $(this).val("");
  });

  $("#btnChooseGalleryImages").click(function () {
    $("#createProductGalleryFiles").click();
  });

  $("#createProductGalleryFiles").change(function () {
    const files = Array.from(this.files || []);

    if (!files.length) {
      return;
    }

    handleGalleryImagesUpload(files);
    $(this).val("");
  });
});
