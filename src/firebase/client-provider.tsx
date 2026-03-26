
'use client';

import React from 'react';
import { FirebaseProvider } from './provider';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export const FirebaseClientProvider: React.FC<{
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  children: React.ReactNode;
}> = ({ firebaseApp, firestore, auth, children }) => {
  return (
    <FirebaseProvider firebaseApp={firebaseApp} firestore={firestore} auth={auth}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
};
