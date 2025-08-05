import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Navigation from "@/components/navigation";
import PaymentForm from "@/components/payment-form-simple";
import PaymentStatusMonitor from "@/components/payment-status-monitor";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Video, Users, ArrowLeft, AlertCircle } from "lucide-react";
import type { AppointmentWithDetails } from "@shared/schema";

/**
 * 支付完成页面
 * 用于处理未完成支付的预约，允许用户重新支付
 */
export default function Payment() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // 从URL参数获取预约ID
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const appointmentId = urlParams.get('appointmentId');
  
  // 组件状态
  const [paymentIntentId, setPaymentIntentId] = useState<string>(''); // Airwallex支付意图ID
  const [isProcessing, setIsProcessing] = useState(false); // 是否正在处理支付

  // 获取预约详情
  const { data: appointment, isLoading: appointmentLoading } = useQuery<AppointmentWithDetails>({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      if (!appointmentId) throw new Error('No appointment ID provided');
      const response = await fetch(`/api/appointments/${appointmentId}`);
      if (!response.ok) throw new Error('Failed to fetch appointment');
      return response.json();
    },
    enabled: !!appointmentId && isAuthenticated,
  });

  // 重定向未登录用户
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "请先登录",
        description: "您需要登录后才能完成支付。",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
  }, [authLoading, isAuthenticated, toast]);

  // 验证预约权限
  useEffect(() => {
    if (appointment && user && appointment.clientId !== user.id) {
      toast({
        title: "无权限",
        description: "您无权访问此预约。",
        variant: "destructive",
      });
      setLocation('/dashboard');
    }
  }, [appointment, user, setLocation, toast]);

  // 辅助函数：获取用户姓名首字母
  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'T';
  };

  if (authLoading || appointmentLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-1/4"></div>
            <div className="h-64 bg-neutral-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointmentId || !appointment) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">预约不存在</h3>
              <p className="text-neutral-600 mb-4">请检查预约信息或联系客服。</p>
              <Button onClick={() => setLocation('/dashboard')}>
                返回个人中心
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (appointment.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">预约已支付</h3>
              <p className="text-neutral-600 mb-4">此预约已完成支付，无需重复支付。</p>
              <Button onClick={() => setLocation('/dashboard')}>
                返回个人中心
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回个人中心
          </Button>
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            完成支付
          </h1>
          <p className="text-lg text-neutral-600">
            请完成预约支付以确认您的咨询预约
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：预约详情 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>预约详情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 咨询师信息 */}
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={appointment.therapist.user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-lg">
                      {getInitials(appointment.therapist.user.firstName, appointment.therapist.user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-xl font-semibold text-neutral-900">
                      {appointment.therapist.user.firstName} {appointment.therapist.user.lastName}
                    </div>
                    <div className="text-neutral-600">{appointment.therapist.title}</div>
                    <div className="flex items-center text-sm text-neutral-500 mt-1">
                      <span>{appointment.therapist.specialties?.join(', ')}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 预约时间 */}
                <div className="space-y-3">
                  <div className="flex items-center text-neutral-700">
                    <Calendar className="mr-3 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">
                        {new Date(appointment.appointmentDate).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-neutral-700">
                    <Clock className="mr-3 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">
                        {new Date(appointment.appointmentDate).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-neutral-700">
                    {appointment.consultationType === 'online' ? (
                      <Video className="mr-3 h-5 w-5 text-primary" />
                    ) : (
                      <Users className="mr-3 h-5 w-5 text-primary" />
                    )}
                    <div>
                      <div className="font-medium">
                        {appointment.consultationType === 'online' ? '在线咨询' : '面对面咨询'}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* 费用详情 */}
                <div className="space-y-2">
                  <div className="flex justify-between text-neutral-700">
                    <span>咨询费用</span>
                    <span>HK${Number(appointment.price).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold text-neutral-900 pt-2 border-t">
                    <span>总费用</span>
                    <span>HK${Number(appointment.price).toFixed(0)}</span>
                  </div>
                </div>

                {/* 预约状态 */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-neutral-700">当前状态</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                    待支付
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：支付表单 */}
          <div className="space-y-6">
            {paymentIntentId ? (
              <PaymentStatusMonitor 
                paymentIntentId={paymentIntentId}
                appointmentData={{
                  therapistId: appointment.therapistId,
                  appointmentDate: new Date(appointment.appointmentDate),
                  consultationType: appointment.consultationType,
                  clientNotes: appointment.clientNotes || '',
                  price: Number(appointment.price)
                }}
                isRetryPayment={true}
                existingAppointmentId={appointment.id}
                onSuccess={() => {
                  // 刷新预约列表缓存
                  queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
                  
                  toast({
                    title: "支付成功",
                    description: "您的预约已确认，咨询师将审核您的预约请求。",
                  });
                  setLocation('/dashboard');
                }}
              />
            ) : (
              <PaymentForm 
                amount={Number(appointment.price)}
                currency="HKD"
                onSuccess={(intentId) => {
                  setPaymentIntentId(intentId);
                  setIsProcessing(true);
                }}
                onError={(error) => {
                  toast({
                    title: "支付失败",
                    description: error,
                    variant: "destructive",
                  });
                  setIsProcessing(false);
                }}
                disabled={isProcessing}
                isRetryPayment={true}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}