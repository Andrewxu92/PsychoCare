import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Clock, Video, Users } from "lucide-react";
import { Link } from "wouter";
import type { TherapistWithUser } from "@shared/schema";

interface TherapistCardProps {
  therapist: TherapistWithUser;
}

export default function TherapistCard({ therapist }: TherapistCardProps) {
  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'T';
  };

  const getConsultationMethodIcon = (method: string) => {
    switch (method) {
      case 'online':
        return <Video className="h-3 w-3" />;
      case 'in-person':
        return <Users className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getConsultationMethodText = (method: string) => {
    switch (method) {
      case 'online':
        return '在线咨询';
      case 'in-person':
        return '面对面';
      default:
        return method;
    }
  };

  return (
    <Card className="therapist-card hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={therapist.user.profileImageUrl || undefined} />
            <AvatarFallback className="text-lg font-semibold">
              {getInitials(therapist.user.firstName, therapist.user.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-neutral-900 truncate">
              {therapist.user.firstName} {therapist.user.lastName}
            </h3>
            <p className="text-neutral-600 text-sm mb-1">{therapist.title}</p>
            <div className="flex items-center space-x-1">
              <div className="flex text-yellow-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={`h-4 w-4 ${
                      star <= Math.floor(Number(therapist.rating)) 
                        ? 'fill-current' 
                        : 'stroke-current fill-transparent'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-sm text-neutral-600">
                {Number(therapist.rating).toFixed(1)} ({therapist.totalReviews}评价)
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-neutral-700 mb-3 line-clamp-3">
            {therapist.description || '专业心理咨询师，致力于为客户提供专业的心理健康服务。'}
          </p>
          
          {/* Specialties */}
          <div className="flex flex-wrap gap-1 mb-3">
            {therapist.specialties?.slice(0, 3).map((specialty, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
            {therapist.specialties && therapist.specialties.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{therapist.specialties.length - 3}
              </Badge>
            )}
          </div>

          {/* Consultation Methods */}
          <div className="flex flex-wrap gap-2 mb-3">
            {therapist.consultationMethods?.map((method, index) => (
              <div key={index} className="flex items-center space-x-1 text-xs text-neutral-600 bg-neutral-100 px-2 py-1 rounded">
                {getConsultationMethodIcon(method)}
                <span>{getConsultationMethodText(method)}</span>
              </div>
            ))}
          </div>

          {/* Experience */}
          {therapist.experience && (
            <div className="flex items-center space-x-1 text-xs text-neutral-600 mb-2">
              <Clock className="h-3 w-3" />
              <span>{therapist.experience}年经验</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
          <div>
            <span className="text-lg font-semibold text-primary">
              HK${Number(therapist.hourlyRate).toFixed(0)}
            </span>
            <span className="text-sm text-neutral-600">/次</span>
          </div>
          <div className="flex space-x-2">
            <Link href={`/therapists/${therapist.id}`}>
              <Button variant="outline" size="sm">
                查看详情
              </Button>
            </Link>
            <Link href={`/booking/${therapist.id}`}>
              <Button size="sm">
                立即预约
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
