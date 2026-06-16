/** Chuẩn hóa kiểm tra đơn / nhà xe thuộc khu vực Đà Nẵng. */
function normalizeCity(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/đ/g, 'd') // đ does not decompose under NFD — must map before accent strip
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function isDaNangCity(value) {
  const n = normalizeCity(value);
  return n.includes('da nang') || n.includes('danang');
}

function isDaNangOrder(order) {
  return (
    isDaNangCity(order?.pickup_city) ||
    isDaNangCity(order?.delivery_city) ||
    isDaNangCity(order?.pickup_address) ||
    isDaNangCity(order?.delivery_address) ||
    isDaNangCity(order?.pickup_district) ||
    isDaNangCity(order?.delivery_district)
  );
}

module.exports = { normalizeCity, isDaNangCity, isDaNangOrder };
