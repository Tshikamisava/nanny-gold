import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, X } from 'lucide-react';
import { useSetRecurringAvailability } from '@/hooks/useNannyAvailability';

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  available: boolean;
  hours: TimeSlot[];
}

interface WeeklySchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const defaultTimeSlot: TimeSlot = { start: '08:00', end: '17:00' };
const defaultDaySchedule: DaySchedule = { available: false, hours: [] };

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export default function WeeklyScheduleBuilder({ 
  initialSchedule, 
  onClose 
}: { 
  initialSchedule?: WeeklySchedule; 
  onClose: () => void; 
}) {
  const [schedule, setSchedule] = useState<WeeklySchedule>(
    initialSchedule || {
      monday: defaultDaySchedule,
      tuesday: defaultDaySchedule,
      wednesday: defaultDaySchedule,
      thursday: defaultDaySchedule,
      friday: defaultDaySchedule,
      saturday: defaultDaySchedule,
      sunday: defaultDaySchedule,
    }
  );

  const setRecurringAvailability = useSetRecurringAvailability();

  const toggleDayAvailability = (day: keyof WeeklySchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day].available,
        hours: !prev[day].available && prev[day].hours.length === 0 
          ? [defaultTimeSlot] 
          : prev[day].hours
      }
    }));
  };

  const addTimeSlot = (day: keyof WeeklySchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        hours: [...prev[day].hours, defaultTimeSlot]
      }
    }));
  };

  const removeTimeSlot = (day: keyof WeeklySchedule, index: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        hours: prev[day].hours.filter((_, i) => i !== index)
      }
    }));
  };

  const updateTimeSlot = (day: keyof WeeklySchedule, index: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        hours: prev[day].hours.map((slot, i) => 
          i === index ? { ...slot, [field]: value } : slot
        )
      }
    }));
  };

  const handleSave = async () => {
    try {
      await setRecurringAvailability.mutateAsync(schedule);
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const setCommonHours = (hours: TimeSlot) => {
    const enabledDays = Object.keys(schedule).filter(day => 
      schedule[day as keyof WeeklySchedule].available
    ) as (keyof WeeklySchedule)[];

    const updates = enabledDays.reduce((acc, day) => ({
      ...acc,
      [day]: {
        ...schedule[day],
        hours: [hours]
      }
    }), {});

    setSchedule(prev => ({ ...prev, ...updates }));
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Weekly Availability Schedule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Set your regular weekly availability pattern. This will be used as your default schedule.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCommonHours({ start: '08:00', end: '17:00' })}
          >
            Set All to 8am-5pm
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCommonHours({ start: '07:00', end: '19:00' })}
          >
            Set All to 7am-7pm
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCommonHours({ start: '06:00', end: '18:00' })}
          >
            Set All to 6am-6pm
          </Button>
        </div>

        {/* Daily Schedule Builder */}
        <div className="space-y-4">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={schedule[key].available}
                    onCheckedChange={() => toggleDayAvailability(key)}
                  />
                  <h3 className="font-medium">{label}</h3>
                  {schedule[key].available && (
                    <Badge variant="secondary">Available</Badge>
                  )}
                </div>
                {schedule[key].available && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addTimeSlot(key)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Time Slot
                  </Button>
                )}
              </div>

              {schedule[key].available && (
                <div className="space-y-2">
                  {schedule[key].hours.map((slot, index) => (
                    <div key={index} className="flex items-center gap-3 bg-muted/50 p-3 rounded">
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(key, index, 'start', e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-muted-foreground">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(key, index, 'end', e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      {schedule[key].hours.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTimeSlot(key, index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={setRecurringAvailability.isPending}
          >
            {setRecurringAvailability.isPending ? 'Saving...' : 'Save Schedule'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}