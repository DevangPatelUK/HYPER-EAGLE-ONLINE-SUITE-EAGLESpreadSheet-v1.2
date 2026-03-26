
'use client';

import { useEffect, useState } from 'react';
import { initializeFirebase, FirebaseClientProvider } from '@/firebase';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firebaseInstance, setFirebaseInstance] = useState<{
    firebaseApp: any;
    firestore: any;
    auth: any;
  } | null>(null);

  useEffect(() => {
    const instance = initializeFirebase();
    setFirebaseInstance(instance);
  }, []);

  if (!firebaseInstance) return null;

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <FirebaseClientProvider
          firebaseApp={firebaseInstance.firebaseApp}
          firestore={firebaseInstance.firestore}
          auth={firebaseInstance.auth}
        >
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
