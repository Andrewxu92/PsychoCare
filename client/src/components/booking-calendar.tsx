import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Availability } from "@shared/schema";

interface BookingCalendarProps {
  therapistId: number;
  selectedDate?: Date;
  selectedTime: string;
  onDateSelect: (date: Date) => void;
  onTimeSelect: (time: string) => void;
}

export default function BookingCalendar({ 
  therapistId, 
  selectedDate, 
  selectedTime, 
  onDateSelect, 
  onTimeSelect 
}: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { data: availability = [] } = useQuery<Availability[]>({
    queryKey: [`/api/therapists/${therapistId}/availability`],
    enabled: !!therapistId,
  });

  // Generate time slots based on availability
  const generateTimeSlots = (dayOfWeek: number) => {
    const dayAvailability = availability.filter(av => 
      av.dayOfWeek === dayOfWeek && av.isActive
    );
    
    const slots: string[] = [];
    
    dayAvailability.forEach(av => {
      const startTime = av.startTime;
      const endTime = av.endTime;
      
      // Parse time strings (e.g., "09:00:00")
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);
      
      // Generate hourly slots
      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        slots.push(timeSlot);
      }
    });
    
    return slots.sort();
  };

  // Get calendar grid for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();
    
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelectable: boolean;
    }> = [];
    
    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelectable: false,
      });
    }
    
    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const hasAvailability = availability.some(av => 
        av.dayOfWeek === dayOfWeek && av.isActive
      );
      
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        isSelectable: date >= today && hasAvailability,
      });
    }
    
    // Next month days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        isSelectable: false,
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleDateClick = (date: Date) => {
    if (date >= new Date() && availability.some(av => 
      av.dayOfWeek === date.getDay() && av.isActive
    )) {
      onDateSelect(date);
      onTimeSelect(''); // Reset selected time when date changes
    }
  };

  const getAvailableTimeSlots = () => {
    if (!selectedDate) return [];
    return generateTimeSlots(selectedDate.getDay());
  };

  const isTimeSlotBooked = (time: string) => {
    // In a real app, this would check against existing appointments
    // For now, we'll simulate some booked slots
    const bookedSlots = ['11:00', '14:00'];
    return bookedSlots.includes(time);
  };

  const calendarDays = getCalendarDays();
  const timeSlots = getAvailableTimeSlots();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>选择日期</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[120px] text-center">
                {currentMonth.toLocaleDateString('zh-CN', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
              <div key={day} className="text-center text-sm font-medium text-neutral-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dayInfo, index) => {
              const isSelected = selectedDate && 
                dayInfo.date.toDateString() === selectedDate.toDateString();
              
              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(dayInfo.date)}
                  disabled={!dayInfo.isSelectable}
                  className={cn(
                    "calendar-day",
                    !dayInfo.isCurrentMonth && "text-neutral-400",
                    dayInfo.isToday && "bg-blue-100 text-primary font-semibold",
                    isSelected && "selected",
                    !dayInfo.isSelectable && "disabled"
                  )}
                >
                  {dayInfo.date.getDate()}
                </button>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="mt-4 text-xs text-neutral-600 space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded"></div>
              <span>已选择</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-100 rounded"></div>
              <span>今天</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-neutral-200 rounded"></div>
              <span>不可预约</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Slots */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>可预约时间</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <div className="text-center py-8 text-neutral-600">
              请先选择日期
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-8 text-neutral-600">
              该日期无可预约时间
            </div>
          ) : (
            <div className="space-y-4">
              {/* Morning slots */}
              {timeSlots.filter(time => {
                const hour = parseInt(time.split(':')[0]);
                return hour >= 6 && hour < 12;
              }).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 mb-3">上午</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots
                      .filter(time => {
                        const hour = parseInt(time.split(':')[0]);
                        return hour >= 6 && hour < 12;
                      })
                      .map((time) => {
                        const isBooked = isTimeSlotBooked(time);
                        const isSelected = selectedTime === time;
                        
                        return (
                          <button
                            key={time}
                            onClick={() => !isBooked && onTimeSelect(time)}
                            disabled={isBooked}
                            className={cn(
                              "time-slot",
                              isSelected && "selected",
                              isBooked && "disabled"
                            )}
                          >
                            {time}
                            {isBooked && ' (已预约)'}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Afternoon slots */}
              {timeSlots.filter(time => {
                const hour = parseInt(time.split(':')[0]);
                return hour >= 12 && hour < 18;
              }).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 mb-3">下午</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots
                      .filter(time => {
                        const hour = parseInt(time.split(':')[0]);
                        return hour >= 12 && hour < 18;
                      })
                      .map((time) => {
                        const isBooked = isTimeSlotBooked(time);
                        const isSelected = selectedTime === time;
                        
                        return (
                          <button
                            key={time}
                            onClick={() => !isBooked && onTimeSelect(time)}
                            disabled={isBooked}
                            className={cn(
                              "time-slot",
                              isSelected && "selected",
                              isBooked && "disabled"
                            )}
                          >
                            {time}
                            {isBooked && ' (已预约)'}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Evening slots */}
              {timeSlots.filter(time => {
                const hour = parseInt(time.split(':')[0]);
                return hour >= 18;
              }).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-neutral-700 mb-3">晚上</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots
                      .filter(time => {
                        const hour = parseInt(time.split(':')[0]);
                        return hour >= 18;
                      })
                      .map((time) => {
                        const isBooked = isTimeSlotBooked(time);
                        const isSelected = selectedTime === time;
                        
                        return (
                          <button
                            key={time}
                            onClick={() => !isBooked && onTimeSelect(time)}
                            disabled={isBooked}
                            className={cn(
                              "time-slot",
                              isSelected && "selected",
                              isBooked && "disabled"
                            )}
                          >
                            {time}
                            {isBooked && ' (已预约)'}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
