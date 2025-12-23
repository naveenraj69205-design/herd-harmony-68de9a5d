import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Beef, Thermometer, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalCows: number;
  healthyCows: number;
  inHeatCows: number;
  recentHeatDetections: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCows: 0,
    healthyCows: 0,
    inHeatCows: 0,
    recentHeatDetections: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!user) return;

      const [cowsResult, heatResult] = await Promise.all([
        supabase.from('cows').select('id, status').eq('user_id', user.id),
        supabase.from('heat_records').select('id').eq('user_id', user.id)
          .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const cows = cowsResult.data || [];
      const heatRecords = heatResult.data || [];

      setStats({
        totalCows: cows.length,
        healthyCows: cows.filter(c => c.status === 'healthy').length,
        inHeatCows: cows.filter(c => c.status === 'in_heat').length,
        recentHeatDetections: heatRecords.length,
      });
      setLoading(false);
    }

    fetchStats();
  }, [user]);

  const statCards = [
    {
      title: 'Total Cows',
      value: stats.totalCows,
      icon: Beef,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Healthy',
      value: stats.healthyCows,
      icon: Activity,
      color: 'text-status-healthy',
      bgColor: 'bg-status-healthy/10',
    },
    {
      title: 'In Heat',
      value: stats.inHeatCows,
      icon: Thermometer,
      color: 'text-status-heat',
      bgColor: 'bg-status-heat/10',
    },
    {
      title: 'Heat Detections (7d)',
      value: stats.recentHeatDetections,
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your farm overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="font-display text-3xl font-bold text-foreground">
                      {loading ? '-' : stat.value}
                    </p>
                  </div>
                  <div className={`h-12 w-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Info */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-accent" />
                Quick Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <h4 className="font-semibold text-foreground mb-1">Optimal Breeding Time</h4>
                <p className="text-sm text-muted-foreground">
                  Best results are achieved 12-18 hours after heat detection. Use our AI to track cycles.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-1">AI Assistant Ready</h4>
                <p className="text-sm text-muted-foreground">
                  Ask our AI chatbot any questions about breeding, health, or herd management.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="font-display">Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { text: 'Add your first cow to the system', done: stats.totalCows > 0 },
                  { text: 'Record a heat detection event', done: stats.recentHeatDetections > 0 },
                  { text: 'Ask AI for breeding advice', done: false },
                  { text: 'Configure your farm settings', done: false },
                ].map((task, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                      task.done ? 'bg-primary text-primary-foreground' : 'border-2 border-muted-foreground'
                    }`}>
                      {task.done && <span className="text-xs">✓</span>}
                    </div>
                    <span className={`text-sm ${task.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
