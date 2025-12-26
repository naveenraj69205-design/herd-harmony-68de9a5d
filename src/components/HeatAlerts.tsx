import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Thermometer, Clock, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface HeatAlert {
  id: string;
  cow_id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  sensor_type: string | null;
  optimal_breeding_start: string | null;
  optimal_breeding_end: string | null;
  created_at: string;
  cows?: {
    name: string;
    tag_number: string;
  };
}

interface HeatAlertsProps {
  onAlertCount?: (count: number) => void;
}

export function HeatAlerts({ onAlertCount }: HeatAlertsProps) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<HeatAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAlerts();
    }
  }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('heat_alerts')
      .select('*, cows(name, tag_number)')
      .eq('user_id', user.id)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setAlerts(data as HeatAlert[]);
      onAlertCount?.(data.filter(a => !a.is_read).length);
    }
    setLoading(false);
  };

  const markAsRead = async (alertId: string) => {
    await supabase
      .from('heat_alerts')
      .update({ is_read: true })
      .eq('id', alertId);
    
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, is_read: true } : a))
    );
    onAlertCount?.(alerts.filter(a => !a.is_read && a.id !== alertId).length);
  };

  const dismissAlert = async (alertId: string) => {
    await supabase
      .from('heat_alerts')
      .update({ is_dismissed: true })
      .eq('id', alertId);
    
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    onAlertCount?.(alerts.filter(a => !a.is_read && a.id !== alertId).length);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      low: 'bg-yellow-500',
      medium: 'bg-orange-500',
      high: 'bg-red-500',
      critical: 'bg-red-600 animate-pulse',
    };
    return colors[severity] || 'bg-gray-500';
  };

  const getAlertIcon = (type: string) => {
    if (type === 'heat_detected') return Thermometer;
    if (type === 'optimal_breeding') return Clock;
    return Bell;
  };

  if (loading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Heat Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-secondary/50 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Heat Alerts
          {alerts.filter(a => !a.is_read).length > 0 && (
            <Badge className="bg-red-500">
              {alerts.filter(a => !a.is_read).length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const Icon = getAlertIcon(alert.alert_type);
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border transition-all ${
                    alert.is_read
                      ? 'bg-secondary/30 border-border'
                      : 'bg-primary/5 border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg ${getSeverityColor(alert.severity)} flex items-center justify-center`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{alert.title}</h4>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        {alert.optimal_breeding_start && (
                          <p className="text-xs text-green-600 mt-1">
                            Breed before: {format(new Date(alert.optimal_breeding_end || alert.optimal_breeding_start), 'MMM d, h:mm a')}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(alert.created_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => markAsRead(alert.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => dismissAlert(alert.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}