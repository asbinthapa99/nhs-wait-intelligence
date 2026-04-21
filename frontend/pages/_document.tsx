import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="NHS Wait Intelligence — open analytics platform tracking NHS England waiting list inequality, regional backlog data, and AI-powered insights for patients, researchers, and commissioners." />
        <meta name="keywords" content="NHS waiting list, RTT data, NHS inequality, backlog tracker, NHS England, healthcare analytics" />
        <meta name="author" content="NHS Wait Intelligence" />
        <meta property="og:title" content="NHS Wait Intelligence" />
        <meta property="og:description" content="Open analytics platform for NHS waiting list equity research. Real-time data, AI insights, regional inequality scoring." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="NHS Wait Intelligence" />
        <meta name="twitter:description" content="Open analytics platform for NHS waiting list equity research." />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
