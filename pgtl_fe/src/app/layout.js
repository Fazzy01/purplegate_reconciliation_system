import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TansStackProvider from "@/components/providers/TansStackProvider";
import { ToastContainer } from "react-toastify";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Reconcilation System App",
  description: "This Reconcilation System  app designed for purplegate ",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
            <TansStackProvider>
            <ToastContainer
                  position="top-left"
                  autoClose={3000}
                  newestOnTop={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="light"
                />

                {children}


            </TansStackProvider>
      </body>
    </html>
  );
}
