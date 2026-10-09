import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { INFO_PAGES, PLAN_ROWS } from "../data/infoPages.js";
import { CONTACT } from "../data/siteInfo.js";

function Faq({ items }) {
  const [open, setOpen] = useState(0);
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={it.q} className="bg-white border border-border rounded-2xl overflow-hidden">
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)} className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3 font-semibold text-[14.5px] text-ink">
            {it.q}
            <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: reduce ? 0 : 0.2 }} className="text-ink-muted flex-shrink-0">⌄</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                <p className="px-4 pb-4 m-0 text-[14px] leading-relaxed text-ink-muted">{it.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function Contact() {
  const [sp] = useSearchParams();
  const topic = sp.get("topik") === "karier" ? "Minat karier" : "";
  const [f, setF] = useState({ name: "", email: "", subject: topic, message: "" });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(f.subject || "Pertanyaan TryLens")}&body=${encodeURIComponent(`${f.message}\n\n— ${f.name} (${f.email})`)}`;
  const input = "w-full h-11 px-3.5 rounded-xl border border-border bg-white text-[14px] outline-none focus:border-blue";
  return (
    <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
      <form onSubmit={(e) => { e.preventDefault(); window.location.href = mailto; }} className="bg-white border border-border rounded-2xl p-5 grid gap-3">
        <label className="grid gap-1 text-[12.5px] font-semibold text-ink-text">Nama<input className={input} required value={f.name} onChange={set("name")} /></label>
        <label className="grid gap-1 text-[12.5px] font-semibold text-ink-text">Email<input className={input} type="email" required value={f.email} onChange={set("email")} /></label>
        <label className="grid gap-1 text-[12.5px] font-semibold text-ink-text">Topik<input className={input} value={f.subject} onChange={set("subject")} placeholder="Pertanyaan, kerja sama, kendala…" /></label>
        <label className="grid gap-1 text-[12.5px] font-semibold text-ink-text">Pesan<textarea className={`${input} h-32 py-2.5 resize-none`} required value={f.message} onChange={set("message")} /></label>
        <button className="h-11 rounded-full bg-blue text-white font-bold text-sm hover:bg-blue-deep">Kirim lewat email</button>
        <p className="text-[12px] text-ink-muted m-0">Tombol ini membuka aplikasi emailmu dengan pesan yang sudah terisi.</p>
      </form>
      <aside className="bg-surface-blue/60 border border-border rounded-2xl p-5 grid gap-3 text-[13.5px]">
        {CONTACT.email && <div><p className="m-0 text-[11.5px] text-ink-muted">Email</p><a className="font-semibold text-blue-deep" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>}
        {CONTACT.whatsapp && <div><p className="m-0 text-[11.5px] text-ink-muted">WhatsApp</p><a className="font-semibold text-blue-deep" href={`https://wa.me/${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">+{CONTACT.whatsapp}</a></div>}
        {CONTACT.address && <div><p className="m-0 text-[11.5px] text-ink-muted">Alamat</p><p className="m-0 font-semibold text-ink-text">{CONTACT.address}</p></div>}
        {CONTACT.hours && <div><p className="m-0 text-[11.5px] text-ink-muted">Jam layanan</p><p className="m-0 font-semibold text-ink-text">{CONTACT.hours}</p></div>}
        <p className="m-0 text-[12px] text-ink-muted">Pemilik toko optik? Lihat <Link className="underline" to="/panduan-merchant">Panduan Merchant</Link>.</p>
      </aside>
    </div>
  );
}

function Block({ b }) {
  switch (b.type) {
    case "h": return <h2 className="text-[18px] font-bold text-ink mt-8 mb-3">{b.text}</h2>;
    case "p": return <p className="text-[14.5px] leading-relaxed text-ink-muted my-3 max-w-[720px]">{b.text}</p>;
    case "list": return <ul className="my-3 pl-5 text-[14.5px] leading-relaxed text-ink-muted max-w-[720px] list-disc flex flex-col gap-1.5">{b.items.map((x) => <li key={x}>{x}</li>)}</ul>;
    case "steps": return (
      <ol data-stagger className="list-none p-0 my-4 grid gap-3 max-w-[760px]">
        {b.items.map((s, i) => (
          <li key={s.t} className="flex gap-3.5 bg-white border border-border rounded-2xl p-4">
            <span className="w-8 h-8 rounded-full bg-blue text-white font-bold text-sm flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <div><p className="m-0 font-bold text-ink text-[15px]">{s.t}</p><p className="m-0 mt-1 text-[13.5px] leading-relaxed text-ink-muted">{s.d}</p></div>
          </li>
        ))}
      </ol>
    );
    case "cards": return (
      <div data-stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
        {b.items.map((c) => {
          const body = <><p className="m-0 font-bold text-ink text-[15px]">{c.t}</p><p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{c.d}</p></>;
          return c.to ? <Link key={c.t} to={c.to} className="block bg-white border border-border rounded-2xl p-4">{body}</Link> : <div key={c.t} className="bg-white border border-border rounded-2xl p-4">{body}</div>;
        })}
      </div>
    );
    case "faq": return <Faq items={b.items} />;
    case "plans": return (
      <div className="grid md:grid-cols-2 gap-3 my-4">
        {PLAN_ROWS().map((p) => (
          <div key={p.name} className="bg-white border border-border rounded-2xl p-4">
            <p className="m-0 font-bold text-ink text-[16px]">{p.name}</p>
            <p className="m-0 mb-2 text-[13px] text-blue-deep font-semibold">{p.price}</p>
            <ul className="m-0 pl-4 text-[13px] text-ink-muted leading-relaxed list-disc">{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        ))}
      </div>
    );
    case "cta": return <Link to={b.to} className="inline-flex h-11 px-6 mt-6 items-center rounded-full bg-blue text-white font-bold text-sm hover:bg-blue-deep">{b.label}</Link>;
    case "contact": return <Contact />;
    default: return null;
  }
}

/** Halaman info statis untuk menu footer. `page` = kunci di INFO_PAGES. */
export default function InfoPage({ page }) {
  const data = INFO_PAGES[page];
  if (!data) return null;
  return (
    <div className="max-w-[1000px] mx-auto px-5 py-10 min-h-[60vh]">
      <p className="text-[13px] text-ink-muted mb-4"><Link to="/" className="hover:text-blue">TryLens</Link> / {data.title}</p>
      <h1 className="text-3xl font-extrabold text-ink tracking-tight m-0 mb-2">{data.title}</h1>
      <p className="text-[15.5px] text-ink-muted m-0 mb-4 max-w-[720px]">{data.lead}</p>
      {data.blocks.map((b, i) => <Block key={i} b={b} />)}
    </div>
  );
}
