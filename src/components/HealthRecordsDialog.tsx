import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Stethoscope, Calendar, Pill } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HealthRecord {
  id: string;
  record_date: string;
  record_type: string;
  diagnosis: string | null;
  treatment: string | null;
  medications: string | null;
  veterinarian: string | null;
  cost: number | null;
  follow_up_date: string | null;
  notes: string | null;
}

interface HealthRecordsDialogProps {
  cowId: string;
  cowName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RECORD_TYPES = [
  'Vaccination',
  'Checkup',
  'Treatment',
  'Surgery',
  'Deworming',
  'Hoof Trimming',
  'Pregnancy Check',
  'Other'
];

const getRecordTypeKey = (type: string): string => {
  const keyMap: Record<string, string> = {
    'Vaccination': 'vaccination',
    'Checkup': 'checkup',
    'Treatment': 'treatment',
    'Surgery': 'surgery',
    'Deworming': 'deworming',
    'Hoof Trimming': 'hoofTrimming',
    'Pregnancy Check': 'pregnancyCheck',
    'Other': 'other'
  };
  return keyMap[type] || type.toLowerCase();
};

export function HealthRecordsDialog({ cowId, cowName, open, onOpenChange }: HealthRecordsDialogProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    record_date: new Date().toISOString().split('T')[0],
    record_type: 'Checkup',
    diagnosis: '',
    treatment: '',
    medications: '',
    veterinarian: '',
    cost: '',
    follow_up_date: '',
    notes: '',
  });

  useEffect(() => {
    if (open && cowId) {
      fetchRecords();
    }
  }, [open, cowId]);

  async function fetchRecords() {
    setLoading(true);
    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('cow_id', cowId)
      .order('record_date', { ascending: false });

    if (error) {
      toast.error(t('failedLoadHealth'));
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase.from('health_records').insert({
      user_id: user.id,
      cow_id: cowId,
      record_date: formData.record_date,
      record_type: formData.record_type,
      diagnosis: formData.diagnosis || null,
      treatment: formData.treatment || null,
      medications: formData.medications || null,
      veterinarian: formData.veterinarian || null,
      cost: formData.cost ? parseFloat(formData.cost) : null,
      follow_up_date: formData.follow_up_date || null,
      notes: formData.notes || null,
    });

    if (error) {
      toast.error(t('failedAddHealth'));
    } else {
      toast.success(t('healthRecordAdded'));
      setShowForm(false);
      resetForm();
      fetchRecords();
    }
  }

  function resetForm() {
    setFormData({
      record_date: new Date().toISOString().split('T')[0],
      record_type: 'Checkup',
      diagnosis: '',
      treatment: '',
      medications: '',
      veterinarian: '',
      cost: '',
      follow_up_date: '',
      notes: '',
    });
  }

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      Vaccination: 'bg-blue-500',
      Checkup: 'bg-green-500',
      Treatment: 'bg-orange-500',
      Surgery: 'bg-red-500',
      Deworming: 'bg-purple-500',
      'Hoof Trimming': 'bg-yellow-500',
      'Pregnancy Check': 'bg-pink-500',
      Other: 'bg-gray-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            {t('healthRecordsTitle')} - {cowName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showForm && (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              {t('addHealthRecord')}
            </Button>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-secondary/20">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('date')} *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.record_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, record_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('recordType')} *</Label>
                  <Select
                    value={formData.record_type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, record_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECORD_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{t(getRecordTypeKey(type))}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('diagnosis')}</Label>
                  <Input
                    value={formData.diagnosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                    placeholder={t('enterDiagnosis')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('veterinarian')}</Label>
                  <Input
                    value={formData.veterinarian}
                    onChange={(e) => setFormData(prev => ({ ...prev, veterinarian: e.target.value }))}
                    placeholder={t('vetName')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('treatment')}</Label>
                <Textarea
                  value={formData.treatment}
                  onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
                  placeholder={t('describeTreatment')}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('medications')}</Label>
                  <Input
                    value={formData.medications}
                    onChange={(e) => setFormData(prev => ({ ...prev, medications: e.target.value }))}
                    placeholder={t('listMedications')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('cost')}</Label>
                  <Input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('followUpDate')}</Label>
                  <Input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('notes')}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t('additionalNotes')}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">{t('saveRecord')}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  {t('cancel')}
                </Button>
              </div>
            </form>
          )}

          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-24 bg-secondary/50 rounded" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('noHealthRecords')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map(record => (
                  <div key={record.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeBadgeColor(record.record_type)}>
                          {t(getRecordTypeKey(record.record_type))}
                        </Badge>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(record.record_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {record.cost && (
                        <span className="text-sm font-medium">${record.cost}</span>
                      )}
                    </div>
                    
                    {record.diagnosis && (
                      <p className="text-sm mb-1"><strong>{t('diagnosis')}:</strong> {record.diagnosis}</p>
                    )}
                    {record.treatment && (
                      <p className="text-sm mb-1"><strong>{t('treatment')}:</strong> {record.treatment}</p>
                    )}
                    {record.medications && (
                      <p className="text-sm mb-1 flex items-center gap-1">
                        <Pill className="h-3 w-3" />
                        <strong>{t('medications')}:</strong> {record.medications}
                      </p>
                    )}
                    {record.veterinarian && (
                      <p className="text-sm text-muted-foreground">{t('vet')}: {record.veterinarian}</p>
                    )}
                    {record.follow_up_date && (
                      <p className="text-sm text-muted-foreground">
                        {t('followUp')}: {format(new Date(record.follow_up_date), 'MMM d, yyyy')}
                      </p>
                    )}
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