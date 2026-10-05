import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const STATUS = {
  ok: { Icon: CheckCircle2, label: "Pas", cls: "text-[#15803D]" },
  warn: { Icon: AlertTriangle, label: "Perhatikan", cls: "text-[#B45309]" },
  bad: { Icon: XCircle, label: "Kurang pas", cls: "text-[#B91C1C]" }
};

/** Laporan kecocokan frame di wajah (hasil titik-titik jangkar). Status ditulis dengan teks, bukan hanya warna. */
export default function FitReport({ report }) {
  if (!report?.length) {
    return (
      <p className="text-[12px] text-ink-muted m-0">
        Nyalakan kamera dan hadapkan wajah lurus sebentar — laporan kecocokan frame muncul setelah ukuran wajahmu terkalibrasi.
      </p>
    );
  }
  return (
    <div>
      <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
        {report.map((r) => {
          const { Icon, label, cls } = STATUS[r.status];
          return (
            <li key={r.key} className="flex items-start gap-2">
              <Icon size={16} className={`flex-shrink-0 mt-0.5 ${cls}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink-text m-0">
                  {r.title} <span className="sr-only">— {label}</span>
                </p>
                <p className="text-[12px] text-ink-muted m-0">
                  {r.value} · <span className={`font-semibold ${cls}`}>{r.note}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-ink-muted m-0 mt-2.5">
        Perkiraan dari kamera (±2–3 mm). Penilaian akhir tetap di optik.
      </p>
    </div>
  );
}
