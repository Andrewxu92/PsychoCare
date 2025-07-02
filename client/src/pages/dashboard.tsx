import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, Calendar, Clock, Star, MapPin, Phone, Mail, Edit, Save, 
  Video, Users, CheckCircle, XCircle, AlertCircle, Plus, Settings,
  History, TrendingUp, Award, FileText
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { AppointmentWithDetails, TherapistWithUser, User as UserType } from "@shared/schema";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    role: user?.role || "client",
    phone: user?.phone || "",
  });

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    toast({
      title: "请先登录",
      description: "您需要登录后才能访问个人中心。",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 1000);
    return null;
  }

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments'],
    enabled: isAuthenticated,
  });

  const { data: therapistProfile, isLoading: therapistLoading } = useQuery<TherapistWithUser>({
    queryKey: ['/api/therapists/profile'],
    queryFn: async () => {
      const response = await fetch('/api/therapists/profile');
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch therapist profile');
      return response.json();
    },
    enabled: isAuthenticated && user?.role === 'therapist',
  });

  const updateUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      await apiRequest('PUT', '/api/auth/user', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsEditing(false);
      toast({
        title: "更新成功",
        description: "个人信息已更新。",
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
        description: "更新个人信息时出现错误。",
        variant: "destructive",
      });
    },
  });

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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-xl p-8 mb-8">
              <div className="h-8 bg-neutral-200 rounded mb-4"></div>
              <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-neutral-100 text-neutral-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '已确认';
      case 'pending':
        return '待确认';
      case 'completed':
        return '已完成';
      case 'cancelled':
        return '已取消';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const upcomingAppointments = appointments.filter(apt => 
    new Date(apt.appointmentDate) > new Date() && apt.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(apt => 
    new Date(apt.appointmentDate) <= new Date() || apt.status === 'completed'
  );

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');

  const handleSaveProfile = () => {
    updateUserMutation.mutate(editForm);
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}` || 'U';
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            个人中心
          </h1>
          <p className="text-lg text-neutral-600">
            管理您的预约、资料和设置
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-lg">
                      {getInitials(user?.firstName, user?.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg text-neutral-900">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-sm text-neutral-600">{user?.email}</p>
                  <Badge variant={user?.role === 'therapist' ? 'default' : 'secondary'} className="mt-2">
                    {user?.role === 'therapist' ? '咨询师' : '来访者'}
                  </Badge>
                </div>

                <nav className="space-y-2">
                  <Button
                    variant={activeTab === 'overview' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('overview')}
                  >
                    <User className="mr-2 h-4 w-4" />
                    总览
                  </Button>
                  <Button
                    variant={activeTab === 'appointments' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('appointments')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    我的预约
                  </Button>
                  <Button
                    variant={activeTab === 'history' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('history')}
                  >
                    <History className="mr-2 h-4 w-4" />
                    咨询历史
                  </Button>
                  <Button
                    variant={activeTab === 'profile' ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveTab('profile')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    个人资料
                  </Button>
                  {user?.role === 'therapist' && (
                    <Button
                      variant={activeTab === 'therapist' ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setActiveTab('therapist')}
                    >
                      <Award className="mr-2 h-4 w-4" />
                      咨询师资料
                    </Button>
                  )}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Calendar className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-primary">
                            {appointments.length}
                          </div>
                          <div className="text-sm text-neutral-600">总咨询次数</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                          <Clock className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {pendingAppointments.length}
                          </div>
                          <div className="text-sm text-neutral-600">待确认预约</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {pastAppointments.filter(apt => apt.status === 'completed').length}
                          </div>
                          <div className="text-sm text-neutral-600">已完成咨询</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Upcoming Appointments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>即将到来的预约</span>
                      <Link href="/therapists">
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          新建预约
                        </Button>
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {appointmentsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                            <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                              <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : upcomingAppointments.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">暂无即将到来的预约</h3>
                        <p className="text-neutral-600 mb-4">预约专业咨询师，开始您的心理健康之旅</p>
                        <Link href="/therapists">
                          <Button>浏览咨询师</Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingAppointments.slice(0, 3).map((appointment) => (
                          <div key={appointment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={appointment.therapist.user.profileImageUrl || undefined} />
                                  <AvatarFallback>
                                    {getInitials(appointment.therapist.user.firstName, appointment.therapist.user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-neutral-900">
                                    {appointment.therapist.user.firstName} {appointment.therapist.user.lastName}
                                  </div>
                                  <div className="text-sm text-neutral-600">
                                    {new Date(appointment.appointmentDate).toLocaleString('zh-CN')}
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    {appointment.consultationType === 'online' ? (
                                      <Video className="h-4 w-4 text-neutral-500" />
                                    ) : (
                                      <Users className="h-4 w-4 text-neutral-500" />
                                    )}
                                    <span className="text-sm text-neutral-600">
                                      {appointment.consultationType === 'online' ? '在线咨询' : '面对面咨询'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(appointment.status)}>
                                  {getStatusIcon(appointment.status)}
                                  <span className="ml-1">{getStatusText(appointment.status)}</span>
                                </Badge>
                                {user?.role === 'therapist' && appointment.status === 'pending' && (
                                  <div className="flex space-x-2 mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => updateAppointmentMutation.mutate({ 
                                        id: appointment.id, 
                                        status: 'confirmed' 
                                      })}
                                    >
                                      确认
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => updateAppointmentMutation.mutate({ 
                                        id: appointment.id, 
                                        status: 'cancelled' 
                                      })}
                                    >
                                      拒绝
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {upcomingAppointments.length > 3 && (
                          <div className="text-center">
                            <Button variant="outline" onClick={() => setActiveTab('appointments')}>
                              查看全部 {upcomingAppointments.length} 个预约
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <Card>
                <CardHeader>
                  <CardTitle>我的预约</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upcoming">即将到来</TabsTrigger>
                      <TabsTrigger value="pending">待处理</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="upcoming" className="space-y-4">
                      {upcomingAppointments.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                          <p className="text-neutral-600">暂无即将到来的预约</p>
                        </div>
                      ) : (
                        upcomingAppointments.map((appointment) => (
                          <div key={appointment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={appointment.therapist.user.profileImageUrl || undefined} />
                                  <AvatarFallback>
                                    {getInitials(appointment.therapist.user.firstName, appointment.therapist.user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-neutral-900">
                                    {appointment.therapist.user.firstName} {appointment.therapist.user.lastName}
                                  </div>
                                  <div className="text-sm text-neutral-600">
                                    {new Date(appointment.appointmentDate).toLocaleString('zh-CN')}
                                  </div>
                                  <div className="text-sm text-neutral-600">
                                    ¥{Number(appointment.price).toFixed(0)}
                                  </div>
                                </div>
                              </div>
                              <Badge className={getStatusColor(appointment.status)}>
                                {getStatusText(appointment.status)}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>
                    
                    <TabsContent value="pending" className="space-y-4">
                      {pendingAppointments.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                          <p className="text-neutral-600">暂无待处理的预约</p>
                        </div>
                      ) : (
                        pendingAppointments.map((appointment) => (
                          <div key={appointment.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <Avatar className="h-12 w-12">
                                  <AvatarImage src={appointment.therapist.user.profileImageUrl || undefined} />
                                  <AvatarFallback>
                                    {getInitials(appointment.therapist.user.firstName, appointment.therapist.user.lastName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-neutral-900">
                                    {appointment.therapist.user.firstName} {appointment.therapist.user.lastName}
                                  </div>
                                  <div className="text-sm text-neutral-600">
                                    {new Date(appointment.appointmentDate).toLocaleString('zh-CN')}
                                  </div>
                                </div>
                              </div>
                              {user?.role === 'therapist' && (
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => updateAppointmentMutation.mutate({ 
                                      id: appointment.id, 
                                      status: 'confirmed' 
                                    })}
                                  >
                                    确认
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => updateAppointmentMutation.mutate({ 
                                      id: appointment.id, 
                                      status: 'cancelled' 
                                    })}
                                  >
                                    拒绝
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <Card>
                <CardHeader>
                  <CardTitle>咨询历史</CardTitle>
                </CardHeader>
                <CardContent>
                  {pastAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                      <p className="text-neutral-600">暂无咨询历史</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pastAppointments.map((appointment) => (
                        <div key={appointment.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={appointment.therapist.user.profileImageUrl || undefined} />
                                <AvatarFallback>
                                  {getInitials(appointment.therapist.user.firstName, appointment.therapist.user.lastName)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-neutral-900">
                                  {appointment.therapist.user.firstName} {appointment.therapist.user.lastName}
                                </div>
                                <div className="text-sm text-neutral-600">
                                  {new Date(appointment.appointmentDate).toLocaleString('zh-CN')}
                                </div>
                                <div className="text-sm text-neutral-600">
                                  {formatDistanceToNow(new Date(appointment.appointmentDate), { 
                                    addSuffix: true, 
                                    locale: zhCN 
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatusColor(appointment.status)}>
                                {getStatusText(appointment.status)}
                              </Badge>
                              {appointment.status === 'completed' && user?.role === 'client' && (
                                <Button size="sm" variant="outline" className="mt-2">
                                  <Star className="mr-1 h-4 w-4" />
                                  评价
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>个人资料</span>
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        编辑
                      </Button>
                    ) : (
                      <div className="space-x-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          取消
                        </Button>
                        <Button onClick={handleSaveProfile} disabled={updateUserMutation.isPending}>
                          <Save className="mr-2 h-4 w-4" />
                          保存
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label>姓名</Label>
                      <Input 
                        value={`${user?.firstName || ''} ${user?.lastName || ''}`} 
                        disabled 
                        className="mt-1"
                      />
                      <p className="text-xs text-neutral-500 mt-1">姓名信息来自登录账户，无法修改</p>
                    </div>
                    
                    <div>
                      <Label>邮箱</Label>
                      <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="mt-1"
                      />
                      <p className="text-xs text-neutral-500 mt-1">邮箱信息来自登录账户，无法修改</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="role">用户角色</Label>
                      <Select 
                        value={isEditing ? editForm.role : user?.role} 
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value }))}
                        disabled={!isEditing}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">来访者</SelectItem>
                          <SelectItem value="therapist">咨询师</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">手机号</Label>
                      <Input
                        id="phone"
                        value={isEditing ? editForm.phone : user?.phone || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditing}
                        placeholder="请输入手机号"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Therapist Profile Tab */}
            {activeTab === 'therapist' && user?.role === 'therapist' && (
              <Card>
                <CardHeader>
                  <CardTitle>咨询师资料</CardTitle>
                </CardHeader>
                <CardContent>
                  {therapistLoading ? (
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/3"></div>
                    </div>
                  ) : !therapistProfile ? (
                    <div className="text-center py-8">
                      <Award className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">尚未创建咨询师资料</h3>
                      <p className="text-neutral-600 mb-4">请完善您的咨询师资料以接受预约</p>
                      <Button>创建咨询师资料</Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-semibold text-neutral-900 mb-2">基本信息</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>职业头衔</Label>
                            <Input value={therapistProfile.title} disabled className="mt-1" />
                          </div>
                          <div>
                            <Label>收费标准</Label>
                            <Input value={`¥${Number(therapistProfile.hourlyRate).toFixed(0)}/次`} disabled className="mt-1" />
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label>专业领域</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {therapistProfile.specialties?.map((specialty, index) => (
                            <Badge key={index} variant="secondary">{specialty}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label>个人简介</Label>
                        <Textarea 
                          value={therapistProfile.description || ''}
                          disabled
                          className="mt-1"
                          rows={4}
                        />
                      </div>
                      
                      <Button>编辑咨询师资料</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
