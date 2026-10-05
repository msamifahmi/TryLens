import { useRef, useState } from "react";
import MerchantAvatar from "../MerchantAvatar.jsx";
import { cropSquare } from "../../lib/mediaDb.js";
import { Btn, Field, Tile, inputCls } from "./ui.jsx";

export const PROVINCES = ["DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali", "Sumatera Utara", "Sulawesi Selatan", "Lainnya"];
export const BRAND_COLORS = ["#427AB5", "#406AAF", "#35608F", "#5B8FC2", "#3E6A9C", "#2F5586"];
const LINK_KEYS = ["instagram", "x", "tokopedia", "shopee"];
const initialsOf = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "TL";

/** Formulir profil toko — dipakai di Setup Toko (onboarding) dan Toko → Profil Toko. */
export default function StoreForm({ initial, submitLabel, onSubmit, footerExtra, submitClassName = "" }) {
  const [f, setF] = useState({
    name: initial?.name || "",
    city: initial?.city ? initial.city.split(",")[0].trim() : "",
    province: initial?.province || "Jawa Tengah",
    description: initial?.description || "",
    address: initial?.address || "",
    whatsapp: initial?.whatsapp || "",
    phone: initial?.phone || "",
    instagram: initial?.links?.instagram || "",
    x: initial?.links?.x || "",
    tokopedia: initial?.links?.tokopedia || "",
    shopee: initial?.links?.shopee || "",
    color: initial?.color || BRAND_COLORS[0]
  });
  // logo: undefined = tidak berubah · null = dihapus · {blob,dataUrl} = foto baru
  const [logo, setLogo] = useState(undefined);
  const [logoErr, setLogoErr] = useState("");
  const fileRef = useRef(null);
  const shownLogo = logo === undefined ? initial?.logo || null : logo ? logo.dataUrl : null;
  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setLogoErr("");
      setLogo(await cropSquare(file));
    } catch (err) {
      setLogoErr(err.message);
    }
  }
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    const links = Object.fromEntries(LINK_KEYS.filter((k) => f[k].trim()).map((k) => [k, f[k].trim()]));
    onSubmit({
      name: f.name.trim(),
      city: f.city.trim(),
      province: f.province,
      description: f.description.trim(),
      address: f.address.trim(),
      whatsapp: f.whatsapp.replace(/\D/g, ""),
      phone: f.phone.trim(),
      color: f.color,
      links
    }, { logo });
  }

  return (
    <form onSubmit={submit}>
      <Tile className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 flex items-center gap-4 pb-2">
          <MerchantAvatar
            merchant={{ name: f.name, color: f.color, initials: initialsOf(f.name) }}
            src={shownLogo}
            className="w-16 h-16 rounded-2xl text-xl font-extrabold"
          />
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-ink-text m-0 mb-1.5">Foto profil toko</p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} data-testid="logo-input" />
              <Btn type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>{shownLogo ? "Ganti foto" : "Unggah foto"}</Btn>
              {shownLogo && <Btn type="button" size="sm" variant="ghost" onClick={() => setLogo(null)}>Hapus</Btn>}
              <span className="text-[11.5px] text-ink-muted">JPG/PNG/WebP · dipotong persegi · tanpa foto → inisial</span>
            </div>
            {logoErr && <p className="text-xs text-red-600 m-0 mb-2" role="alert">{logoErr}</p>}
            <p className="text-[12.5px] font-medium text-ink-text m-0 mb-1.5">Warna brand</p>
            <div className="flex gap-2">
              {BRAND_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setF((p) => ({ ...p, color: c }))}
                  aria-label={`Warna ${c}`}
                  aria-pressed={f.color === c}
                  className={`w-7 h-7 rounded-full ${f.color === c ? "ring-2 ring-offset-2 ring-blue-deep" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <Field label="Nama toko *" className="md:col-span-2">
          <input className={inputCls} value={f.name} onChange={set("name")} placeholder="mis. Optik Sinar Baru" required />
        </Field>
        <Field label="Kota *">
          <input className={inputCls} value={f.city} onChange={set("city")} placeholder="mis. Surakarta" required />
        </Field>
        <Field label="Provinsi *">
          <select className={inputCls} value={f.province} onChange={set("province")}>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Deskripsi singkat" className="md:col-span-2">
          <textarea className={`${inputCls} h-24 py-2.5 resize-none`} value={f.description} onChange={set("description")} placeholder="Ceritakan layanan dan keunggulan toko Anda" />
        </Field>
        <Field label="Alamat" className="md:col-span-2">
          <input className={inputCls} value={f.address} onChange={set("address")} placeholder="Jalan, nomor, kecamatan" />
        </Field>
        <Field label="WhatsApp *" hint="Dipakai tombol “Hubungi Toko” dan konsultasi pelanggan (langsung ke nomor ini). Format 62812…">
          <input className={inputCls} value={f.whatsapp} onChange={set("whatsapp")} placeholder="62812xxxxxxx" inputMode="tel" required />
        </Field>
        <Field label="Telepon">
          <input className={inputCls} value={f.phone} onChange={set("phone")} placeholder="0271-xxxxxx" />
        </Field>

        <p className="md:col-span-2 text-[12.5px] font-semibold text-ink-text m-0 mt-2">Tautan online (opsional)</p>
        <Field label="Instagram"><input className={inputCls} value={f.instagram} onChange={set("instagram")} placeholder="https://instagram.com/…" /></Field>
        <Field label="X"><input className={inputCls} value={f.x} onChange={set("x")} placeholder="https://x.com/…" /></Field>
        <Field label="Tokopedia"><input className={inputCls} value={f.tokopedia} onChange={set("tokopedia")} placeholder="https://tokopedia.com/…" /></Field>
        <Field label="Shopee"><input className={inputCls} value={f.shopee} onChange={set("shopee")} placeholder="https://shopee.co.id/…" /></Field>
      </Tile>

      <div className="flex items-center gap-4 mt-5">
        <Btn type="submit" size="lg" className={submitClassName}>{submitLabel}</Btn>
        {footerExtra}
      </div>
    </form>
  );
}
