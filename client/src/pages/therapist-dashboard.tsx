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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/navigation";
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Star, Award, Phone, Mail, MessageSquare, FileText, TrendingUp } from "lucide-react";
import type { AppointmentWithDetails, TherapistWithUser } from "@shared/schema";

export default function TherapistDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
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

  const filteredAppointments = (appointments as AppointmentWithDetails[]).filter((appointment: AppointmentWithDetails) => {
    if (selectedStatus === 'all') return true;
    return appointment.status === selectedStatus;
  });

  const pendingCount = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => a.status === 'pending').length;
  const confirmedCount = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => a.status === 'confirmed').length;
  const completedCount = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => a.status === 'completed').length;
  const cancelledCount = (appointments as AppointmentWithDetails[]).filter((a: AppointmentWithDetails) => a.status === 'cancelled').length;

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Professional Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-blue-100">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-4 ring-blue-100">
                <AvatarImage src={therapist?.user?.profileImageUrl || ""} alt={therapist?.user?.firstName || ""} />
                <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-semibold">
                  {getInitials(therapist?.user?.firstName || "", therapist?.user?.lastName || "")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-800 mb-2">
                  {therapist?.title} {therapist?.user?.firstName} {therapist?.user?.lastName}
                </h1>
                <p className="text-xl text-blue-600 font-medium mb-3">{therapist?.specialties?.[0] || '心理咨询师'}</p>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm font-semibold text-yellow-700">{parseFloat(therapist?.rating || '5.0').toFixed(1)} 评分</span>
                  </div>
                  <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                    <Award className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-blue-700">{therapist?.experience} 年经验</span>
                  </div>
                  <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
                    <User className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold text-green-700">{appointments.length} 位来访者</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">今日时间</p>
                <p className="text-lg font-semibold text-gray-800">{format(new Date(), 'HH:mm')}</p>
                <p className="text-sm text-gray-600">{format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-100 border-yellow-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-semibold uppercase tracking-wide">待确认预约</p>
                  <p className="text-4xl font-bold text-yellow-800 mt-2">{pendingCount}</p>
                  <p className="text-xs text-yellow-600 mt-1">需要您的回复</p>
                </div>
                <div className="bg-yellow-200 p-3 rounded-full">
                  <AlertCircle className="h-8 w-8 text-yellow-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-semibold uppercase tracking-wide">已确认预约</p>
                  <p className="text-4xl font-bold text-green-800 mt-2">{confirmedCount}</p>
                  <p className="text-xs text-green-600 mt-1">即将进行</p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <CheckCircle className="h-8 w-8 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide">已完成预约</p>
                  <p className="text-4xl font-bold text-blue-800 mt-2">{completedCount}</p>
                  <p className="text-xs text-blue-600 mt-1">成功咨询</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <Calendar className="h-8 w-8 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-pink-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 font-semibold uppercase tracking-wide">本月收入</p>
                  <p className="text-4xl font-bold text-purple-800 mt-2">¥{(completedCount * parseFloat(therapist?.hourlyRate || '0')).toLocaleString()}</p>
                  <p className="text-xs text-purple-600 mt-1">已完成咨询</p>
                </div>
                <div className="bg-purple-200 p-3 rounded-full">
                  <TrendingUp className="h-8 w-8 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Appointment Management */}
        <Card className="bg-white shadow-xl border-0 rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <CardTitle className="text-2xl font-bold">预约管理中心</CardTitle>
            <CardDescription className="text-blue-100">
              管理您的所有预约，查看来访者信息，确认咨询时间
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-0">
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus} className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-gray-50 m-0 rounded-none border-b">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 py-4">
                  <div className="text-center">
                    <div className="font-semibold">全部预约</div>
                    <div className="text-xs text-gray-500">{appointments.length} 个</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-yellow-600 data-[state=active]:border-b-2 data-[state=active]:border-yellow-600 py-4">
                  <div className="text-center">
                    <div className="font-semibold">待确认</div>
                    <div className="text-xs text-gray-500">{pendingCount} 个</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="confirmed" className="data-[state=active]:bg-white data-[state=active]:text-green-600 data-[state=active]:border-b-2 data-[state=active]:border-green-600 py-4">
                  <div className="text-center">
                    <div className="font-semibold">已确认</div>
                    <div className="text-xs text-gray-500">{confirmedCount} 个</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 py-4">
                  <div className="text-center">
                    <div className="font-semibold">已完成</div>
                    <div className="text-xs text-gray-500">{completedCount} 个</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:text-red-600 data-[state=active]:border-b-2 data-[state=active]:border-red-600 py-4">
                  <div className="text-center">
                    <div className="font-semibold">已取消</div>
                    <div className="text-xs text-gray-500">{cancelledCount} 个</div>
                  </div>
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedStatus} className="p-6">
                {appointmentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Card key={i} className="animate-pulse border border-gray-200">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-3">
                              <div className="h-5 bg-gray-200 rounded w-1/3"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">暂无预约</h3>
                    <p className="text-gray-500">
                      {selectedStatus === 'all' ? '还没有任何预约记录' : `没有状态为"${getStatusBadge(selectedStatus).props.children}"的预约`}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAppointments.map((appointment: AppointmentWithDetails) => (
                      <Card key={appointment.id} className="border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <Avatar className="h-16 w-16 ring-2 ring-gray-100">
                                <AvatarImage src={appointment.client?.profileImageUrl || ""} alt={appointment.client?.firstName || ""} />
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold text-lg">
                                  {getInitials(appointment.client?.firstName || "", appointment.client?.lastName || "")}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <h3 className="font-bold text-xl text-gray-900">
                                    {appointment.client?.firstName} {appointment.client?.lastName}
                                  </h3>
                                  {getStatusBadge(appointment.status)}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                    <span className="font-medium">{format(new Date(appointment.appointmentDate), 'yyyy年MM月dd日', { locale: zhCN })}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Clock className="h-5 w-5 text-green-500" />
                                    <span className="font-medium">{format(new Date(appointment.appointmentDate), 'HH:mm')}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <User className="h-5 w-5 text-purple-500" />
                                    <span className="font-medium">{appointment.consultationType === 'online' ? '在线咨询' : '面对面咨询'}</span>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span>{appointment.client?.email}</span>
                                  </div>
                                  {appointment.clientNotes && (
                                    <div className="flex items-start gap-2 text-sm text-gray-600">
                                      <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                                      <span className="bg-gray-50 px-3 py-2 rounded-lg border">{appointment.clientNotes}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-6">
                              {appointment.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2"
                                    onClick={() => handleStatusUpdate(appointment.id, 'confirmed')}
                                    disabled={updateAppointmentMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    确认预约
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="border-red-300 text-red-600 hover:bg-red-50 font-semibold px-4 py-2"
                                    onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
                                    disabled={updateAppointmentMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    拒绝预约
                                  </Button>
                                </>
                              )}
                              
                              {appointment.status === 'confirmed' && (
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2"
                                  onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                                  disabled={updateAppointmentMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  标记完成
                                </Button>
                              )}
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="font-semibold px-4 py-2" onClick={() => setSelectedAppointment(appointment)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    查看详情
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold text-gray-800">预约详情管理</DialogTitle>
                                    <DialogDescription className="text-gray-600">
                                      详细查看和管理来访者预约信息
                                    </DialogDescription>
                                  </DialogHeader>
                                  
                                  <div className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                      <div className="flex items-center gap-4 mb-4">
                                        <Avatar className="h-12 w-12">
                                          <AvatarImage src={appointment.client?.profileImageUrl || ""} alt={appointment.client?.firstName || ""} />
                                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold">
                                            {getInitials(appointment.client?.firstName || "", appointment.client?.lastName || "")}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <h4 className="font-bold text-lg text-gray-800">
                                            {appointment.client?.firstName} {appointment.client?.lastName}
                                          </h4>
                                          <p className="text-blue-600 font-medium">{appointment.client?.email}</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <div>
                                          <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">预约时间</Label>
                                          <p className="mt-1 text-lg font-bold text-gray-900">
                                            {format(new Date(appointment.appointmentDate), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                                          </p>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">咨询类型</Label>
                                          <p className="mt-1 text-lg font-bold text-gray-900">
                                            {appointment.consultationType === 'online' ? '🌐 在线咨询' : '🏢 面对面咨询'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="space-y-4">
                                        <div>
                                          <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">预约状态</Label>
                                          <div className="mt-1">
                                            {getStatusBadge(appointment.status)}
                                          </div>
                                        </div>
                                        <div>
                                          <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">费用</Label>
                                          <p className="mt-1 text-lg font-bold text-green-600">
                                            ¥{parseFloat(therapist?.hourlyRate || '0').toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">来访者需求说明</Label>
                                      <div className="mt-2 bg-gray-50 p-4 rounded-lg border">
                                        <p className="text-gray-900 leading-relaxed">
                                          {appointment.clientNotes || '来访者未提供特殊需求说明'}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="therapist-notes" className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                                        咨询师备注记录
                                      </Label>
                                      <Textarea
                                        id="therapist-notes"
                                        placeholder="请记录咨询要点、来访者状态、后续建议等..."
                                        value={appointmentNotes}
                                        onChange={(e) => setAppointmentNotes(e.target.value)}
                                        className="mt-2 min-h-[120px]"
                                        rows={5}
                                      />
                                      <div className="flex gap-3 mt-3">
                                        <Button className="bg-blue-600 hover:bg-blue-700 font-semibold">
                                          💾 保存备注
                                        </Button>
                                        <Button variant="outline" className="font-semibold">
                                          📋 生成咨询报告
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </CardContent>
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