import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Beef, Edit, Trash2, Thermometer, Activity, Milk, Stethoscope, Scale } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { CowPhotoUpload } from '@/components/CowPhotoUpload';
import { MilkProductionDialog } from '@/components/MilkProductionDialog';
import { HealthRecordsDialog } from '@/components/HealthRecordsDialog';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface Cow {
  id: string;
  name: string;
  tag_number: string;
  breed: string | null;
  date_of_birth: string | null;
  weight: number | null;
  status: string;
  notes: string | null;
  image_url: string | null;
}

interface HeatRecord {
  id: string;
  cow_id: string;
  detected_at: string;
  intensity: string | null;
  sensor_type: string | null;
  sensor_reading: number | null;
  ai_confidence: number | null;
  symptoms: string[] | null;
}

interface MilkProduction {
  cow_id: string;
  total_liters: number;
  today_liters: number;
}

interface CowWithSensorData extends Cow {
  latestHeatRecord?: HeatRecord;
  milkProduction?: MilkProduction;
  latestWeight?: number;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-status-healthy text-white',
  pregnant: 'bg-status-pregnant text-white',
  sick: 'bg-status-sick text-white',
  in_heat: 'bg-status-heat text-white',
};

export default function CowManagement() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { showLocalNotification, permission } = usePushNotifications();
  const [cows, setCows] = useState<CowWithSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCow, setEditingCow] = useState<Cow | null>(null);
  const [selectedCowForMilk, setSelectedCowForMilk] = useState<CowWithSensorData | null>(null);
  const [selectedCowForHealth, setSelectedCowForHealth] = useState<CowWithSensorData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    tag_number: '',
    breed: '',
    date_of_birth: '',
    weight: '',
    status: 'healthy',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      fetchCows();
      
      // Subscribe to realtime updates for cows
      const cowsChannel = supabase
        .channel('cows-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cows',
          },
          () => {
            fetchCows();
          }
        )
        .subscribe();

      // Subscribe to weight sensor updates
      const weightChannel = supabase
        .channel('weight-sensor-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'weight_sensor_readings',
          },
          async (payload) => {
            const { cow_id, weight_kg } = payload.new as { cow_id: string; weight_kg: number };
            
            // Update cow weight in database
            await supabase
              .from('cows')
              .update({ weight: weight_kg })
              .eq('id', cow_id);
            
            // Update local state
            setCows(prev => prev.map(cow => 
              cow.id === cow_id ? { ...cow, weight: weight_kg, latestWeight: weight_kg } : cow
            ));
            
            toast.info(`Weight updated for cow: ${weight_kg} kg`);
            if (permission === 'granted') {
              showLocalNotification('Weight Sensor Update', `Cow weight updated: ${weight_kg} kg`);
            }
          }
        )
        .subscribe();

      // Subscribe to milk production updates
      const milkChannel = supabase
        .channel('milk-production-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'milk_production',
          },
          (payload) => {
            const { cow_id, quantity_liters, is_automatic } = payload.new as { cow_id: string; quantity_liters: number; is_automatic: boolean };
            
            if (is_automatic) {
              toast.info(`Milk production recorded: ${quantity_liters}L`);
              if (permission === 'granted') {
                showLocalNotification('Milk Sensor Update', `${quantity_liters}L recorded automatically`);
              }
            }
            
            fetchCows();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(cowsChannel);
        supabase.removeChannel(weightChannel);
        supabase.removeChannel(milkChannel);
      };
    }
  }, [user]);

  async function fetchCows() {
    if (!user) return;
    
    // Fetch cows
    const { data: cowsData, error: cowsError } = await supabase
      .from('cows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (cowsError) {
      toast.error('Failed to load cows');
      setLoading(false);
      return;
    }

    // Fetch latest heat records for each cow
    const { data: heatRecords } = await supabase
      .from('heat_records')
      .select('*')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false });

    // Fetch milk production data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: milkData } = await supabase
      .from('milk_production')
      .select('cow_id, quantity_liters, recorded_at')
      .eq('user_id', user.id);

    // Fetch latest weight readings
    const { data: weightData } = await supabase
      .from('weight_sensor_readings')
      .select('cow_id, weight_kg, recorded_at')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false });

    // Map data to cows
    const cowsWithSensorData: CowWithSensorData[] = (cowsData || []).map(cow => {
      const latestHeatRecord = heatRecords?.find(record => record.cow_id === cow.id);
      
      // Calculate milk production
      const cowMilkRecords = milkData?.filter(m => m.cow_id === cow.id) || [];
      const totalLiters = cowMilkRecords.reduce((sum, r) => sum + Number(r.quantity_liters), 0);
      const todayRecords = cowMilkRecords.filter(r => new Date(r.recorded_at) >= today);
      const todayLiters = todayRecords.reduce((sum, r) => sum + Number(r.quantity_liters), 0);
      
      // Get latest weight
      const latestWeightRecord = weightData?.find(w => w.cow_id === cow.id);
      
      return { 
        ...cow, 
        latestHeatRecord,
        milkProduction: {
          cow_id: cow.id,
          total_liters: totalLiters,
          today_liters: todayLiters,
        },
        latestWeight: latestWeightRecord ? Number(latestWeightRecord.weight_kg) : cow.weight,
      };
    });

    setCows(cowsWithSensorData);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const cowData = {
      user_id: user.id,
      name: formData.name,
      tag_number: formData.tag_number,
      breed: formData.breed || null,
      date_of_birth: formData.date_of_birth || null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      status: formData.status,
      notes: formData.notes || null,
    };

    if (editingCow) {
      const { error } = await supabase
        .from('cows')
        .update(cowData)
        .eq('id', editingCow.id);

      if (error) {
        toast.error('Failed to update cow');
        return;
      }
      toast.success('Cow updated successfully');
    } else {
      const { error } = await supabase
        .from('cows')
        .insert([cowData]);

      if (error) {
        toast.error('Failed to add cow');
        return;
      }
      toast.success('Cow added successfully');
    }

    setDialogOpen(false);
    resetForm();
    fetchCows();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('cows')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete cow');
      return;
    }

    toast.success('Cow deleted');
    fetchCows();
  }

  function resetForm() {
    setFormData({
      name: '',
      tag_number: '',
      breed: '',
      date_of_birth: '',
      weight: '',
      status: 'healthy',
      notes: '',
    });
    setEditingCow(null);
  }

  function openEditDialog(cow: Cow) {
    setEditingCow(cow);
    setFormData({
      name: cow.name,
      tag_number: cow.tag_number,
      breed: cow.breed || '',
      date_of_birth: cow.date_of_birth || '',
      weight: cow.weight?.toString() || '',
      status: cow.status,
      notes: cow.notes || '',
    });
    setDialogOpen(true);
  }

  const filteredCows = cows.filter(cow =>
    cow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cow.tag_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">{t('cowManagement')}</h1>
            <p className="text-muted-foreground">{t('cowManagementDesc')}</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4" />
                {t('addCow')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingCow ? t('editCow') : t('addNewCow')}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {editingCow && (
                    <CowPhotoUpload
                      cowId={editingCow.id}
                      currentImageUrl={editingCow.image_url}
                      onUploadComplete={(url) => {
                        setEditingCow(prev => prev ? { ...prev, image_url: url } : null);
                      }}
                    />
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('cowName')} *</Label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Bessie"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('tagNumber')} *</Label>
                      <Input
                        required
                        value={formData.tag_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, tag_number: e.target.value }))}
                        placeholder="COW-001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('breed')}</Label>
                      <Input
                        value={formData.breed}
                        onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                        placeholder="Holstein"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('weight')} (kg)</Label>
                      <Input
                        type="number"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('dateOfBirth')}</Label>
                      <Input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('status')}</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="healthy">{t('healthy')}</SelectItem>
                          <SelectItem value="pregnant">{t('pregnant')}</SelectItem>
                          <SelectItem value="sick">{t('sick')}</SelectItem>
                          <SelectItem value="in_heat">{t('inHeat')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t('notes')}</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {editingCow ? t('updateCow') : t('addCow')}
                  </Button>
                </form>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchByNameOrTag')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Cows Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 h-48" />
              </Card>
            ))}
          </div>
        ) : filteredCows.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="p-12 text-center">
              <Beef className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">
                {searchTerm ? t('noCowsFound') : t('noCowsYet')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? t('tryDifferentSearch') : t('addFirstCowDesc')}
              </p>
              {!searchTerm && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addFirstCow')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCows.map(cow => (
              <Card key={cow.id} className="shadow-soft hover:shadow-medium transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {cow.image_url ? (
                        <img 
                          src={cow.image_url} 
                          alt={cow.name}
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Beef className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-display font-semibold text-foreground">{cow.name}</h3>
                        <p className="text-sm text-muted-foreground">{cow.tag_number}</p>
                      </div>
                    </div>
                    <Badge className={statusColors[cow.status]}>
                      {cow.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {cow.breed && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('breed')}</span>
                        <span className="text-foreground">{cow.breed}</span>
                      </div>
                    )}
                    {(cow.latestWeight || cow.weight) && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Scale className="h-3 w-3" />
                          {t('weight')}
                        </span>
                        <span className="text-foreground">{cow.latestWeight || cow.weight} kg</span>
                      </div>
                    )}
                    {cow.date_of_birth && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('born')}</span>
                        <span className="text-foreground">
                          {new Date(cow.date_of_birth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Milk Production Section */}
                  {cow.milkProduction && (cow.milkProduction.total_liters > 0 || cow.milkProduction.today_liters > 0) && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Milk className="h-4 w-4 text-blue-500" />
                        {t('milkProduction')}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 rounded bg-blue-500/10 text-center">
                          <p className="font-bold text-blue-500">{cow.milkProduction.today_liters.toFixed(1)}L</p>
                          <p className="text-xs text-muted-foreground">{t('today')}</p>
                        </div>
                        <div className="p-2 rounded bg-purple-500/10 text-center">
                          <p className="font-bold text-purple-500">{cow.milkProduction.total_liters.toFixed(1)}L</p>
                          <p className="text-xs text-muted-foreground">{t('total')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sensor Data Section */}
                  {cow.latestHeatRecord && (
                    <div className="mt-4 pt-4 border-t border-border space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Activity className="h-4 w-4 text-primary" />
                        {t('latestSensorData')}
                      </div>
                      <div className="space-y-1 text-sm">
                        {cow.latestHeatRecord.sensor_type && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('sensor')}</span>
                            <span className="text-foreground capitalize">{cow.latestHeatRecord.sensor_type.replace('_', ' ')}</span>
                          </div>
                        )}
                        {cow.latestHeatRecord.sensor_reading !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('reading')}</span>
                            <span className="text-foreground">{cow.latestHeatRecord.sensor_reading}</span>
                          </div>
                        )}
                        {cow.latestHeatRecord.intensity && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('heatIntensity')}</span>
                            <Badge variant={
                              cow.latestHeatRecord.intensity === 'high' ? 'destructive' :
                              cow.latestHeatRecord.intensity === 'medium' ? 'default' : 'secondary'
                            } className="text-xs">
                              {cow.latestHeatRecord.intensity}
                            </Badge>
                          </div>
                        )}
                        {cow.latestHeatRecord.ai_confidence !== null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('aiConfidence')}</span>
                            <span className="text-foreground">{Math.round(cow.latestHeatRecord.ai_confidence * 100)}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('detected')}</span>
                          <span className="text-foreground text-xs">
                            {new Date(cow.latestHeatRecord.detected_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedCowForMilk(cow)}
                    >
                      <Milk className="h-4 w-4" />
                      {t('milk')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSelectedCowForHealth(cow)}
                    >
                      <Stethoscope className="h-4 w-4" />
                      {t('health')}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => openEditDialog(cow)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cow.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Milk Production Dialog */}
      <MilkProductionDialog
        cowId={selectedCowForMilk?.id || ''}
        cowName={selectedCowForMilk?.name || ''}
        open={!!selectedCowForMilk}
        onOpenChange={(open) => !open && setSelectedCowForMilk(null)}
      />

      {/* Health Records Dialog */}
      <HealthRecordsDialog
        cowId={selectedCowForHealth?.id || ''}
        cowName={selectedCowForHealth?.name || ''}
        open={!!selectedCowForHealth}
        onOpenChange={(open) => !open && setSelectedCowForHealth(null)}
      />
    </DashboardLayout>
  );
}