import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Plus, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function HeatDetection() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('heat_records')
      .select('*, cows(name, tag_number)')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false })
      .then(({ data }) => {
        setRecords(data || []);
        setLoading(false);
      });
  }, [user]);

  const intensityColors: Record<string, string> = {
    low: 'bg-yellow-500',
    medium: 'bg-orange-500',
    high: 'bg-red-500',
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Heat Detection</h1>
            <p className="text-muted-foreground">Monitor and track heat cycles</p>
          </div>
          <Button variant="hero">
            <Plus className="h-4 w-4" /> Record Heat
          </Button>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => <Card key={i}><CardContent className="h-24" /></Card>)}
          </div>
        ) : records.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="p-12 text-center">
              <Thermometer className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display text-xl font-semibold mb-2">No heat records yet</h3>
              <p className="text-muted-foreground">Start tracking heat cycles by adding cows first.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {records.map(record => (
              <Card key={record.id} className="shadow-soft">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-status-heat/10 flex items-center justify-center">
                      <Thermometer className="h-6 w-6 text-status-heat" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{record.cows?.name}</h3>
                      <p className="text-sm text-muted-foreground">{record.cows?.tag_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={intensityColors[record.intensity]}>{record.intensity}</Badge>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(record.detected_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
