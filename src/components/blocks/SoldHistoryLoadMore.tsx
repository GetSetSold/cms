"use client";

import { Children, useState } from "react";
import { SwipeRow } from "./SwipeRow";

/** Progressive disclosure for the sold-history city carousel: the server
 *  renders all cards as children; the client shows the first `perPage`
 *  and reveals more on each tap. No button when everything already shows. */
export function SoldHistoryLoadMore({ children, perPage = 12 }: { children: React.ReactNode; perPage?: number }) {
  const items = Children.toArray(children);
  const [visible, setVisible] = useState(perPage);
  return (
    <div className="flex flex-col gap-5">
      <SwipeRow>{items.slice(0, visible)}</SwipeRow>
      {visible < items.length ? (
        <button
          type="button"
          onClick={() => setVisible((v) => v + perPage)}
          className="self-center rounded-[var(--radius-btn)] border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink shadow-[var(--shadow-card)]"
        >
          Load more ({items.length - visible} more)
        </button>
      ) : null}
    </div>
  );
}
