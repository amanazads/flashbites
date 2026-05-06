const isCoreLocationUnknownError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === 2 || message.includes('kclocationunknown') || message.includes('kclerrorlocationunknown');
};

const isTransientLocationError = (error) => {
  if (!error) return false;
  if (isCoreLocationUnknownError(error)) return true;

  const message = String(error?.message || '').toLowerCase();
  return error?.code === 3 || message.includes('timeout');
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getCurrentPositionWithRetries = async (
  options = {},
  {
    retries = 2,
    retryDelayMs = 600,
    fallbackOptions = null,
  } = {}
) => {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported');
  }

  const getPosition = (positionOptions) =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, positionOptions);
    });

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await getPosition(options);
    } catch (error) {
      lastError = error;

      if (!isTransientLocationError(error) || attempt === retries) {
        break;
      }

      await wait(retryDelayMs + attempt * 300);
      attempt += 1;
    }
  }

  if (fallbackOptions) {
    return getPosition(fallbackOptions);
  }

  throw lastError;
};

export { isCoreLocationUnknownError };
export { isTransientLocationError };
