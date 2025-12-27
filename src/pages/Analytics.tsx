import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Beef, 
  Thermometer, 
  Baby, 
  Activity,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface Stats {
  totalCows: number;
  healthyCows: number;
  pregnantCows: number;
  inHeatCows: number;
  sickCows: number;
  totalHeatRecords: number;
  totalBreedingEvents: number;
  successfulInseminations: number;
}

interface MonthlyData {
  month: string;
  heatDetections: number;
  inseminations: number;
  calvings: number;
}

const COLORS = ['hsl(var(--status-healthy))', 'hsl(var(--status-pregnant))', 'hsl(var(--status-heat))', 'hsl(var(--status-sick))'];

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalCows: 0,
    healthyCows: 0,
    pregnantCows: 0,
    inHeatCows: 0,
    sickCows: 0,
    totalHeatRecords: 0,
    totalBreedingEvents: 0,
    successfulInseminations: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    // Fetch cows stats
    const { data: cows } = await supabase
      .from('cows')
      .select('status')
      .eq('user_id', user.id);

    // Fetch heat records
    const { data: heatRecords } = await supabase
      .from('heat_records')
      .select('detected_at')
      .eq('user_id', user.id);

    // Fetch breeding events
    const { data: breedingEvents } = await supabase
      .from('breeding_events')
      .select('event_type, event_date, status')
      .eq('user_id', user.id);

    // Calculate stats
    const cowStats = cows || [];
    setStats({
      totalCows: cowStats.length,
      healthyCows: cowStats.filter(c => c.status === 'healthy').length,
      pregnantCows: cowStats.filter(c => c.status === 'pregnant').length,
      inHeatCows: cowStats.filter(c => c.status === 'in_heat').length,
      sickCows: cowStats.filter(c => c.status === 'sick').length,
      totalHeatRecords: heatRecords?.length || 0,
      totalBreedingEvents: breedingEvents?.length || 0,
      successfulInseminations: breedingEvents?.filter(e => e.event_type === 'insemination' && e.status === 'completed').length || 0,
    });

    // Calculate monthly data for the last 6 months
    const last6Months: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthHeat = heatRecords?.filter(h => {
        const date = new Date(h.detected_at);
        return date >= monthStart && date <= monthEnd;
      }).length || 0;

      const monthInseminations = breedingEvents?.filter(e => {
        const date = new Date(e.event_date);
        return date >= monthStart && date <= monthEnd && e.event_type === 'insemination';
      }).length || 0;

      const monthCalvings = breedingEvents?.filter(e => {
        const date = new Date(e.event_date);
        return date >= monthStart && date <= monthEnd && e.event_type === 'actual_calving';
      }).length || 0;

      last6Months.push({
        month: format(monthDate, 'MMM'),
        heatDetections: monthHeat,
        inseminations: monthInseminations,
        calvings: monthCalvings,
      });
    }
    setMonthlyData(last6Months);
    setLoading(false);
  };

  const pieData = [
    { name: 'Healthy', value: stats.healthyCows },
    { name: 'Pregnant', value: stats.pregnantCows },
    { name: 'In Heat', value: stats.inHeatCows },
    { name: 'Sick', value: stats.sickCows },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your herd's breeding performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Beef className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalCows}</p>
                  <p className="text-sm text-muted-foreground">Total Cows</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <Thermometer className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalHeatRecords}</p>
                  <p className="text-sm text-muted-foreground">Heat Detections</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalBreedingEvents}</p>
                  <p className="text-sm text-muted-foreground">Breeding Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Baby className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.successfulInseminations}</p>
                  <p className="text-sm text-muted-foreground">Successful Inseminations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Herd Status Pie Chart */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Herd Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-64 bg-secondary/50 rounded" />
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Breeding Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-64 bg-secondary/50 rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="heatDetections" 
                      stroke="hsl(var(--status-heat))" 
                      name="Heat Detections"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="inseminations" 
                      stroke="hsl(220, 80%, 60%)" 
                      name="Inseminations"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calvings" 
                      stroke="hsl(var(--status-healthy))" 
                      name="Calvings"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Bar Chart */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Activity Overview (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse h-64 bg-secondary/50 rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="heatDetections" fill="hsl(var(--status-heat))" name="Heat Detections" />
                  <Bar dataKey="inseminations" fill="hsl(220, 80%, 60%)" name="Inseminations" />
                  <Bar dataKey="calvings" fill="hsl(var(--status-healthy))" name="Calvings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
