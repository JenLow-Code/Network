import React from 'react';
import type { PropsWithChildren } from 'react';

// Root HTML for Expo Router web. The favicon is a transparent JenLow symbol.
export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </head>
      <body>{children}</body>
    </html>
  );
}
