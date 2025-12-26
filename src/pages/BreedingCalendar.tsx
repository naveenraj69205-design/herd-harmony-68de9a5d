import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { 
  CalendarDays, 
  Plus, 
  Thermometer,
  Baby,
  Syringe,
  Clock,
  ChevronLeft,
  ChevronRight,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  addDays
} from 'date-fns';

interface Cow {
  id: string;
  name: string;
  tag_number: string;
}

interface BreedingEvent {
  id: string;
  cow_id: string;
  event_type: string;
  event_date: string;
  end_date: string | null;
  title: string;
  description: string | null;
  status: string;
  cows?: {
    name: string;
    tag_number: string;
  };
}

interface HeatRecord {
  id: string;
  cow_id: string;
  detected_at: string;
  intensity: string;
  cows?: {
    name: string;
    tag_number: string;
  };
}

const EVENT_TYPES = [
  { id: 'heat_detected', name: 'Heat Detected', icon: Thermometer, color: 'bg-red-500' },
  { id: 'insemination', name: 'Insemination', icon: Syringe, color: 'bg-blue-500' },
  { id: 'pregnancy_check', name: 'Pregnancy Check', icon: Clock, color: 'bg-purple-500' },
  { id: 'expected_calving', name: 'Expected Calving', icon: Baby, color: 'bg-green-500' },
  { id: 'actual_calving', name: 'Actual Calving', icon: Baby, color: 'bg-emerald-500' },
];

export default function BreedingCalendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<BreedingEvent[]>([]);
  const [heatRecords, setHeatRecords] = useState<HeatRecord[]>([]);
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedCow, setSelectedCow] = useState('');
  const [eventType, setEventType] = useState('insemination');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, currentMonth]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const [eventsResult, heatResult, cowsResult] = await Promise.all([
      supabase
        .from('breeding_events')
        .select('*, cows(name, tag_number)')
        .eq('user_id', user.id)
        .gte('event_date', monthStart.toISOString())
        .lte('event_date', monthEnd.toISOString())
        .order('event_date'),
      supabase
        .from('heat_records')
        .select('id, cow_id, detected_at, intensity, cows(name, tag_number)')
        .eq('user_id', user.id)
        .gte('detected_at', monthStart.toISOString())
        .lte('detected_at', monthEnd.toISOString())
        .order('detected_at'),
      supabase
        .from('cows')
        .select('id, name, tag_number')
        .eq('user_id', user.id)
        .order('name'),
    ]);

    if (eventsResult.data) setEvents(eventsResult.data as BreedingEvent[]);
    if (heatResult.data) setHeatRecords(heatResult.data as HeatRecord[]);
    if (cowsResult.data) setCows(cowsResult.data);
    setLoading(false);
  };

  const handleAddEvent = async () => {
    if (!user || !selectedCow || !selectedDate) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);

    const title = eventTitle || `${EVENT_TYPES.find(e => e.id === eventType)?.name} - ${cows.find(c => c.id === selectedCow)?.name}`;

    const { error } = await supabase.from('breeding_events').insert({
      user_id: user.id,
      cow_id: selectedCow,
      event_type: eventType,
      event_date: selectedDate.toISOString(),
      title,
      description: eventDescription || null,
      status: 'scheduled',
    });

    if (error) {
      toast.error('Failed to add event');
      console.error(error);
    } else {
      toast.success('Event added to calendar');
      setShowAddDialog(false);
      resetForm();
      fetchData();
    }

    setSubmitting(false);
  };

  const resetForm = () => {
    setSelectedCow('');
    setEventType('insemination');
    setEventTitle('');
    setEventDescription('');
  };

  const getEventsForDate = (date: Date) => {
    const dayEvents = events.filter(e => isSameDay(new Date(e.event_date), date));
    const dayHeatRecords = heatRecords.filter(h => isSameDay(new Date(h.detected_at), date));
    return { events: dayEvents, heatRecords: dayHeatRecords };
  };

  const getEventTypeInfo = (type: string) => {
    return EVENT_TYPES.find(e => e.id === type) || EVENT_TYPES[0];
  };

  const calculateOptimalBreeding = (heatDate: Date) => {
    // Optimal breeding window is typically 12-24 hours after heat detection
    return {
      start: addDays(heatDate, 0),
      end: addDays(heatDate, 1),
    };
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : { events: [], heatRecords: [] };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Breeding Calendar</h1>
            <p className="text-muted-foreground">Track breeding events and optimal timing</p>
          </div>
          <Button variant="hero" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {EVENT_TYPES.map(type => (
            <div key={type.id} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${type.color}`} />
              <span className="text-sm text-muted-foreground">{type.name}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {format(currentMonth, 'MMMM yyyy')}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-96 bg-secondary/50 rounded" />
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                      {day}
                    </div>
                  ))}
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="p-2" />
                  ))}
                  {daysInMonth.map(day => {
                    const { events: dayEvents, heatRecords: dayHeat } = getEventsForDate(day);
                    const hasEvents = dayEvents.length > 0 || dayHeat.length > 0;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`p-2 min-h-[80px] rounded-lg border transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-transparent hover:border-border hover:bg-secondary/50'
                        } ${isToday ? 'ring-2 ring-primary/30' : ''}`}
                      >
                        <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                        <div className="mt-1 space-y-0.5">
                          {dayHeat.slice(0, 2).map(heat => (
                            <div
                              key={heat.id}
                              className="text-xs px-1 py-0.5 rounded bg-red-500 text-white truncate"
                            >
                              🔥 {heat.cows?.name}
                            </div>
                          ))}
                          {dayEvents.slice(0, 2).map(event => {
                            const typeInfo = getEventTypeInfo(event.event_type);
                            return (
                              <div
                                key={event.id}
                                className={`text-xs px-1 py-0.5 rounded ${typeInfo.color} text-white truncate`}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {(dayEvents.length + dayHeat.length) > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayEvents.length + dayHeat.length - 2} more
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedDateEvents.heatRecords.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Heat Detections</h4>
                  {selectedDateEvents.heatRecords.map(heat => {
                    const optimal = calculateOptimalBreeding(new Date(heat.detected_at));
                    return (
                      <div key={heat.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-2">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <span className="font-medium">{heat.cows?.name}</span>
                          <Badge className="bg-red-500">{heat.intensity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Detected: {format(new Date(heat.detected_at), 'h:mm a')}
                        </p>
                        <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                          <p className="text-xs font-medium text-green-600">
                            Optimal Breeding Window:
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(optimal.start, 'MMM d, h:mm a')} - {format(optimal.end, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedDateEvents.events.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground mb-2">Scheduled Events</h4>
                  {selectedDateEvents.events.map(event => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    const Icon = typeInfo.icon;
                    return (
                      <div key={event.id} className="p-3 rounded-lg bg-secondary/50 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-6 w-6 rounded ${typeInfo.color} flex items-center justify-center`}>
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                          <span className="font-medium">{event.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {event.cows?.name} ({event.cows?.tag_number})
                        </p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        )}
                        <Badge variant="outline" className="mt-2 capitalize">{event.status}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedDateEvents.events.length === 0 && selectedDateEvents.heatRecords.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No events on this date</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4" /> Add Event
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Add Event Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Breeding Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Cow *</Label>
                <Select value={selectedCow} onValueChange={setSelectedCow}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a cow" />
                  </SelectTrigger>
                  <SelectContent>
                    {cows.map(cow => (
                      <SelectItem key={cow.id} value={cow.id}>
                        {cow.name} ({cow.tag_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <div className="border rounded-lg p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="mx-auto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title (optional)</Label>
                <Input
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={eventDescription}
                  onChange={e => setEventDescription(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEvent} disabled={submitting || !selectedCow || !selectedDate}>
                {submitting ? 'Adding...' : 'Add Event'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}