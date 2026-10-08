import { motion, useReducedMotion } from "motion/react";
import { useLocation } from "react-router-dom";

/** Transisi antarhalaman: konten baru naik pelan sambil memudar masuk. `by` menentukan kunci (default: path penuh). */
export default function PageTransition({ children, by }) {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  return (
    <motion.div key={by ?? pathname} initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
