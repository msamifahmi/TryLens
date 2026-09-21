import { useState } from "react";
import { Btn, Card, CardHeader, Field, Flash, Toggle, inputCls, useFlash } from "../../components/partner/ui.jsx";
import { usePartner, useAccount } from "../../store/usePartner.js";

/* ---------------------------------------------------------------- Account */
export function AccountTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const [f, setF] = useState({ name: acc.name, phone: acc.phone || "" });
  const [pw, setPw] = useState({ current: "", next: "" });
  const [err, setErr] = useState("");
  const [msg, flash] = useFlash();
  const [msg2, flash2] = useFlash();

  function saveProfile(e) {
    e.preventDefault();
    patch((a) => ({ ...a, name: f.name.trim(), phone: f.phone.trim() }));
    flash("Profil akun tersimpan");
  }
  function savePw(e) {
    e.preventDefault();
    setErr("");
    if (pw.current !== acc.password) return setErr("Password saat ini salah.");
    if (pw.next.length < 8) return setErr("Password baru minimal 8 karakter.");
    patch((a) => ({ ...a, password: pw.next }));
    setPw({ current: "", next: "" });
    flash2("Password diperbarui");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      <Card>
        <CardHeader title="Akun" subtitle="Data pemilik akun Mitra." />
        <form onSubmit={saveProfile} className="flex flex-col gap-3.5">
          <Field label="Nama lengkap"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field label="Email" hint="Email tidak dapat diubah."><input className={inputCls} value={acc.email} disabled /></Field>
          <Field label="Nomor telepon"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" /></Field>
          <div className="flex items-center gap-3"><Btn type="submit">Simpan</Btn><Flash msg={msg} /></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Ganti password" />
        <form onSubmit={savePw} className="flex flex-col gap-3.5">
          <Field label="Password saat ini"><input type="password" className={inputCls} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" required /></Field>
          <Field label="Password baru" hint="Minimal 8 karakter."><input type="password" className={inputCls} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" required /></Field>
          {err && <p role="alert" className="text-[13px] text-red-600 m-0">{err}</p>}
          <div className="flex items-center gap-3"><Btn type="submit">Perbarui password</Btn><Flash msg={msg2} /></div>
        </form>
      </Card>
    </div>
  );
}

/* --------------------------------------------------------- Store Settings */
export function StoreSettingsTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const s = acc.storeSettings;
  const set = (part) => patch((a) => ({ ...a, storeSettings: { ...a.storeSettings, ...part } }));

  return (
    <Card className="max-w-[720px]">
      <CardHeader title="Pengaturan Toko" subtitle="Perubahan tersimpan otomatis." />
      <div className="flex flex-col divide-y divide-[#E8F0F8] rounded-xl border border-[#DDE8F4] bg-white">
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[14px] font-medium text-ink m-0">Tampilkan toko di TryLens</p>
            <p className="text-[12.5px] text-ink-muted m-0">Matikan untuk menyembunyikan toko sementara (mis. saat libur).</p>
          </div>
          <Toggle checked={s.visible} onChange={(v) => set({ visible: v })} label="Tampilkan toko" />
        </div>
        <div className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-[14px] font-medium text-ink m-0">Tombol “Hubungi Toko”</p>
            <p className="text-[12.5px] text-ink-muted m-0">Izinkan pelanggan menghubungi lewat WhatsApp.</p>
          </div>
          <Toggle checked={s.showContact} onChange={(v) => set({ showContact: v })} label="Tombol hubungi toko" />
        </div>
        <div className="p-4 flex flex-col gap-3.5">
          <Field label="Jam operasional"><input className={inputCls} value={s.hours} onChange={(e) => set({ hours: e.target.value })} /></Field>
          <Field label="Balasan otomatis WhatsApp">
            <textarea className={`${inputCls} h-24 py-2.5 resize-none`} value={s.autoReply} onChange={(e) => set({ autoReply: e.target.value })} />
          </Field>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------- Notifications */
const EVENTS = [
  { key: "billing", label: "Tagihan & pembayaran", hint: "Pengingat tagihan dan bukti pembayaran" },
  { key: "weekly", label: "Laporan mingguan", hint: "Ringkasan performa toko tiap Senin" },
  { key: "promo", label: "Info & promo TryLens", hint: "Fitur baru dan program untuk mitra" }
];
const CHANNELS = [
  { key: "email", label: "Email" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "app", label: "Dalam aplikasi" }
];

export function NotificationsTab() {
  const acc = useAccount();
  const patch = usePartner((s) => s.patch);
  const set = (ev, ch, v) => patch((a) => ({ ...a, notif: { ...a.notif, [ev]: { ...a.notif[ev], [ch]: v } } }));

  return (
    <Card>
      <CardHeader title="Notifikasi" subtitle="Pilih kanal untuk tiap jenis pemberitahuan. Perubahan tersimpan otomatis." />
      <div className="overflow-x-auto rounded-xl border border-[#DDE8F4] bg-white">
        <table className="w-full text-[13px] border-collapse min-w-[560px]">
          <thead>
            <tr className="text-left text-ink-muted text-[12px]">
              <th className="font-medium px-4 py-3 border-b border-[#E8F0F8]">Pemberitahuan</th>
              {CHANNELS.map((c) => <th key={c.key} className="font-medium px-4 py-3 border-b border-[#E8F0F8] text-center">{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {EVENTS.map((e) => (
              <tr key={e.key} className="border-b border-[#E8F0F8] last:border-0">
                <td className="px-4 py-3"><span className="block font-medium text-ink">{e.label}</span><span className="block text-[12px] text-ink-muted">{e.hint}</span></td>
                {CHANNELS.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="flex justify-center"><Toggle checked={acc.notif[e.key][c.key]} onChange={(v) => set(e.key, c.key, v)} label={`${e.label} lewat ${c.label}`} /></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
