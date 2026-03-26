'use client';

import React, { useEffect, useState } from 'react';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { initializeFirebase } from './index';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export const FirebaseClientProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [instance, setInstance] = useState<{
    firebaseApp: FirebaseApp;
    firestore: Firestore;
    auth: Auth;
  } | null>(null);

  useEffect(() => {
    setInstance(initializeFirebase());
  }, []);

  if (!instance) return null;

  return (
    <FirebaseProvider
      firebaseApp={instance.firebaseApp}
      firestore={instance.firestore}
      auth={instance.auth}
    >
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
};
