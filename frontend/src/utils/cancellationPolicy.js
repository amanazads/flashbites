export const CANCELLATION_POLICY = {
  // Time-based cancellation rules
  RULES: {
    PENDING: {
      canCancel: true,
      fee: 0,
      message: 'Free cancellation available for pending orders'
    },
    CONFIRMED: {
      canCancel: true,
      fee: 0,
      timeLimit: 60, // seconds after confirmation
      message: 'Free cancellation within 60 seconds of confirmation'
    },
    PREPARING: {
      canCancel: false,
      fee: 100, // percentage
      message: 'Order is being prepared and cannot be cancelled. Contact restaurant for assistance.'
    },
    READY: {
      canCancel: false,
      fee: 100,
      message: 'Order is ready for pickup and cannot be cancelled.'
    },
    OUT_FOR_DELIVERY: {
      canCancel: false,
      fee: 100,
      message: 'Order is out for delivery and cannot be cancelled.'
    }
  },

  // Reasons for cancellation
  CANCELLATION_REASONS: [
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'ordered_by_mistake', label: 'Ordered by mistake' },
    { value: 'delivery_time_too_long', label: 'Delivery time is too long' },
    { value: 'found_better_price', label: 'Found better price elsewhere' },
    { value: 'address_not_serviceable', label: 'Address not serviceable' },
    { value: 'want_to_change_order', label: 'Want to modify order items' },
    { value: 'payment_issue', label: 'Payment issue' },
    { value: 'other', label: 'Other reason' }
  ],

  // Helper function to check if order can be cancelled
  canCancelOrder: (order) => {
    const status = order.status.toUpperCase();
    const rule = CANCELLATION_POLICY.RULES[status];
    
    if (!rule) return { canCancel: false, reason: 'Invalid order status' };
    
    // Check basic cancellation eligibility
    if (!rule.canCancel) {
      return { 
        canCancel: false, 
        reason: rule.message,
        fee: rule.fee 
      };
    }

    // For confirmed orders, check time limit
    if (status === 'CONFIRMED' && rule.timeLimit) {
      const confirmedAt = order.confirmedAt || order.updatedAt;
      const timeSinceConfirmation = (Date.now() - new Date(confirmedAt).getTime()) / 1000;
      
      if (timeSinceConfirmation > rule.timeLimit) {
        return {
          canCancel: false,
          reason: `Cancellation window expired. You can only cancel within ${rule.timeLimit} seconds of confirmation.`,
          fee: 100
        };
      }
    }

    return {
      canCancel: true,
      reason: rule.message,
      fee: rule.fee
    };
  },

  // Calculate cancellation fee
  calculateCancellationFee: (order) => {
    const status = order.status.toUpperCase();
    const rule = CANCELLATION_POLICY.RULES[status];
    
    if (!rule || rule.fee === 0) return 0;
    
    // Calculate fee based on order total
    const feeAmount = (order.total * rule.fee) / 100;
    return Math.min(feeAmount, order.total); // Cap at order total
  }
};
