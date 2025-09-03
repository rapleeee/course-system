export default function Head() {
  const title = "Tentang Mentora SMK Pesat – Platform Belajar Tech (RPL, TKJ, DKV)";
  const description =
    "Mentora SMK Pesat adalah platform belajar teknologi untuk RPL, TKJ, dan DKV. Terafiliasi resmi dengan SMK Pesat ITXPRO, didukung mentor tersertifikasi dan kurikulum relevan industri.";
  const url = "https://mentora.smkpesat.sch.id/navbars/about";
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Mentora',
    description,
    affiliation: {
      '@type': 'EducationalOrganization',
      name: 'SMK Pesat ITXPRO',
    },
    sameAs: [],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }}
      />
    </>
  );
}
