import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LAWS Simulator — Stop Killer Robots Advocacy Tool',
  description:
    'An interactive simulation of Lethal Autonomous Weapons Systems (LAWS) targeting workflows, built to support disarmament advocacy by making visible the cold algorithmic reality of autonomous weapons. Campaign to Stop Killer Robots / UN Disarmament.',
  keywords: [
    'LAWS',
    'Lethal Autonomous Weapons',
    'Stop Killer Robots',
    'UN Disarmament',
    'Autonomous Weapons',
    'Disarmament Advocacy',
  ],
  openGraph: {
    title: 'LAWS Simulator — Disarmament Advocacy Tool',
    description: 'Interactive simulation of autonomous weapons targeting for disarmament advocacy.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-terminal-bg text-terminal-text antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
