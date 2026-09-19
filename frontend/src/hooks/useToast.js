import { useCallback, useState } from "react";

let idCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, positive = true) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, positive }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  return { toasts, showToast };
}
