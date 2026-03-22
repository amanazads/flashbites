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
    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 max-[300px]:p-3">
      <h2 className="text-2xl font-bold mb-6 max-[300px]:text-lg max-[300px]:mb-4">Customer Reviews</h2>

      {/* Rating Summary */}
      {stats && (
        <div className="mb-8 pb-6 border-b max-[300px]:mb-6 max-[300px]:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 max-[300px]:gap-4">
            <div className="text-center">
              <div className="text-5xl max-[300px]:text-4xl font-bold text-primary-500">{stats.averageRating.toFixed(1)}</div>
              <StarRating rating={stats.averageRating} readonly size="md" />
              <p className="text-sm max-[300px]:text-xs text-gray-600 mt-1">{stats.totalReviews} reviews</p>
            </div>

            <div className="flex-1 w-full">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star] || 0;
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 mb-2">
                    <span className="text-sm max-[300px]:text-xs w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm max-[300px]:text-xs text-gray-600 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 max-[300px]:py-10">
          <p className="text-gray-500 max-[300px]:text-sm">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-6 max-[300px]:space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="border-b pb-6 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 max-[300px]:w-8 max-[300px]:h-8 bg-primary-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {review.userId?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold">{review.userId?.name || 'Anonymous'}</p>
                      <p className="text-xs max-[300px]:text-[11px] text-gray-500">{formatDateTime(review.createdAt)}</p>
                    </div>
                  </div>
                </div>
                <StarRating rating={review.rating} readonly size="sm" />
              </div>

              {review.comment && (
                <p className="text-gray-700 mt-3 sm:ml-13 max-[300px]:text-sm">{review.comment}</p>
              )}

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mt-3 sm:ml-13 overflow-x-auto">
                  {review.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Review ${index + 1}`}
                      className="w-20 h-20 max-[300px]:w-16 max-[300px]:h-16 rounded-lg object-cover cursor-pointer hover:opacity-75 transition flex-shrink-0"
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
