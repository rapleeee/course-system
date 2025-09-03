import Navbar from "@/components/layouts/Navbar";
import { MapPin, Phone, Mail, Clock, Navigation, Car, Train } from "lucide-react";

export default function LocationPage() {
  const office = {
    name: "Mentora Office",
    street: "Jl. Poras No. 07",
    city: "Bogor Barat",
    region: "Bogor Kota",
    postalCode: "16117",
    country: "ID",
    phone: "+62-812-3456-7890",
    email: "mentora.id@gmail.com",
    mapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3958.917631319298!2d106.827153!3d-6.175392!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwMTAnMzEuNCJTIDEwNsKwNDknMzcuOCJF!5e0!3m2!1sen!2sid!4v1700000000000",
    mapsLink:
      "https://www.google.com/maps/dir/?api=1&destination=Jl.%20Contoh%20No.%20123%2C%20Jakarta%2C%20Indonesia",
    hours: [
      { day: "Senin–Jumat", time: "09.00 – 18.00" },
      { day: "Sabtu & Minggu", time: "Tutup" },
    ],
  } as const;

  return (
    <>
      <Navbar />
      <div className="min-h-screen mt-16 flex flex-col items-center px-6 md:px-10">
        <div className="max-w-5xl w-full text-left sm:text-center">
          <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight">
            Temukan Kami — Lokasi Kantor
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg mt-4">
            Kunjungi kantor {office.name}. Kami siap menyambut Anda untuk konsultasi, meeting, atau sekadar silaturahmi.
          </p>
        </div>

        <section className="max-w-5xl w-full my-10 grid md:grid-cols-5 gap-6" aria-labelledby="contact-heading">
          <div className="md:col-span-2 space-y-4">
            <h2 id="contact-heading" className="sr-only">Informasi Kontak dan Alamat</h2>
            <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
              <header className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin aria-hidden className="h-5 w-5 text-[#f5bb64]" /> Alamat Kantor
                </h3>
              </header>
              <div className="p-5 sm:p-6 text-neutral-200">
                <address className="not-italic leading-relaxed" itemScope itemType="https://schema.org/PostalAddress">
                  <div itemProp="streetAddress">{office.street}</div>
                  <div>
                    <span itemProp="addressLocality">{office.city}</span>,
                    <span className="ml-1" itemProp="addressRegion">{office.region}</span>
                  </div>
                  <div>
                    <span itemProp="postalCode">{office.postalCode}</span>,
                    <span className="ml-1" itemProp="addressCountry">Indonesia</span>
                  </div>
                </address>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Phone aria-hidden className="h-4 w-4 text-neutral-300" />
                    <a
                      href={`tel:${office.phone.replace(/[^+\d]/g, "")}`}
                      className="text-white hover:underline"
                      aria-label={`Telepon ${office.name} di ${office.phone}`}
                    >
                      {office.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail aria-hidden className="h-4 w-4 text-neutral-300" />
                    <a
                      href={`mailto:${office.email}`}
                      className="text-white hover:underline"
                      aria-label={`Email ${office.name}`}
                    >
                      {office.email}
                    </a>
                  </div>
                </div>

                <div className="mt-4">
                  <a
                    href={office.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer nofollow external"
                    className="inline-flex items-center gap-2 rounded-lg border border-[#f5bb64] px-4 py-2 text-sm font-semibold text-white hover:bg-[#f5bb64] hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bb64] focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 transition-colors"
                    aria-label="Dapatkan arah ke kantor di Google Maps"
                  >
                    <Navigation aria-hidden className="h-4 w-4" /> Dapatkan Arah
                  </a>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
              <header className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Clock aria-hidden className="h-5 w-5 text-[#f5bb64]" /> Jam Operasional
                </h3>
              </header>
              <div className="p-5 sm:p-6 text-neutral-200">
                <ul className="text-sm space-y-1">
                  {office.hours.map((h) => (
                    <li key={h.day} className="flex justify-between">
                      <span>{h.day}</span>
                      <span className="text-neutral-300">{h.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-xl border border-neutral-700/60 bg-neutral-800/60 backdrop-blur-sm shadow-md overflow-hidden">
              <header className="px-5 sm:px-6 pt-5 sm:pt-6">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Train aria-hidden className="h-5 w-5 text-[#f5bb64]" /> Transportasi & Parkir
                </h3>
              </header>
              <div className="p-5 sm:p-6 text-neutral-200">
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Stasiun terdekat: Stasiun Bogor (±10 menit menggunakan angkot arah terminal bulalak)</li>
                  <li>Halte bus terdekat: Halte Sindangbarang (±5 menit jalan kaki)</li>
                  <li className="flex items-start gap-2">
                    <Car aria-hidden className="mt-0.5 h-4 w-4 text-neutral-300" />
                    <span>Area parkir tersedia terbatas. Disarankan menggunakan transportasi umum.</span>
                  </li>
                </ul>
              </div>
            </article>
          </div>

          <div className="md:col-span-3">
            <h2 className="sr-only">Peta Lokasi</h2>
            <div className="rounded-xl overflow-hidden border border-neutral-700/60 shadow-md bg-neutral-800/60">
              <iframe
                title={`Peta lokasi ${office.name}`}
                src={office.mapsEmbed}
                width="100%"
                height="420"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <p className="text-xs text-neutral-400 mt-2">
              Peta di-embed dari Google Maps. Klik <span className="font-bold">Dapatkan Arah</span> untuk navigasi.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
