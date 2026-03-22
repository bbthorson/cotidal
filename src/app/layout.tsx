import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseAuthProvider } from "@/components/app/FirebaseAuthProvider";
import { AtprotoProvider } from "@/components/app/AtprotoProvider";
import { Playfair_Display, PT_Sans } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-playfair',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: 'The Crystal Coupe',
  description: 'Intuiting your desires, one drink at a time.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${playfair.variable} ${ptSans.variable}`}>
      <body className="font-body antialiased">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-6 focus:py-3 focus:bg-background focus:text-foreground focus:border focus:border-primary/20 focus:shadow-xl focus:rounded-md font-bold transition-all">
          Skip to content
        </a>
        <FirebaseAuthProvider>
          <AtprotoProvider>
            {children}
          </AtprotoProvider>
        </FirebaseAuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
