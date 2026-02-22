import React, { useState, useEffect } from 'react';
import { getRestaurantReviews } from '../../api/reviewApi';
import StarRating from '../common/StarRating';
import { formatDateTime } from '../../utils/formatters';
import { Loader } from '../common/Loader';

const ReviewsList = ({ restaurantId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [restaurantId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await getRestaurantReviews(restaurantId);
      setReviews(response.data.reviews || []);
      setStats(response.data.stats || null);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

      {/* Rating Summary */}
      {stats && (
        <div className="mb-8 pb-6 border-b">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold text-primary-500">{stats.averageRating.toFixed(1)}</div>
              <StarRating rating={stats.averageRating} readonly size="md" />
              <p className="text-sm text-gray-600 mt-1">{stats.totalReviews} reviews</p>
            </div>

            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star] || 0;
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 mb-2">
                    <span className="text-sm w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {review.userId?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold">{review.userId?.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(review.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} readonly size="sm" />
              </div>

              {review.comment && (
                <p className="text-gray-700 mt-3 ml-13">{review.comment}</p>
              )}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-3 ml-13">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Review ${index + 1}`}
                      className="w-20 h-20 rounded-lg object-cover cursor-pointer hover:opacity-75 transition"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewsList;
