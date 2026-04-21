import '../styles/globals.css'
import 'leaflet/dist/leaflet.css'
import type { AppProps } from 'next/app'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const isLandingPage = router.pathname === '/landing'

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={router.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Component {...pageProps} />
      </motion.div>
    </AnimatePresence>
  )

  return (
    <div data-theme="nhsdark">
      {isLandingPage ? content : <Layout>{content}</Layout>}
    </div>
  )
}
