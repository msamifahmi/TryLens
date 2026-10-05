import { useMemo } from "react";
import { PRODUCTS } from "../data/mockData.js";
import { useConsult } from "../store/useConsult.js";
import { useWishlist } from "../store/useWishlist.js";
import { recommend, scoreAll } from "./recommend.js";

function useSignals() {
  const face = useConsult((s) => s.face);
  const viewed = useConsult((s) => s.viewed);
  const items = useWishlist((s) => s.items);
  const wished = useMemo(() => Object.values(items || {}).filter((p) => p && p.id), [items]);
  return { face, viewed, wished };
}

/** Daftar rekomendasi teratas (dengan keragaman) — untuk strip di menu VTO & detail produk. */
export function useRecommendations({ currentId = null, category = "Semua", limit = 6, liveFaceMm = null, merchantIds = null } = {}) {
  const { face, viewed, wished } = useSignals();
  return useMemo(
    () => recommend({ products: PRODUCTS, face, liveFaceMm, viewed, wished, currentId, category, limit, merchantIds }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [face, viewed, wished, currentId, category, limit, liveFaceMm, (merchantIds || []).join()]
  );
}

/** Skor untuk semua produk — untuk urutan "Paling cocok" dan lencana kecocokan di kartu. */
export function useMatchScores({ category = "Semua" } = {}) {
  const { face, viewed, wished } = useSignals();
  return useMemo(() => scoreAll({ products: PRODUCTS, face, viewed, wished, category }), [face, viewed, wished, category]);
}
