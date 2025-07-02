import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ReviewWithDetails } from "@shared/schema";

interface ReviewCardProps {
  review: ReviewWithDetails;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    if (review.isAnonymous) return '匿';
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'U';
  };

  const getDisplayName = () => {
    if (review.isAnonymous) return '匿名用户';
    return `${review.client.firstName || ''} ${review.client.lastName || ''}`.trim() || '用户';
  };

  return (
    <div className="border-b border-neutral-200 pb-6 last:border-b-0">
      <div className="flex items-start space-x-4">
        <Avatar className="h-10 w-10">
          <AvatarImage 
            src={!review.isAnonymous ? review.client.profileImageUrl || undefined : undefined} 
          />
          <AvatarFallback>
            {getInitials(review.client.firstName, review.client.lastName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-medium text-neutral-900">{getDisplayName()}</div>
              <div className="text-sm text-neutral-600">
                {formatDistanceToNow(new Date(review.createdAt), { 
                  addSuffix: true, 
                  locale: zhCN 
                })}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4 w-4 ${
                      star <= review.rating 
                        ? 'fill-current' 
                        : 'stroke-current fill-transparent'
                    }`} 
                  />
                ))}
              </div>
            </div>
          </div>
          
          {review.comment && (
            <p className="text-neutral-700 mb-3 leading-relaxed">
              {review.comment}
            </p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-neutral-500">
            <button className="flex items-center space-x-1 hover:text-primary transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span>有帮助</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
