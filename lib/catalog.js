// Columns needed for catalog grids — excludes the heavy `raw` jsonb blob
// which can be 10KB+ per row and breaks RSC payloads / slows the UI.
export const CATALOG_PRODUCT_SELECT =
  'record_id, item_number, manufacturer_id, manufacturer_name, name, unit_price, primary_image_url, is_available, discontinued, discount_percent, minimum_quantity, quantity_increment, unit_qty, rep_group_category_path, description';
