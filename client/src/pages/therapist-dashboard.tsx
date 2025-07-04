import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { Calendar, Clock, CheckCircle, XCircle, User, MessageSquare, Award, TrendingUp } from "lucide-react";
import type { AppointmentWithDetails, TherapistWithUser } from "@shared/schema";

export default function TherapistDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const [appointmentNotes, setAppointmentNotes] = useState("");

  // Get therapist profile
  const { data: therapist, isLoading: therapistLoading } = useQuery<TherapistWithUser>({
    queryKey: ['/api/therapists', 'current'],
    queryFn: async () => {
      const response = await fetch('/api/therapists');
      if (!response.ok) throw new Error('Failed to fetch therapists');
      const therapists = await response.json();
      return therapists.find((t: TherapistWithUser) => t.userId === user?.id);
    },
    enabled: !!user?.id,
  });

  // Get appointments for therapist
  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
    queryFn: async () => {
      const response = await fetch(`/api/appointments?therapistId=${therapist?.id}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
    enabled: !!therapist?.id,
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
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">待确认</Badge>;
      case 'confirmed':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100">已确认</Badge>;
      case 'completed':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">已完成</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100">已取消</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'C';
  };

  // Calculate statistics
  const pendingCount = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => a.status === 'pending').length;
  const todayAppointments = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => {
    const today = new Date();
    const appointmentDate = new Date(a.appointmentDate);
    return appointmentDate.toDateString() === today.toDateString();
  }).length;
  const completedCount = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => a.status === 'completed').length;

  if (authLoading || therapistLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !therapist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Card className="text-center p-8">
            <CardContent>
              <h1 className="text-xl font-semibold text-gray-900 mb-4">需要登录</h1>
              <p className="text-gray-600 mb-6">请先登录后查看咨询师管理页面</p>
              <Button onClick={() => window.location.href = "/api/login"}>
                登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header Section */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={therapist?.user?.profileImageUrl || ""} alt={therapist?.user?.firstName || ""} />
                <AvatarFallback className="bg-blue-500 text-white text-lg font-medium">
                  {getInitials(therapist?.user?.firstName || "", therapist?.user?.lastName || "")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {therapist?.user?.firstName} {therapist?.user?.lastName}
                </h1>
                <p className="text-gray-600 text-sm mt-1">{therapist?.specialties?.[0] || '心理咨询师'}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Award className="h-4 w-4" />
                    <span>{therapist?.experience} 年经验</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <TrendingUp className="h-4 w-4" />
                    <span>¥{therapist?.hourlyRate}/小时</span>
                  </div>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}</p>
                <p className="font-medium text-gray-900">{format(new Date(), 'HH:mm')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">待确认预约</p>
                  <p className="text-2xl font-semibold text-amber-600">{pendingCount}</p>
                </div>
                <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">今日预约</p>
                  <p className="text-2xl font-semibold text-blue-600">{todayAppointments}</p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">已完成咨询</p>
                  <p className="text-2xl font-semibold text-emerald-600">{completedCount}</p>
                </div>
                <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">预约管理</CardTitle>
            <CardDescription className="text-gray-600">
              管理您的预约请求和咨询安排
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            {appointmentsLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 border-b border-gray-100 last:border-b-0">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无预约</h3>
                <p className="text-gray-500">还没有收到任何预约请求</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(appointments as AppointmentWithDetails[]).map((appointment: AppointmentWithDetails) => (
                  <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={appointment.client?.profileImageUrl || ""} alt={appointment.client?.firstName || ""} />
                          <AvatarFallback className="bg-gray-100 text-gray-600">
                            {getInitials(appointment.client?.firstName || "", appointment.client?.lastName || "")}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-medium text-gray-900">
                              {appointment.client?.firstName} {appointment.client?.lastName}
                            </h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{format(new Date(appointment.appointmentDate), 'MM月dd日', { locale: zhCN })}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{format(new Date(appointment.appointmentDate), 'HH:mm')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{appointment.consultationType === 'online' ? '在线' : '面访'}</span>
                            </div>
                          </div>
                          
                          {appointment.clientNotes && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded px-3 py-2">
                              <MessageSquare className="h-4 w-4 inline mr-1" />
                              {appointment.clientNotes}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {appointment.status === 'pending' && (
                          <>
                            <Button 
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                              disabled={updateAppointmentMutation.isPending}
                            >
                              确认
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                              disabled={updateAppointmentMutation.isPending}
                            >
                              拒绝
                            </Button>
                          </>
                        )}
                        
                        {appointment.status === 'confirmed' && (
                          <Button 
                            size="sm"
                            onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                            disabled={updateAppointmentMutation.isPending}
                          >
                            完成
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                              详情
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>预约详情</DialogTitle>
                              <DialogDescription>
                                查看和管理来访者的详细信息
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={appointment.client?.profileImageUrl || ""} alt={appointment.client?.firstName || ""} />
                                  <AvatarFallback className="bg-blue-500 text-white">
                                    {getInitials(appointment.client?.firstName || "", appointment.client?.lastName || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {appointment.client?.firstName} {appointment.client?.lastName}
                                  </h4>
                                  <p className="text-sm text-gray-600">{appointment.client?.email}</p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-sm text-gray-600">预约时间</Label>
                                  <p className="font-medium">
                                    {format(new Date(appointment.appointmentDate), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm text-gray-600">咨询方式</Label>
                                  <p className="font-medium">
                                    {appointment.consultationType === 'online' ? '在线咨询' : '面对面咨询'}
                                  </p>
                                </div>
                              </div>
                              
                              {appointment.clientNotes && (
                                <div>
                                  <Label className="text-sm text-gray-600">来访者需求</Label>
                                  <div className="mt-1 p-3 bg-gray-50 rounded border text-sm">
                                    {appointment.clientNotes}
                                  </div>
                                </div>
                              )}
                              
                              <div>
                                <Label htmlFor="therapist-notes" className="text-sm text-gray-600">
                                  咨询师备注
                                </Label>
                                <Textarea
                                  id="therapist-notes"
                                  placeholder="记录咨询要点、来访者状态等..."
                                  value={appointmentNotes}
                                  onChange={(e) => setAppointmentNotes(e.target.value)}
                                  className="mt-1"
                                  rows={4}
                                />
                                <Button className="mt-2" size="sm">
                                  保存备注
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}