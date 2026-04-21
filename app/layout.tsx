import './globals.css'
export const metadata = { title: 'UMANG Stock System' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  )
}
