'use client';

import { useState } from 'react';
import OrderCard from '@/components/OrderCard';

const PAGE_SIZE = 50;

export default function OrdersList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [offset, setOffset] = useState(initialOrders.length);
  const [hasMore, setHasMore] = useState(initialOrders.length >= PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMore = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/markettime/orders/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, recordSize: PAGE_SIZE }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load more orders');

      const batch = data.orders ?? [];
      setOrders((prev) => [...prev, ...batch]);
      setOffset((prev) => prev + batch.length);
      setHasMore(data.hasMore ?? batch.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="space-y-3">
        {orders.map((order) => (
          <OrderCard key={order.recordID ?? order.id} order={order} />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 text-center mt-4">{error}</p>
      )}

      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-8 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #f15a24, #ff7a4d)' }}
          >
            {loading ? 'Loading…' : 'Load more orders'}
          </button>
        </div>
      )}
    </>
  );
}
