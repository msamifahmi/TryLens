import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AD_TYPES, INTERVALS, addMonths, endsOn, planLabel, planPrice, seedAccounts } from "../data/partnerMock.js";

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
          adOrders: [],
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

      /**
       * Mulai checkout. item = { kind:"subscription", plan, interval, upgrade }
       *                     atau { kind:"ad", adType, placement, slot, frameIds, weeks, unit, total, startsOn, label, banner, backTo }
       */
      startCheckout: (item) => set({ checkout: item }),
      cancelCheckout: () => set({ checkout: null }),

      /** Simulasi pembayaran sukses → langganan aktif / pesanan iklan aktif + invoice. */
      completePayment: (method) => {
        const { session, accounts, checkout } = get();
        const acc = accounts[session.email];
        const iso = new Date().toISOString();
        const stamp = iso.slice(0, 10).replace(/-/g, "");
        const all = Object.values(accounts);
        const taken = (id) => all.some((a) => a.invoices.some((i) => i.id === id));
        let n = all.reduce((sum, a) => sum + a.invoices.length, 0) + 1;
        while (taken(`INV-${stamp}-${String(n).padStart(4, "0")}`)) n += 1;
        const invNo = `INV-${stamp}-${String(n).padStart(4, "0")}`;
        let next;
        let invoice;

        if (checkout.kind === "ad") {
          const c = checkout;
          const order = {
            id: `AO-${stamp}-${String(n).padStart(4, "0")}`,
            type: c.adType,
            placement: c.placement || null,
            label: c.label,
            weeks: c.weeks,
            unit: c.unit,
            total: c.total,
            startsOn: c.startsOn,
            endsOn: endsOn(c.startsOn, c.weeks),
            status: "paid",
            frameIds: c.frameIds || [],
            slot: c.slot || null
          };
          invoice = { id: invNo, date: iso.slice(0, 10), kind: "ad", label: `${c.label} (${c.weeks} minggu)`, amount: c.total, status: "paid", method, tab: AD_TYPES[c.adType].tab };
          const banner =
            c.adType === "banner"
              ? { id: `b-${Date.now().toString(36)}`, ...c.banner, placement: c.placement, orderId: order.id, status: "pending_review", startsAt: c.startsOn, endsAt: order.endsOn, impressions: 0, clicks: 0 }
              : null;
          next = { ...acc, adOrders: [order, ...acc.adOrders], banners: banner ? [banner, ...acc.banners] : acc.banners, invoices: [invoice, ...acc.invoices] };
        } else {
          const { plan, interval } = checkout;
          const end = addMonths(iso, INTERVALS[interval].months);
          invoice = { id: invNo, date: iso.slice(0, 10), kind: "subscription", label: planLabel(plan, interval), plan, amount: planPrice(plan, interval), status: "paid", method };
          const subscription = { plan, interval, status: "active", startedAt: iso, currentPeriodEnd: end, nextBillingAt: end, cancelAtPeriodEnd: false, pendingPlan: null };
          next = { ...acc, subscription, invoices: [invoice, ...acc.invoices] };
        }
        set((s) => ({ accounts: { ...s.accounts, [acc.email]: next }, checkout: null, lastInvoiceId: invoice.id }));
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
    {
      name: "trylens-partner",
      version: 2, // v2: harga tahunan, pesanan iklan mingguan, konsultasi pindah ke store terpisah
      migrate: () => ({ accounts: seedAccounts(), session: null, checkout: null, lastInvoiceId: null })
    }
  )
);

/** Akun yang sedang masuk (atau null). */
export const useAccount = () => usePartner((s) => (s.session ? s.accounts[s.session.email] || null : null));
