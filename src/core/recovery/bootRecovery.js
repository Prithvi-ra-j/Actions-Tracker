import { getAppMeta, setAppMeta } from '../../database/appMetaRepository.js';

export async function markBootStarted() {
  await setAppMeta('lastBootStartedAt', new Date().toISOString());
}

export async function markBootSucceeded({ restored = false, migrated = false } = {}) {
  await setAppMeta('lastSuccessfulBoot', {
    at: new Date().toISOString(),
    restored,
    migrated,
  });
  await setAppMeta('lastBootFailure', null);
}

export async function markBootFailed(error) {
  await setAppMeta('lastBootFailure', {
    at: new Date().toISOString(),
    message: String(error?.message || error || 'Unknown bootstrap error').slice(0, 500),
  });
}

export async function getBootRecoveryState() {
  return {
    lastBootStartedAt: await getAppMeta('lastBootStartedAt'),
    lastSuccessfulBoot: await getAppMeta('lastSuccessfulBoot'),
    lastBootFailure: await getAppMeta('lastBootFailure'),
  };
}
