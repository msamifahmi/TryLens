import { create } from "zustand";
import { persist } from "zustand/middleware";
import { PLANS, seedAccounts, addMonths } from "../data/partnerMock.js";

// Sementara semua data mitra disimpan di localStorage (mode demo tanpa backend).
// Setiap aksi di bawah nanti diganti dengan pemanggilan API PHP; bentuk datanya
// mengikuti tabel di backend-php/database/schema.sql.

const initialsOf = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "TL";

/** Tahap akun: menentukan halaman mana yang boleh dibuka. */
export function stageOf(account) {
  if (!account) return "guest";
  if (!account.subscription || account.subscription.status !== "active") return "onboarding";
  if (!account.store || !account.store.setupCompletedAt) return "setup";
  return "dashboard";
}

export const STAGE_PATH = {
  guest: "/partner/login",
  onboarding: "/partner/onboarding",
  setup: "/partner/setup",
  dashboard: "/partner"
};

export const usePartner = create(
  persist(
    (set, get) => ({
      accounts: seedAccounts(),
      session: null, // { email }
      checkout: null, // { plan, upgrade }
      lastInvoiceId: null,

      register: ({ name, email, password }) => {
        const key = email.trim().toLowerCase();
        if (get().accounts[key]) return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
        const account = {
          id: "u" + Date.now(),
          name: name.trim(),
          email: key,
          password,
          phone: "",
          createdAt: new Date().toISOString(),
          subscription: null,
          store: null,
          frames: [],
          collections: [],
          banners: [],
          sponsored: [],
          highlighted: { active: false, until: null },
          leads: [],
          invoices: [],
          vto: { enabled: true, share: true, tint: "clear" },
          storeSettings: { visible: true, showContact: true, autoReply: "Terima kasih sudah menghubungi kami!", hours: "Senin–Sabtu, 09.00–20.00" },
          notif: {
            newLead: { email: true, whatsapp: true, app: true },
            billing: { email: true, whatsapp: false, app: true },
            weekly: { email: true, whatsapp: false, app: false },
            promo: { email: false, whatsapp: false, app: true }
          }
        };
        set((s) => ({ accounts: { ...s.accounts, [key]: account }, session: { email: key } }));
        return { ok: true };
      },

      login: (email, password) => {
        const acc = get().accounts[email.trim().toLowerCase()];
        if (!acc || acc.password !== password) return { ok: false, error: "Email atau password salah." };
        set({ session: { email: acc.email } });
        return { ok: true };
      },

      logout: () => set({ session: null, checkout: null }),

      /** Ubah data akun yang sedang masuk: patch((akun) => akunBaru). */
      patch: (fn) =>
        set((s) => {
          const key = s.session?.email;
          if (!key || !s.accounts[key]) return s;
          return { accounts: { ...s.accounts, [key]: fn(s.accounts[key]) } };
        }),

      startCheckout: (plan, upgrade = false) => set({ checkout: { plan, upgrade } }),
      cancelCheckout: () => set({ checkout: null }),

      /** Simulasi pembayaran sukses → langganan aktif + invoice. */
      completePayment: (method) => {
        const { session, accounts, checkout } = get();
        const acc = accounts[session.email];
        const now = new Date();
        const iso = now.toISOString();
        const stamp = iso.slice(0, 10).replace(/-/g, "");
        const invoice = {
          id: `INV-${stamp}-${String(acc.invoices.length + 1).padStart(4, "0")}`,
          date: iso.slice(0, 10),
          plan: checkout.plan,
          amount: PLANS[checkout.plan].price,
          status: "paid",
          method
        };
        const subscription = {
          plan: checkout.plan,
          status: "active",
          startedAt: iso,
          currentPeriodEnd: addMonths(iso, 1),
          nextBillingAt: addMonths(iso, 1),
          cancelAtPeriodEnd: false,
          pendingPlan: null
        };
        set((s) => ({
          accounts: { ...s.accounts, [acc.email]: { ...acc, subscription, invoices: [invoice, ...acc.invoices] } },
          checkout: null,
          lastInvoiceId: invoice.id
        }));
        return invoice;
      },

      /** Simpan profil toko (pertama kali = menyelesaikan setup toko). */
      saveStore: (values) =>
        get().patch((a) => ({
          ...a,
          store: {
            ...(a.store || {}),
            ...values,
            initials: initialsOf(values.name || a.store?.name || ""),
            setupCompletedAt: a.store?.setupCompletedAt || new Date().toISOString()
          }
        }))
    }),
    { name: "trylens-partner", version: 1 }
  )
);

/** Akun yang sedang masuk (atau null). */
export const useAccount = () => usePartner((s) => (s.session ? s.accounts[s.session.email] || null : null));
