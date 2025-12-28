import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Milk, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface MilkRecord {
  id: string;
  recorded_at: string;
  quantity_liters: number;
  quality_grade: string | null;
  fat_percentage: number | null;
  protein_percentage: number | null;
  sensor_id: string | null;
  is_automatic: boolean;
}

interface MilkProductionDialogProps {
  cowId: string;
  cowName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MilkProductionDialog({ cowId, cowName, open, onOpenChange }: MilkProductionDialogProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<MilkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    quantity_liters: '',
    quality_grade: 'A',
    fat_percentage: '',
    protein_percentage: '',
  });

  useEffect(() => {
    if (open && cowId) {
      fetchRecords();
      
      // Subscribe to realtime updates
      const channel = supabase
        .channel(`milk-production-${cowId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'milk_production',
            filter: `cow_id=eq.${cowId}`,
          },
          (payload) => {
            setRecords(prev => [payload.new as MilkRecord, ...prev]);
            toast.info('New milk production recorded by sensor');
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, cowId]);

  async function fetchRecords() {
    setLoading(true);
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const { data, error } = await supabase
      .from('milk_production')
      .select('*')
      .eq('cow_id', cowId)
      .gte('recorded_at', thirtyDaysAgo.toISOString())
      .order('recorded_at', { ascending: false });

    if (error) {
      toast.error('Failed to load milk production records');
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('milk_production').insert({
      user_id: user.id,
      cow_id: cowId,
      quantity_liters: parseFloat(formData.quantity_liters),
      quality_grade: formData.quality_grade,
      fat_percentage: formData.fat_percentage ? parseFloat(formData.fat_percentage) : null,
      protein_percentage: formData.protein_percentage ? parseFloat(formData.protein_percentage) : null,
      is_automatic: false,
    });

    if (error) {
      toast.error('Failed to add milk production record');
    } else {
      toast.success('Milk production recorded');
      setShowForm(false);
      resetForm();
      fetchRecords();
    }
  }

  function resetForm() {
    setFormData({
      quantity_liters: '',
      quality_grade: 'A',
      fat_percentage: '',
      protein_percentage: '',
    });
  }

  // Calculate statistics
  const totalLiters = records.reduce((sum, r) => sum + Number(r.quantity_liters), 0);
  const avgLiters = records.length > 0 ? totalLiters / records.length : 0;
  const todayRecords = records.filter(r => {
    const recordDate = new Date(r.recorded_at);
    return recordDate >= startOfDay(new Date()) && recordDate <= endOfDay(new Date());
  });
  const todayTotal = todayRecords.reduce((sum, r) => sum + Number(r.quantity_liters), 0);

  // Prepare chart data
  const chartData = [...records]
    .reverse()
    .slice(-14)
    .map(r => ({
      date: format(new Date(r.recorded_at), 'MMM d'),
      liters: Number(r.quantity_liters),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Milk className="h-5 w-5" />
            Milk Production - {cowName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-500/10 text-center">
              <p className="text-2xl font-bold text-blue-500">{todayTotal.toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-2xl font-bold text-green-500">{avgLiters.toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground">Avg/Session</p>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 text-center">
              <p className="text-2xl font-bold text-purple-500">{totalLiters.toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground">30 Day Total</p>
            </div>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="h-48 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Production Trend (Last 14 Records)
              </p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="liters" stroke="hsl(220, 80%, 60%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!showForm && (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Record Manual Entry
            </Button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-secondary/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity (Liters) *</Label>
                  <Input
                    type="number"
                    step="0.1"
                    required
                    value={formData.quantity_liters}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity_liters: e.target.value }))}
                    placeholder="e.g., 25.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quality Grade</Label>
                  <Input
                    value={formData.quality_grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, quality_grade: e.target.value }))}
                    placeholder="A, B, C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fat %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.fat_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, fat_percentage: e.target.value }))}
                    placeholder="e.g., 3.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Protein %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.protein_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, protein_percentage: e.target.value }))}
                    placeholder="e.g., 3.2"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Save Record</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-12 bg-secondary/50 rounded" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Milk className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No milk production records yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {records.map(record => (
                  <div key={record.id} className="p-3 border rounded-lg bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Milk className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{Number(record.quantity_liters).toFixed(1)} Liters</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.recorded_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {record.quality_grade && (
                        <Badge variant="outline">Grade {record.quality_grade}</Badge>
                      )}
                      {record.is_automatic && (
                        <Badge className="bg-green-500">Auto</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}