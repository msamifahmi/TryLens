export function defaultDoc() {
  return {
    subscription: null,
    store: null,
    collections: [],
    banners: [],
    adOrders: [],
    invoices: [],
    notifRead: [],
    vto: { enabled: true, share: true, tint: "clear" },
    storeSettings: {
      visible: true,
      showContact: true,
      autoReply: "Terima kasih sudah menghubungi kami! Tim kami akan membalas dalam 1 jam pada jam operasional.",
      hours: "Senin–Sabtu, 09.00–20.00"
    },
    notif: {
      newLead: { email: true, whatsapp: true, app: true },
      billing: { email: true, whatsapp: false, app: true },
      weekly: { email: true, whatsapp: false, app: false },
      promo: { email: false, whatsapp: false, app: true }
    }
  };
}
