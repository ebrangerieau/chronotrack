import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

type AnalyticsInstance = ReturnType<typeof getAnalytics> | undefined;

const firebaseConfig = {
  apiKey: 'AIzaSyC78NuhV0pxYjyqJKwYZ9Wrr2LkuBm8n6g',
  authDomain: 'chronotrack-773e8.firebaseapp.com',
  projectId: 'chronotrack-773e8',
  storageBucket: 'chronotrack-773e8.firebasestorage.app',
  messagingSenderId: '1008324597599',
  appId: '1:1008324597599:web:f07c8f725d25b0d5ab88ea',
  measurementId: 'G-MPFXDM0L7C',
};

export const firebaseApp = initializeApp(firebaseConfig);

// Accessing the auth instance ensures the component is registered when Firebase
// initialises. Without this, Firebase may throw "Component auth has not been
// registered yet" when other parts of the app try to use authentication APIs.
export const auth = getAuth(firebaseApp);

export const analytics: Promise<AnalyticsInstance> = isSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : undefined))
  .catch(() => undefined);
