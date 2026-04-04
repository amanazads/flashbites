const toValidDate = (value) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizeSingleFeeControl = (control = {}) => ({
  enabled: control?.enabled !== false,
  effectiveFrom: toValidDate(control?.effectiveFrom),
});

const normalizeRestaurantSingleFeeControl = (control = {}) => ({
  useGlobal: control?.useGlobal !== false,
  enabled: control?.enabled !== false,
  effectiveFrom: toValidDate(control?.effectiveFrom),
});

const normalizeFeeControls = (controls = {}) => ({
  deliveryFee: normalizeSingleFeeControl(controls?.deliveryFee),
  platformFee: normalizeSingleFeeControl(controls?.platformFee),
  tax: normalizeSingleFeeControl(controls?.tax),
});

const normalizeRestaurantFeeControls = (controls = {}) => ({
  deliveryFee: normalizeRestaurantSingleFeeControl(controls?.deliveryFee),
  platformFee: normalizeRestaurantSingleFeeControl(controls?.platformFee),
  tax: normalizeRestaurantSingleFeeControl(controls?.tax),
});

const resolveEffectiveFeeControls = (globalControls = {}, restaurantControls = {}) => {
  const normalizedGlobal = normalizeFeeControls(globalControls);
  const normalizedRestaurant = normalizeRestaurantFeeControls(restaurantControls);

  return {
    deliveryFee: normalizedRestaurant.deliveryFee.useGlobal
      ? normalizedGlobal.deliveryFee
      : {
          enabled: normalizedRestaurant.deliveryFee.enabled,
          effectiveFrom: normalizedRestaurant.deliveryFee.effectiveFrom,
        },
    platformFee: normalizedRestaurant.platformFee.useGlobal
      ? normalizedGlobal.platformFee
      : {
          enabled: normalizedRestaurant.platformFee.enabled,
          effectiveFrom: normalizedRestaurant.platformFee.effectiveFrom,
        },
    tax: normalizedRestaurant.tax.useGlobal
      ? normalizedGlobal.tax
      : {
          enabled: normalizedRestaurant.tax.enabled,
          effectiveFrom: normalizedRestaurant.tax.effectiveFrom,
        },
  };
};

const isFeeEnabledAt = (control, at = new Date()) => {
  const normalized = normalizeSingleFeeControl(control);
  if (!normalized.enabled) return false;
  if (!normalized.effectiveFrom) return true;
  return normalized.effectiveFrom.getTime() <= at.getTime();
};

module.exports = {
  normalizeFeeControls,
  normalizeRestaurantFeeControls,
  resolveEffectiveFeeControls,
  isFeeEnabledAt,
};
