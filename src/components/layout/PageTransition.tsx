import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Short fade/lift whenever the pathname changes. Query-only changes (tabs,
 * filters, availability sections) intentionally do not remount the page.
 */
export default function PageTransition({
  children,
  fadeOnly = false,
}: {
  children: ReactNode;
  fadeOnly?: boolean;
}) {
  const location = useLocation();
  const reduced = useReducedMotion();
  const offset = fadeOnly ? 0 : 6;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduced ? false : { opacity: 0, y: offset }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: fadeOnly ? 0 : -4, transition: { duration: 0.12 } }}
        transition={reduced ? { duration: 0 } : { duration: 0.2, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
