"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { IBM_Plex_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){try{var t=localStorage.getItem('theme');
          if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))
          document.documentElement.classList.add('dark')}catch(e){}})()
        ` }} />
      </head>
      <body className={`${ibmPlexSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-right" />
          <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
      </body>
    </html>
  );
}