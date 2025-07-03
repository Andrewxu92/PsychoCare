import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Calendar, Shield, Users, Star } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-neutral-800">心理咨询平台</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost">
                  登录
                </Button>
              </Link>
              <Link href="/login">
                <Button>
                  注册
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeInUp">
              <h1 className="hero-title text-4xl lg:text-5xl font-bold text-neutral-900 mb-6">
                专业心理咨询<br />
                <span className="text-primary">关爱您的心理健康</span>
              </h1>
              <p className="hero-subtitle text-xl text-neutral-600 mb-8">
                连接您与专业心理咨询师，提供安全、私密、专业的心理健康服务。支持在线预约，灵活选择时间。
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/login">
                  <Button size="lg">
                    立即预约咨询
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    浏览咨询师
                  </Button>
                </Link>
              </div>
              <div className="flex items-center space-x-8 mt-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">500+</div>
                  <div className="text-sm text-neutral-600">专业咨询师</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">10,000+</div>
                  <div className="text-sm text-neutral-600">成功咨询</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">4.9</div>
                  <div className="text-sm text-neutral-600">用户评分</div>
                </div>
              </div>
            </div>
            <div className="relative animate-fadeInUp">
              <Card className="p-8 gradient-card shadow-2xl">
                <div className="text-center">
                  <Heart className="h-16 w-16 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-neutral-900 mb-4">开始您的心理健康之旅</h3>
                  <p className="text-neutral-600 mb-6">
                    与专业心理咨询师建立联系，获得个性化的心理健康支持
                  </p>
                  <Button className="w-full" onClick={() => window.location.href = "/api/login"}>
                    立即开始
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">为什么选择我们</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
              我们致力于为每一位用户提供最专业、最安全的心理健康服务
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="therapist-card p-6 text-center">
              <CardContent className="pt-6">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">专业认证</h3>
                <p className="text-neutral-600">
                  所有咨询师均持有专业资质认证，确保服务质量和专业水准
                </p>
              </CardContent>
            </Card>

            <Card className="therapist-card p-6 text-center">
              <CardContent className="pt-6">
                <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">灵活预约</h3>
                <p className="text-neutral-600">
                  24小时在线预约系统，支持多种咨询方式，满足不同需求
                </p>
              </CardContent>
            </Card>

            <Card className="therapist-card p-6 text-center">
              <CardContent className="pt-6">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-neutral-900 mb-3">隐私保护</h3>
                <p className="text-neutral-600">
                  严格的隐私保护制度，保障您的个人信息和咨询内容安全
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-100">专业咨询师</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10,000+</div>
              <div className="text-blue-100">成功咨询</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9</div>
              <div className="text-blue-100">平均评分</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-blue-100">满意度</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-neutral-900 mb-4">用户评价</h2>
            <p className="text-lg text-neutral-600">听听我们用户的真实反馈</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-neutral-700 mb-4">
                    "专业的心理咨询服务让我重新找到了生活的方向，非常感谢平台提供的优质服务。"
                  </p>
                  <div className="text-sm text-neutral-600">— 匿名用户</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">开始您的心理健康之旅</h2>
          <p className="text-xl text-blue-100 mb-8">
            立即注册，与专业心理咨询师建立联系
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => window.location.href = "/api/login"}
          >
            立即注册
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">心理咨询平台</span>
              </div>
              <p className="text-neutral-400 mb-6 max-w-md">
                专业的心理健康服务平台，连接您与资深心理咨询师，提供安全、私密、专业的心理咨询服务。
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">服务</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>在线咨询</li>
                <li>面对面咨询</li>
                <li>心理评估</li>
                <li>企业服务</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">支持</h3>
              <ul className="space-y-2 text-neutral-400">
                <li>帮助中心</li>
                <li>常见问题</li>
                <li>联系我们</li>
                <li>意见反馈</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-neutral-700 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-neutral-400 text-sm">
                © 2024 心理咨询平台. 保留所有权利.
              </div>
              <div className="flex space-x-6 text-neutral-400 text-sm mt-4 md:mt-0">
                <span>隐私政策</span>
                <span>服务条款</span>
                <span>Cookie政策</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
