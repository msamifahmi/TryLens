/**
 * Gambar yang selalu tampil UTUH (tidak terpotong) di kotak berukuran apa pun: gambar asli di tengah (object-contain),
 * dan sisi yang kosong diisi salinan gambar yang sama dalam keadaan buram. Dipakai untuk banner dari admin.
 * Kotak pemakai menentukan ukuran lewat className (mis. "absolute inset-0" atau "aspect-[16/9] w-full").
 */
export default function FitImage({ src, alt = "", className = "", eager = false }) {
  return (
    <div className={`relative overflow-hidden bg-[#0d1520] ${className}`}>
      <div
        aria-hidden="true"
        className="absolute -inset-6 bg-center bg-cover blur-2xl brightness-75"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
        className="relative z-[1] block w-full h-full object-contain"
      />
    </div>
  );
}
