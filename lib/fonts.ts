import localFont from 'next/font/local'
import { Inter, Space_Grotesk } from 'next/font/google'

export const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-space-grotesk',
})

export const coolvetica = localFont({
  src: [
    {
      path: '../public/fonts/Coolvetica-Rg.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Coolvetica-Rg.woff2',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../public/fonts/Coolvetica-Rg.woff2',
      weight: '800',
      style: 'normal',
    },
  ],
  variable: '--font-coolvetica',
  display: 'swap',
})
