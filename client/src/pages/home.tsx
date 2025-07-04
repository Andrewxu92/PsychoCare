import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, Users, Star, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { TherapistWithUser } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Check if user is a therapist
  const { data: therapists } = useQuery<TherapistWithUser[]>({
    queryKey: ['/api/therapists'],
    queryFn: async () => {
      const response = await fetch('/api/therapists');
      if (!response.ok) throw new Error('Failed to fetch therapists');
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Redirect therapist to therapist dashboard
  useEffect(() => {
    if (user && therapists) {
      const isTherapist = therapists.some((t: TherapistWithUser) => t.userId === user.id);
      if (isTherapist) {
        navigate('/therapist-dashboard');
      }
    }
  }, [user, therapists, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
              欢迎回来，{user?.firstName || user?.email}
            </h1>
            <p className="text-xl text-neutral-600 mb-8">
              继续您的心理健康之旅，寻找适合的专业咨询师
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link href="/therapists">
                <Button size="lg">
                  浏览咨询师
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg">
                  我的预约
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="text-center">
              <CardContent className="pt-6">
                <Heart className="h-10 w-10 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-neutral-600">专业咨询师</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Calendar className="h-10 w-10 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-secondary">即时</div>
                <div className="text-sm text-neutral-600">在线预约</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Users className="h-10 w-10 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold text-accent">10K+</div>
                <div className="text-sm text-neutral-600">成功咨询</div>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <Star className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">4.9</div>
                <div className="text-sm text-neutral-600">平均评分</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-neutral-900 mb-6">
                专业心理健康服务
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 mb-2">专业认证咨询师</h3>
                    <p className="text-neutral-600">所有咨询师均经过严格筛选，持有专业资质认证</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 mb-2">灵活预约时间</h3>
                    <p className="text-neutral-600">24小时在线预约，支持多种时间段选择</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-neutral-900 mb-2">隐私保护</h3>
                    <p className="text-neutral-600">严格的隐私保护制度，确保您的信息安全</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">抑郁焦虑</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">专业的情绪管理指导</p>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">亲密关系</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">夫妻关系和家庭治疗</p>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">职场压力</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">工作压力管理和职业发展</p>
                </CardContent>
              </Card>
              
              <Card className="p-6">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">青少年</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-600">青少年心理健康支持</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-primary to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">准备开始您的心理健康之旅了吗？</h2>
          <p className="text-xl text-blue-100 mb-8">
            浏览我们的专业咨询师，找到最适合您的心理健康支持
          </p>
          <Link href="/therapists">
            <Button size="lg" variant="secondary">
              立即开始
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
