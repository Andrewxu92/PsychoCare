import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Menu, User, Settings } from "lucide-react";
import { Link } from "wouter";
import type { TherapistWithUser } from "@shared/schema";

export default function Navigation() {
  const { user, isAuthenticated } = useAuth();

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

  const isTherapist = therapists?.some((t: TherapistWithUser) => t.userId === user?.id);

  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-neutral-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-neutral-800">心理咨询平台</span>
            </Link>
            <div className="hidden md:flex space-x-6 ml-8">
              <Link href="/" className="text-primary font-medium">
                首页
              </Link>
              {!isTherapist && (
                <Link href="/therapists" className="text-neutral-600 hover:text-primary transition-colors">
                  咨询师
                </Link>
              )}
              {isAuthenticated && (
                <Link href={isTherapist ? "/therapist-dashboard" : "/dashboard"} className="text-neutral-600 hover:text-primary transition-colors">
                  {isTherapist ? "咨询师后台" : "我的预约"}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>
                        {user.firstName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block">
                      {user.firstName || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isTherapist ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/therapist-dashboard">
                          <Settings className="mr-2 h-4 w-4" />
                          咨询师后台
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <User className="mr-2 h-4 w-4" />
                          个人资料
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <User className="mr-2 h-4 w-4" />
                          个人中心
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/therapist-registration">
                          <Heart className="mr-2 h-4 w-4" />
                          成为咨询师
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => window.location.href = "/api/logout"}>
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
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
              </>
            )}

            {/* Mobile menu */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/">首页</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/therapists">咨询师</Link>
                  </DropdownMenuItem>
                  {isAuthenticated && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard">我的预约</Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
