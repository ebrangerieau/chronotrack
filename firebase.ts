import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

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

export const analytics: Promise<AnalyticsInstance> = isSupported()
  .then((supported) => (supported ? getAnalytics(firebaseApp) : undefined))
  .catch(() => undefined);
