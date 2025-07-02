import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/navigation";
import TherapistCard from "@/components/therapist-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Users } from "lucide-react";
import type { TherapistWithUser } from "@shared/schema";

export default function Therapists() {
  const [filters, setFilters] = useState({
    specialty: "",
    consultationType: "",
    priceMin: "",
    priceMax: "",
    search: ""
  });

  const { data: therapists = [], isLoading } = useQuery<TherapistWithUser[]>({
    queryKey: ['/api/therapists', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.specialty) params.append('specialty', filters.specialty);
      if (filters.consultationType) params.append('consultationType', filters.consultationType);
      if (filters.priceMin) params.append('priceMin', filters.priceMin);
      if (filters.priceMax) params.append('priceMax', filters.priceMax);
      
      const response = await fetch(`/api/therapists?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch therapists');
      return response.json();
    }
  });

  const filteredTherapists = therapists.filter(therapist => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      therapist.user.firstName?.toLowerCase().includes(searchLower) ||
      therapist.user.lastName?.toLowerCase().includes(searchLower) ||
      therapist.title.toLowerCase().includes(searchLower) ||
      therapist.description?.toLowerCase().includes(searchLower) ||
      therapist.specialties?.some(s => s.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">我们的专业咨询师</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            经过严格筛选的专业心理咨询师，拥有丰富的临床经验和专业资质
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>筛选咨询师</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="搜索咨询师姓名、专业领域..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={filters.specialty} onValueChange={(value) => setFilters({ ...filters, specialty: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="专业领域" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部领域</SelectItem>
                  <SelectItem value="抑郁焦虑">抑郁焦虑</SelectItem>
                  <SelectItem value="亲密关系">亲密关系</SelectItem>
                  <SelectItem value="职场压力">职场压力</SelectItem>
                  <SelectItem value="青少年问题">青少年问题</SelectItem>
                  <SelectItem value="家庭治疗">家庭治疗</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.consultationType} onValueChange={(value) => setFilters({ ...filters, consultationType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="咨询方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部方式</SelectItem>
                  <SelectItem value="online">在线咨询</SelectItem>
                  <SelectItem value="in-person">面对面咨询</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.priceMax} onValueChange={(value) => setFilters({ ...filters, priceMax: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="价格范围" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部价格</SelectItem>
                  <SelectItem value="200">¥200以下</SelectItem>
                  <SelectItem value="300">¥300以下</SelectItem>
                  <SelectItem value="500">¥500以下</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2 text-neutral-600">
            <Users className="h-5 w-5" />
            <span>找到 {filteredTherapists.length} 位咨询师</span>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setFilters({
              specialty: "",
              consultationType: "",
              priceMin: "",
              priceMax: "",
              search: ""
            })}
          >
            清除筛选
          </Button>
        </div>

        {/* Therapist Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex items-start space-x-4 mb-4">
                  <div className="w-16 h-16 bg-neutral-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-neutral-200 rounded mb-2"></div>
                    <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="h-3 bg-neutral-200 rounded mb-2"></div>
                <div className="h-3 bg-neutral-200 rounded w-3/4"></div>
              </Card>
            ))}
          </div>
        ) : filteredTherapists.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">未找到匹配的咨询师</h3>
            <p className="text-neutral-600 mb-4">请尝试调整筛选条件或搜索关键词</p>
            <Button onClick={() => setFilters({
              specialty: "",
              consultationType: "",
              priceMin: "",
              priceMax: "",
              search: ""
            })}>
              清除所有筛选
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTherapists.map((therapist) => (
              <TherapistCard key={therapist.id} therapist={therapist} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
