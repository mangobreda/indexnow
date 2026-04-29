import './globals.css';

export const metadata = {
  title: 'IndexNow Submitter',
  description: 'Submit URLs to IndexNow via a secured Vercel proxy.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
