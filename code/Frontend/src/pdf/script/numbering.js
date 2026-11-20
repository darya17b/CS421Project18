// Printed part numbers. Parts are referenced by their stable ids from layout.js,
// and the label each one prints with is resolved per document.

import { createContext, useContext } from "react";
import { SCRIPT_PARTS } from "./layout";

// handles build part labels
// Numbers the included parts 1, 2, 3… in order; a continued part shares the
// number of the part before it (e.g. 5.2 follows 5 as "1.2" when 5 prints as 1).
export function buildPartLabels(parts) {
  let count = 0;
  return Object.fromEntries(
    parts.map((part) => {
      if (SCRIPT_PARTS[part].continued) return [part, `${count}.2`];
      count += 1;
      return [part, String(count)];
    }),
  );
}

// handles format part title
export function formatPartTitle(part, labels) {
  const label = labels[part];
  return label ? `Part ${label} – ${SCRIPT_PARTS[part].name}` : null;
}

export const PartLabelsContext = createContext({});

// handles use part title
// Returns null when the part is not in the current document.
export function usePartTitle(part) {
  return formatPartTitle(part, useContext(PartLabelsContext));
}
