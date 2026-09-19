import { createContext, useContext } from "react";
import { useToast } from "../hooks/useToast.js";
import ToastStack from "../components/Toast.jsx";

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const { toasts, showToast } = useToast();
  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <ToastStack toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  return useContext(ToastContext);
}
