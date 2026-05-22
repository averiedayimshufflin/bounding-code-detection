import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Plan Code Scanner — OCR Bounding Boxes',
  description:
    'Upload a plan PDF and automatically detect your typed target codes with OCR bounding boxes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
