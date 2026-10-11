import { motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";

// Ganti frame di Coba Virtual hanya mengubah :id → jangan remount (kamera tetap menyala, tanpa minta izin lagi).
const stableKey = (p) => (p.startsWith("/try-on/") ? "/try-on" : p);

/** Transisi antarhalaman: konten baru naik pelan sambil memudar masuk. `by` menentukan kunci (default: path penuh). */
export default function PageTransition({ children, by }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  return (
    <motion.div key={by ?? stableKey(pathname)} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
