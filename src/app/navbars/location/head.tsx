export default function Head() {
  const title = "Lokasi Kantor – Mentora SMK Pesat";
  const description =
    "Alamat kantor Mentora di Bogor, lengkap dengan jam operasional, rute, dan peta lokasi. Afiliasi resmi SMK Pesat ITXPRO.";
  const url = "https://mentora.smkpesat.sch.id/navbars/location";
  const business = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Mentora',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Jl. Poras No. 07',
      addressLocality: 'Bogor Barat',
      addressRegion: 'Bogor Kota',
      postalCode: '16117',
      addressCountry: 'ID',
    },
    telephone: '+62-812-3456-7890',
    email: 'mentora.id@gmail.com',
    url: 'https://mentora.smkpesat.sch.id',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
        ],
        opens: '09:00',
        closes: '18:00',
      },],
  } as const;
  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(business) }}
      />
    </>
  );
}
