'use client';

import { useEffect } from 'react';

const SERVICE_WORKER_URL = '/service-worker.js';

export function PWAServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!('serviceWorker' in navigator)) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[Mentora PWA] Service worker not supported in this browser.');
      }
      return;
    }

    const registerServiceWorker = async () => {
      if (
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost'
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.info('[Mentora PWA] Service worker skipped on insecure origin.');
        }
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register(
          SERVICE_WORKER_URL,
          { scope: '/' }
        );

        if (process.env.NODE_ENV === 'development') {
          console.info('[Mentora PWA] Service worker registered.', registration);
        }

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.info('[Mentora PWA] New content available; please refresh.');
              } else {
                console.info('[Mentora PWA] Content cached for offline use.');
              }
            }
          });
        });
      } catch (error) {
        console.error('[Mentora PWA] Service worker registration failed.', error);
      }
    };

    window.addEventListener('load', registerServiceWorker);

    return () => {
      window.removeEventListener('load', registerServiceWorker);
    };
  }, []);

  return null;
}
