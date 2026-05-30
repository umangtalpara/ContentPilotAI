import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'ContentPilot AI - Plan. Create. Schedule. Publish.',
  description: 'AI-powered Social Media Content Planning and Publishing Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased font-sans select-none">
        <AuthProvider>
          <div className="flex-1 flex flex-col relative min-h-screen">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-[0.4] pointer-events-none z-0" />
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-radial-glow opacity-[0.6] pointer-events-none z-0" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-radial-glow opacity-[0.6] pointer-events-none z-0" />
            
            {/* Main Application Container */}
            <div className="flex-1 flex flex-col z-10 relative">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
