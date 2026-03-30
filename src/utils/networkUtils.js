import { Alert } from 'react-native';

const CONNECTIVITY_TEST_URLS = [
  'https://clients3.google.com/generate_204',
  'https://www.google.com/generate_204',
];

const withTimeout = (promise, timeoutMs) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('network_check_timeout')), timeoutMs);
    }),
  ]);

export const checkInternetConnection = async (timeoutMs = 5000) => {
  for (const url of CONNECTIVITY_TEST_URLS) {
    try {
      const response = await withTimeout(
        fetch(`${url}?t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        }),
        timeoutMs
      );

      if (response && (response.ok || response.status === 204)) {
        return true;
      }
    } catch (error) {
      // Try the next connectivity URL.
    }
  }

  return false;
};

export const showInternetRequiredAlert = (featureName = 'This feature') => {
  Alert.alert(
    'Internet Required',
    `${featureName} requires an internet connection. Please turn on Wi‑Fi or mobile data and try again.`,
    [{ text: 'OK' }]
  );
};
