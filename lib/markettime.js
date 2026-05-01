/**
 * MarketTime API client — server-side only.
 * All calls require the x-api-key header. This file must NEVER be imported
 * from client components. Import only in route handlers and server actions.
 */

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const WHO_AM_I = process.env.MT_REP_GROUP_ID;
const API_KEY = process.env.MT_API_KEY;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mtFetch = async (path, options = {}) => {
  if (!WHO_AM_I || !API_KEY) {
    throw new Error('MarketTime env vars (MT_REP_GROUP_ID, MT_API_KEY) are not configured.');
  }

  const url = `${BASE_URL}/${WHO_AM_I}${path}`;
  let res;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        // Disable Next.js caching — data is managed via Supabase sync
        cache: 'no-store',
      });

      if (res.ok || res.status < 500) break;
    } catch (err) {
      if (attempt === 3) {
        throw new Error(`MarketTime fetch failed after 3 attempts: ${path} — ${err.message}`);
      }
    }

    await sleep(500 * attempt);
  }

  if (!res.ok) {
    let details = '';
    try {
      const errorBody = await res.json();
      details = errorBody.error?.message ? `: ${errorBody.error.message}` : '';
    } catch {
      // Some MarketTime errors are not JSON; keep the status-only message.
    }

    throw new Error(`MarketTime API error: ${res.status} ${res.statusText}${details} — ${path}`);
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

export const getManufacturerShippingMethods = async (manufacturerID) => {
  const methods = await mtFetch('/manufacturers/shippingMethods');
  const list = Array.isArray(methods) ? methods : methods?.records ?? [];

  return list.filter((method) =>
    method.recordDeleted !== true &&
    (!manufacturerID || method.manufacturerID === manufacturerID)
  );
};

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

const toQueryFilters = (filters = {}) => {
  if (Array.isArray(filters)) return filters;

  return Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([field, value]) => ({ field, operator: 'eq', value }));
};

export const getOrders = ({ offset = 0, recordSize = 250, ...filters } = {}) => {
  const qs = new URLSearchParams({
    offset: String(offset),
    recordSize: String(Math.min(recordSize, 250)),
  });

  return mtFetch(`/orders/get?${qs}`, {
    method: 'POST',
    body: JSON.stringify(toQueryFilters(filters)),
  });
};

export const getOrderTracking = (orderID) =>
  mtFetch(`/orders/${orderID}/trackingdetails/get`);

export const getOrderHistory = (orderID) =>
  mtFetch(`/orders/${orderID}/orderChangesHistory/get`, { method: 'POST' });
