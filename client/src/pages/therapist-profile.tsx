import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import ReviewCard from "@/components/review-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, MapPin, Clock, Video, Users, GraduationCap, Award, Calendar } from "lucide-react";
import { Link } from "wouter";
import type { TherapistWithUser, ReviewWithDetails } from "@shared/schema";

export default function TherapistProfile() {
  const { id } = useParams();

  const { data: therapist, isLoading: therapistLoading } = useQuery<TherapistWithUser>({
    queryKey: [`/api/therapists/${id}`],
    enabled: !!id
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<ReviewWithDetails[]>({
    queryKey: [`/api/reviews`, { therapistId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/reviews?therapistId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
    enabled: !!id
  });

  if (therapistLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl p-8 mb-8">
              <div className="flex items-start space-x-6">
                <div className="w-32 h-32 bg-neutral-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-8 bg-neutral-200 rounded mb-4"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-4">咨询师未找到</h1>
            <p className="text-neutral-600 mb-6">请检查链接是否正确，或返回咨询师列表</p>
            <Link href="/therapists">
              <Button>返回咨询师列表</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'T';
  };

  const getConsultationMethodIcon = (method: string) => {
    switch (method) {
      case 'online':
        return <Video className="h-4 w-4" />;
      case 'in-person':
        return <Users className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getConsultationMethodText = (method: string) => {
    switch (method) {
      case 'online':
        return '在线视频咨询';
      case 'in-person':
        return '面对面咨询';
      default:
        return method;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8">
              <Avatar className="h-32 w-32 mx-auto lg:mx-0">
                <AvatarImage src={therapist.user.profileImageUrl || undefined} />
                <AvatarFallback className="text-2xl font-semibold">
                  {getInitials(therapist.user.firstName, therapist.user.lastName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center lg:text-left">
                <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                  {therapist.user.firstName} {therapist.user.lastName}
                </h1>
                <p className="text-xl text-neutral-600 mb-4">{therapist.title}</p>
                
                <div className="flex items-center justify-center lg:justify-start space-x-1 mb-4">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`h-5 w-5 ${
                          star <= Math.floor(Number(therapist.rating)) 
                            ? 'fill-current' 
                            : 'stroke-current fill-transparent'
                        }`} 
                      />
                    ))}
                  </div>
                  <span className="text-lg font-medium text-neutral-800 ml-2">
                    {Number(therapist.rating).toFixed(1)}
                  </span>
                  <span className="text-neutral-600">
                    ({therapist.totalReviews} 评价)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-6">
                  {therapist.specialties?.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href={`/booking/${therapist.id}`}>
                    <Button size="lg" className="w-full sm:w-auto">
                      <Calendar className="mr-2 h-5 w-5" />
                      立即预约咨询
                    </Button>
                  </Link>
                  <div className="text-center sm:text-left">
                    <div className="text-2xl font-bold text-primary">
                      HK${Number(therapist.hourlyRate).toFixed(0)}
                    </div>
                    <div className="text-sm text-neutral-600">每次咨询</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>关于我</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-neutral-700 leading-relaxed">
                  {therapist.description || 
                    '我是一名经验丰富的心理咨询师，致力于为客户提供专业、温暖的心理健康服务。我相信每个人都有内在的力量去面对生活中的挑战，我的工作就是帮助您发现和利用这些力量。'
                  }
                </p>
              </CardContent>
            </Card>

            {/* Education & Certifications */}
            {(therapist.education || therapist.certifications) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="h-5 w-5" />
                    <span>教育背景与资质</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {therapist.education && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-2">教育背景</h4>
                      <p className="text-neutral-700">{therapist.education}</p>
                    </div>
                  )}
                  
                  {therapist.certifications && therapist.certifications.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-neutral-900 mb-2">专业认证</h4>
                      <ul className="space-y-1">
                        {therapist.certifications.map((cert, index) => (
                          <li key={index} className="flex items-center space-x-2 text-neutral-700">
                            <Award className="h-4 w-4 text-primary" />
                            <span>{cert}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>用户评价</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="flex items-start space-x-4">
                          <div className="w-10 h-10 bg-neutral-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                            <div className="h-3 bg-neutral-200 rounded w-3/4"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-neutral-600 text-center py-8">暂无评价</p>
                ) : (
                  <div className="space-y-6">
                    {reviews.slice(0, 5).map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle>咨询信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {therapist.experience && (
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-neutral-500" />
                    <div>
                      <div className="font-medium text-neutral-900">执业经验</div>
                      <div className="text-sm text-neutral-600">{therapist.experience} 年</div>
                    </div>
                  </div>
                )}

                <Separator />

                <div>
                  <div className="font-medium text-neutral-900 mb-2">咨询方式</div>
                  <div className="space-y-2">
                    {therapist.consultationMethods?.map((method, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-neutral-700">
                        {getConsultationMethodIcon(method)}
                        <span>{getConsultationMethodText(method)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="font-medium text-neutral-900 mb-2">收费标准</div>
                  <div className="text-2xl font-bold text-primary">
                    ¥{Number(therapist.hourlyRate).toFixed(0)}
                    <span className="text-sm font-normal text-neutral-600"> / 次</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Specialties */}
            <Card>
              <CardHeader>
                <CardTitle>专业领域</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {therapist.specialties?.map((specialty, index) => (
                    <Badge key={index} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-gradient-to-r from-primary to-blue-700 text-white">
              <CardContent className="p-6 text-center">
                <h3 className="font-semibold text-lg mb-2">准备开始咨询？</h3>
                <p className="text-blue-100 text-sm mb-4">
                  选择合适的时间，开始您的心理健康之旅
                </p>
                <Link href={`/booking/${therapist.id}`}>
                  <Button variant="secondary" className="w-full">
                    预约咨询
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
