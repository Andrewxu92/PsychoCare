import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, Clock, MapPin, User, Phone, Mail } from 'lucide-react';
import Navigation from '@/components/navigation';
import { getQueryFn } from '@/lib/queryClient';
import { AppointmentWithDetails } from '@shared/schema';

export default function BookingSuccess() {
  const { appointmentId } = useParams();
  const [, setLocation] = useLocation();

  const { data: appointment, isLoading } = useQuery<AppointmentWithDetails>({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: getQueryFn({ on401: 'throw' }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-neutral-600">正在加载预约信息...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-neutral-600">未找到预约信息</p>
              <Button onClick={() => setLocation('/')} className="mt-4">
                返回首页
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Success Header */}
        <Card className="mb-8 border-green-200 bg-green-50">
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-800 mb-2">预约成功！</h1>
              <p className="text-green-700">
                您的心理咨询预约已成功确认，我们会通过邮件发送详细信息给您。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Appointment Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>预约信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-neutral-500" />
                <div>
                  <p className="font-medium">预约日期</p>
                  <p className="text-sm text-neutral-600">
                    {formatDate(appointment.appointmentDate)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-neutral-500" />
                <div>
                  <p className="font-medium">预约时间</p>
                  <p className="text-sm text-neutral-600">
                    {formatTime(appointment.appointmentDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-neutral-500" />
                <div>
                  <p className="font-medium">咨询方式</p>
                  <Badge variant={appointment.consultationType === 'online' ? 'default' : 'secondary'}>
                    {appointment.consultationType === 'online' ? '在线咨询' : '面对面咨询'}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold text-primary">¥{(appointment.price / 100).toFixed(2)}</span>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  已支付
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Therapist Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>咨询师信息</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <img
                  src={appointment.therapist.user.profileImageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face'}
                  alt={appointment.therapist.user.firstName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">
                    {appointment.therapist.user.firstName} {appointment.therapist.user.lastName}
                  </p>
                  <p className="text-sm text-neutral-600">{appointment.therapist.title}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-neutral-600">
                  <strong>专业领域：</strong>{appointment.therapist.specialty}
                </p>
                <p className="text-sm text-neutral-600">
                  <strong>从业经验：</strong>{appointment.therapist.experience}年
                </p>
              </div>

              {appointment.therapist.user.email && (
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  <Mail className="h-4 w-4" />
                  <span>{appointment.therapist.user.email}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Client Notes */}
        {appointment.clientNotes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>您的备注</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-neutral-700">{appointment.clientNotes}</p>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>接下来的步骤</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center mt-1">1</div>
              <div>
                <p className="font-medium">准备咨询</p>
                <p className="text-sm text-neutral-600">
                  建议您提前准备想要讨论的问题，这有助于提高咨询效果。
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center mt-1">2</div>
              <div>
                <p className="font-medium">等待确认</p>
                <p className="text-sm text-neutral-600">
                  咨询师会在24小时内确认您的预约，并发送详细的咨询信息。
                </p>
              </div>
            </div>

            {appointment.consultationType === 'online' && (
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center mt-1">3</div>
                <div>
                  <p className="font-medium">在线咨询准备</p>
                  <p className="text-sm text-neutral-600">
                    请确保您有稳定的网络连接和安静的环境进行在线咨询。
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={() => setLocation('/dashboard')} variant="default">
            查看我的预约
          </Button>
          <Button onClick={() => setLocation('/therapists')} variant="outline">
            预约其他咨询师
          </Button>
          <Button onClick={() => setLocation('/')} variant="outline">
            返回首页
          </Button>
        </div>
      </div>
    </div>
  );
}