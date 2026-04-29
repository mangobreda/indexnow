import './globals.css';

export const metadata = {
  title: 'IndexNow Submitter',
  description: 'Upload CSV-bestanden of plak URLs en verstuur ze naar IndexNow via een Vercel proxy.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
