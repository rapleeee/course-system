export default function Head() {
  const title = "Karir Mentora SMK Pesat – Join Our Team";
  const description =
    "Bergabung dengan tim Mentora SMK Pesat. Buka posisi Web Developer, Mentor Programmer, dan Design & Publication.";
  const url = "https://mentora.smkpesat.sch.id/navbars/career";
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: title,
            description,
          }),
        }}
      />
    </>
  );
}
