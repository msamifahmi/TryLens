import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError, api, apiUrl, backend, probe } from "../api/http.js";
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

/* ------------------------------------------------------------ sinkronisasi ke server */
// Mode server: UI tetap optimistis (state lokal berubah dulu), perubahan dikirim berurutan lewat antrean,
// lalu setelah antrean kosong akun dimuat ulang dari server (sumber kebenaran: media, status, nomor invoice).
const SYNC_KEYS = ["name", "phone", "store", "collections", "banners", "vto", "storeSettings", "notif", "notifRead", "subscription"];
const FRAME_SEND = ["name", "description", "buy", "style", "colorKey", "category", "price", "oldPrice", "stock", "published", "vto"];
const pick = (o, ks) => Object.fromEntries(ks.filter((k) => k in o).map((k) => [k, o[k]]));
let chain = Promise.resolve();
let pending = 0;

export const whenSynced = async () => {
  while (pending > 0) await chain;
};

export const usePartner = create(
  persist(
    (set, get) => ({
      accounts: seedAccounts(),
      session: null, // { email }
      checkout: null, // { plan, upgrade }
      lastInvoiceId: null,
      lastMode: "demo", // mode terakhir yang menulis state ini ("demo" | "server")
      server: false, // tidak disimpan
      ready: false, // tidak disimpan
      syncError: null, // tidak disimpan

      /** Dipanggil sekali saat aplikasi mulai: pilih mode server bila backend hidup, jika tidak mode demo (localStorage). */
      init: async () => {
        const up = await probe();
        if (up) {
          try {
            const { account } = await api("GET", "/api/auth/me");
            backend.partner = true;
            set({ server: true, ready: true, lastMode: "server", accounts: account ? { [account.email]: account } : {}, session: account ? { email: account.email } : null });
            return;
          } catch {
            /* jatuh ke mode demo */
          }
        }
        // Mode demo. Sisa data mode server (tanpa kata sandi) tidak boleh dianggap login.
        if (get().lastMode === "server") set({ accounts: seedAccounts(), session: null, checkout: null });
        else if (!Object.keys(get().accounts).length) set({ accounts: seedAccounts() });
        set({ server: false, ready: true, lastMode: "demo" });
      },

      applyAccount: (account) => {
        // Foto profil dari server berupa path relatif (/media/store/…) → jadikan URL absolut ke API.
        const logo = account.store?.logo;
        if (logo && logo.startsWith("/media/")) account = { ...account, store: { ...account.store, logo: apiUrl(logo) } };
        set({ accounts: { [account.email]: account }, session: { email: account.email } });
      },

      /** Muat ulang akun dari server (mis. setelah unggah berkas). */
      refresh: async () => {
        if (!get().server) return;
        try {
          const { account } = await api("GET", "/api/partner/me");
          get().applyAccount(account);
        } catch (e) {
          if (e.status === 401) set({ session: null, accounts: {} });
        }
      },

      changePassword: async (current, next) => {
        if (get().server) {
          try {
            await api("POST", "/api/auth/password", { current, next });
            return { ok: true };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        }
        const acc = get().accounts[get().session?.email];
        if (!acc || acc.password !== current) return { ok: false, error: "Password saat ini salah." };
        get().patch((a) => ({ ...a, password: next }));
        return { ok: true };
      },

      register: async ({ name, email, password }) => {
        if (get().server) {
          try {
            const { account } = await api("POST", "/api/auth/register", { name, email, password });
            get().applyAccount(account);
            return { ok: true };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        }
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

      login: async (email, password) => {
        if (get().server) {
          try {
            const { account } = await api("POST", "/api/auth/login", { email, password });
            get().applyAccount(account);
            return { ok: true };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        }
        const acc = get().accounts[email.trim().toLowerCase()];
        if (!acc || acc.password !== password) return { ok: false, error: "Email atau password salah." };
        set({ session: { email: acc.email } });
        return { ok: true };
      },

      logout: async () => {
        if (get().server) {
          await api("POST", "/api/auth/logout").catch(() => {});
          set({ session: null, checkout: null, accounts: {} });
        } else set({ session: null, checkout: null });
      },

      /** Ubah data akun yang sedang masuk: patch((akun) => akunBaru). */
      patch: (fn) => {
        const s = get();
        const key = s.session?.email;
        const prev = key && s.accounts[key];
        if (!prev) return;
        const next = fn(prev);
        set({ accounts: { ...s.accounts, [key]: next } });
        if (!s.server) return;

        const ops = [];
        const prevFrames = new Map(prev.frames.map((f) => [f.id, f]));
        const nextIds = new Set(next.frames.map((f) => f.id));
        for (const f of next.frames) {
          const old = prevFrames.get(f.id);
          const body = pick(f, FRAME_SEND);
          if (!old || JSON.stringify(pick(old, FRAME_SEND)) !== JSON.stringify(body)) ops.push(() => api("PUT", `/api/partner/frames/${encodeURIComponent(f.id)}`, body));
        }
        for (const id of prevFrames.keys()) if (!nextIds.has(id)) ops.push(() => api("DELETE", `/api/partner/frames/${encodeURIComponent(id)}`));
        const body = {};
        for (const k of SYNC_KEYS) if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) body[k] = next[k];
        if (Object.keys(body).length) ops.push(() => api("PATCH", "/api/partner/me", body));

        for (const op of ops) {
          pending++;
          chain = chain
            .then(op)
            .catch((e) => set({ syncError: e instanceof ApiError ? e.message : "Perubahan gagal disimpan." }))
            .finally(() => {
              if (--pending === 0) get().refresh();
            });
        }
      },
      clearSyncError: () => set({ syncError: null }),

      /**
       * Mulai checkout. item = { kind:"subscription", plan, interval, upgrade }
       *                     atau { kind:"ad", adType, placement, slot, frameIds, weeks, unit, total, startsOn, label, banner, backTo }
       */
      startCheckout: (item) => set({ checkout: item }),
      cancelCheckout: () => set({ checkout: null }),

      /** Simulasi pembayaran sukses → langganan aktif / pesanan iklan aktif + invoice. */
      completePayment: async (method) => {
        if (get().server) {
          const { checkout } = get();
          const ord = await api("POST", "/api/billing/checkout", checkout); // harga dihitung ulang server
          const out = await api("POST", `/api/billing/orders/${ord.orderId}/pay`, { method });
          get().applyAccount(out.account);
          set({ checkout: null, lastInvoiceId: out.invoiceId });
          return out.account.invoices.find((i) => i.id === out.invoiceId);
        }
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
      saveStore: async (values, { logo } = {}) => {
        // logo: undefined = tidak diubah · null = hapus · Blob (JPEG persegi) = ganti
        const server = get().server;
        get().patch((a) => ({
          ...a,
          store: {
            ...(a.store || {}),
            ...values,
            ...(logo !== undefined && !server ? { logo: logo ? logo.dataUrl : null } : {}),
            initials: initialsOf(values.name || a.store?.name || ""),
            setupCompletedAt: a.store?.setupCompletedAt || new Date().toISOString()
          }
        }));
        if (server && logo !== undefined) {
          try {
            await whenSynced();
            const { account } = logo ? await api("PUT", "/api/partner/store/logo", logo.blob, { raw: true }) : await api("DELETE", "/api/partner/store/logo");
            get().applyAccount(account);
          } catch (e) {
            return { ok: false, error: e.message };
          }
        }
        return { ok: true };
      }
    }),
    {
      name: "trylens-partner",
      version: 2, // v2: harga tahunan, pesanan iklan mingguan, konsultasi pindah ke store terpisah
      partialize: (s) => ({ accounts: s.accounts, session: s.session, checkout: s.checkout, lastInvoiceId: s.lastInvoiceId, lastMode: s.lastMode }),
      migrate: () => ({ accounts: seedAccounts(), session: null, checkout: null, lastInvoiceId: null, lastMode: "demo" })
    }
  )
);

/** Akun yang sedang masuk (atau null). */
export const useAccount = () => usePartner((s) => (s.session ? s.accounts[s.session.email] || null : null));
