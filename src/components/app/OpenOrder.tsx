import { useEffect, useState } from 'react';
import { harbour } from '@/lib/copy';
import { clearOpenOrder, loadOpenOrder, type OpenOrder as Order } from '@/lib/device-store';
import { draftPath } from '@/lib/pour-draft';

/**
 * An order from the harbour, waiting to be rated: on Radio, Compass and Log
 * alike, until it is rated (`/log` clears it) or set aside. It is on the
 * device, so it is read after mount.
 */
export function OpenOrder({ displayName }: { displayName: (name: string) => string }) {
  const [order, setOrder] = useState<Order | null>(null);
  useEffect(() => setOrder(loadOpenOrder()), []);
  if (!order) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 border border-foreground bg-card px-4 py-2">
      <div className="mr-auto flex min-w-0 flex-col">
        <span className="label-caps">{harbour.waiting}</span>
        <span className="truncate font-serif text-base font-bold text-foreground">
          {displayName(order.drink)}
          {(order.bar || order.atHome) && (
            <span className="font-normal italic text-muted-foreground">
              {' '}
              · {order.atHome ? harbour.atHome : order.bar}
            </span>
          )}
        </span>
      </div>
      <a href={draftPath({ drink: order.drink, atHome: order.atHome, bar: order.bar })} className="btn btn-primary px-4">
        {harbour.rate}
      </a>
      <button
        type="button"
        onClick={() => {
          clearOpenOrder();
          setOrder(null);
        }}
        className="inline-flex min-h-11 items-center font-condensed text-xs uppercase tracking-label text-muted-foreground hover:text-foreground"
      >
        {harbour.dismiss}
      </button>
    </div>
  );
}
