import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Star, Award } from "lucide-react";
import type { AppointmentWithDetails, TherapistWithUser } from "@shared/schema";

export default function TherapistDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Get therapist profile
  const { data: therapist, isLoading: therapistLoading } = useQuery<TherapistWithUser>({
    queryKey: ['/api/therapists', 'current'],
    queryFn: async () => {
      const response = await fetch('/api/therapists');
      const therapists = await response.json();
      return therapists.find((t: TherapistWithUser) => t.userId === user?.id);
    },
    enabled: !!user?.id,
  });

  // Get appointments for therapist
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
    enabled: !!therapist?.id,
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "登录已过期",
          description: "正在重新登录...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  // Update appointment status mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest('PUT', `/api/appointments/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({
        title: "预约状态已更新",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "登录已过期",
          description: "正在重新登录...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "更新失败",
        description: "更新预约状态时出现错误。",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (appointmentId: number, newStatus: string) => {
    updateAppointmentMutation.mutate({ id: appointmentId, status: newStatus });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">待确认</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">已确认</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">已完成</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'C';
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (selectedStatus === 'all') return true;
    return appointment.status === selectedStatus;
  });

  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  if (authLoading || therapistLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl p-8 mb-8">
              <div className="h-8 bg-neutral-200 rounded mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center p-12">
              <h1 className="text-2xl font-bold mb-4">需要登录</h1>
              <p className="text-neutral-600 mb-6">请先登录后查看咨询师管理页面</p>
              <Button onClick={() => window.location.href = "/api/login"}>
                登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!therapist) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center p-12">
              <Award className="h-16 w-16 text-neutral-400 mx-auto mb-6" />
              <h1 className="text-2xl font-bold mb-4">咨询师资料未完善</h1>
              <p className="text-neutral-600 mb-6">
                您还没有完成咨询师注册，请先完成注册流程
              </p>
              <Button onClick={() => window.location.href = "/therapist-registration"}>
                立即注册
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            咨询师管理台
          </h1>
          <p className="text-lg text-neutral-600">
            欢迎回来，{therapist.user.firstName || '咨询师'}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">待确认预约</p>
                  <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">已确认预约</p>
                  <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">已完成咨询</p>
                  <p className="text-2xl font-bold text-blue-600">{completedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">平均评分</p>
                  <p className="text-2xl font-bold text-primary">
                    {therapist.rating ? Number(therapist.rating).toFixed(1) : '0.0'}
                  </p>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Therapist Profile Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>个人资料状态</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={therapist.user.profileImageUrl || undefined} 
                    alt={therapist.user.firstName || '咨询师'} 
                  />
                  <AvatarFallback>
                    {getInitials(therapist.user.firstName, therapist.user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {therapist.user.firstName} {therapist.user.lastName}
                  </h3>
                  <p className="text-neutral-600">{therapist.title}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    {therapist.isVerified ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        已认证
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        待认证
                      </Badge>
                    )}
                    <Badge variant="outline">
                      ¥{therapist.hourlyRate}/小时
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline">
                编辑资料
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appointments Management */}
        <Card>
          <CardHeader>
            <CardTitle>预约管理</CardTitle>
            <CardDescription>
              管理您的客户预约，确认或取消预约请求
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="pending">待确认</TabsTrigger>
                <TabsTrigger value="confirmed">已确认</TabsTrigger>
                <TabsTrigger value="completed">已完成</TabsTrigger>
                <TabsTrigger value="cancelled">已取消</TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus} className="mt-6">
                {appointmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="bg-neutral-100 rounded-lg h-24"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      暂无相关预约
                    </h3>
                    <p className="text-neutral-600">
                      {selectedStatus === 'all' ? '您目前没有任何预约' : `没有${selectedStatus === 'pending' ? '待确认' : selectedStatus === 'confirmed' ? '已确认' : selectedStatus === 'completed' ? '已完成' : '已取消'}的预约`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAppointments.map((appointment) => (
                      <Card key={appointment.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarImage 
                                src={appointment.client.profileImageUrl || undefined}
                                alt={appointment.client.firstName || '客户'}
                              />
                              <AvatarFallback>
                                {getInitials(appointment.client.firstName, appointment.client.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="font-semibold">
                                {appointment.client.firstName} {appointment.client.lastName}
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-neutral-600 mt-1">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {format(new Date(appointment.appointmentDate), 'PPP', { locale: zhCN })}
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {format(new Date(appointment.appointmentDate), 'HH:mm')}
                                </div>
                                <Badge variant="outline">
                                  {appointment.consultationType === 'online' ? '在线咨询' : '面对面咨询'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {getStatusBadge(appointment.status)}
                            <div className="text-right">
                              <p className="font-semibold">¥{appointment.price}</p>
                              <p className="text-sm text-neutral-600">{appointment.duration}分钟</p>
                            </div>
                            
                            {appointment.status === 'pending' && (
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                  disabled={updateAppointmentMutation.isPending}
                                >
                                  确认
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                  disabled={updateAppointmentMutation.isPending}
                                >
                                  取消
                                </Button>
                              </div>
                            )}
                            
                            {appointment.status === 'confirmed' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                disabled={updateAppointmentMutation.isPending}
                              >
                                标记完成
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {appointment.clientNotes && (
                          <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                            <h5 className="text-sm font-medium text-neutral-700 mb-1">客户备注：</h5>
                            <p className="text-sm text-neutral-600">{appointment.clientNotes}</p>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}