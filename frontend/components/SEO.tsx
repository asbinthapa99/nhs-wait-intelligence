import Head from 'next/head'

interface SEOProps {
  title?: string
  description?: string
  ogImage?: string
  url?: string
}

export default function SEO({ 
  title = 'NHS Wait Intelligence | Open Source Healthcare Analytics',
  description = 'An enterprise-grade, open-source decision engine for NHS elective waiting list analysis, inequality mapping, and recovery tracking.',
  ogImage = '/og-image.jpg', // Placeholder for a real OG image
  url = 'https://waitintelligence.io'
}: SEOProps) {
  
  // Suffix the page title with the brand name if it's a specific page
  const pageTitle = title === 'NHS Wait Intelligence | Open Source Healthcare Analytics' 
    ? title 
    : `${title} | NHS Wait Intelligence`

  return (
    <Head>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={pageTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={ogImage} />
      
      {/* Basic Meta Tags */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="theme-color" content="#ffffff" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  )
}
