/**
 * MarketTime API client — server-side only.
 * All calls require the x-api-key header. This file must NEVER be imported
 * from client components. Import only in route handlers and server actions.
 */

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const WHO_AM_I = process.env.MT_REP_GROUP_ID;
const API_KEY = process.env.MT_API_KEY;

const mtFetch = async (path, options = {}) => {
  if (!WHO_AM_I || !API_KEY) {
    throw new Error('MarketTime env vars (MT_REP_GROUP_ID, MT_API_KEY) are not configured.');
  }

  const url = `${BASE_URL}/${WHO_AM_I}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
      ...options.headers,
    },
    // Disable Next.js caching — data is managed via Supabase sync
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`MarketTime API error: ${res.status} ${res.statusText} — ${path}`);
  }

  const data = await res.json();

  if (!data.success) {
    throw new Error(`MarketTime error: ${data.error?.message ?? 'Unknown error'} — ${path}`);
  }

  return data.response;
};

// ─── Items ───────────────────────────────────────────────────────────────────

/**
 * Paginated item list. Pass offset/recordSize for pagination.
 * Pass modifiedStartDate (ISO string) for delta sync.
 */
export const getItems = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return mtFetch(`/items${qs ? '?' + qs : ''}`);
};

export const getItem = (itemID) => mtFetch(`/items/${itemID}`);

export const getItemsByFilter = (filters) =>
  mtFetch('/items/get', { method: 'POST', body: JSON.stringify(filters) });

/** Fetch customer-specific pricing. Call at cart-add time, not browse time. */
export const getItemPricing = (itemID) => mtFetch(`/items/pricing/${itemID}`);

export const getItemInventory = (itemID) => mtFetch(`/items/inventory/${itemID}`);

export const getItemImages = (itemID) => mtFetch(`/items/images/${itemID}`);

// ─── Manufacturers ────────────────────────────────────────────────────────────

export const getManufacturers = () => mtFetch('/manufacturers');

export const getManufacturer = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}`);

export const getManufacturerPaymentTerms = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/paymentterms`);

export const getManufacturerShippingMethods = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/shippingMethods`);

export const getManufacturerCategories = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/categories`);

export const getManufacturerPriceCodes = (manufacturerID) =>
  mtFetch(`/manufacturers/${manufacturerID}/pricecodes`);

// ─── Customers ────────────────────────────────────────────────────────────────

export const getCustomer = (retailerID) =>
  mtFetch(`/customers/${retailerID}`);

export const getCustomerShipTos = (retailerID) =>
  mtFetch(`/customers/${retailerID}/shiptolocations`);

export const getCustomerContacts = (retailerID) =>
  mtFetch(`/customers/${retailerID}/contacts`);

export const searchCustomers = (filters) =>
  mtFetch('/customers/get', { method: 'POST', body: JSON.stringify(filters) });

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * Create a new order. Always pass manufacturerOrderStatus: "Not Transmitted".
 * Do NOT include blocked fields: retailerContactID, retailerContact, publicOrderID,
 * orderType, externalID2, manufacturerOrderNumber, origin, salespersonGroupID,
 * orderPaymentTokens, orderPayments, recordID, dateAdded, dateModified,
 * userAdded, userModified, recordDeleted.
 */
export const createOrder = (orderPayload) =>
  mtFetch('/orders', { method: 'POST', body: JSON.stringify(orderPayload) });

export const updateOrder = (orderID, orderPayload) =>
  mtFetch(`/orders/${orderID}`, { method: 'PUT', body: JSON.stringify(orderPayload) });

export const getOrders = (filters) =>
  mtFetch('/orders/get', { method: 'POST', body: JSON.stringify(filters) });

export const getOrderTracking = (orderID) =>
  mtFetch(`/orders/${orderID}/trackingdetails/get`);

export const getOrderHistory = (orderID) =>
  mtFetch(`/orders/${orderID}/orderChangesHistory/get`, { method: 'POST' });
