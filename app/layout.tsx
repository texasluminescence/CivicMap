import "./globals.css";

export const metadata = {
  title: "CivicMap",
  description: "Explore civic events in your city",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 font-sans">{children}</body>
    </html>
  );
}