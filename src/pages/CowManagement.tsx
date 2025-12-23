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
import { Plus, Search, Beef, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Cow {
  id: string;
  name: string;
  tag_number: string;
  breed: string | null;
  date_of_birth: string | null;
  weight: number | null;
  status: string;
  notes: string | null;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-status-healthy text-white',
  pregnant: 'bg-status-pregnant text-white',
  sick: 'bg-status-sick text-white',
  in_heat: 'bg-status-heat text-white',
};

export default function CowManagement() {
  const { user } = useAuth();
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCow, setEditingCow] = useState<Cow | null>(null);
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
    fetchCows();
  }, [user]);

  async function fetchCows() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('cows')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load cows');
      return;
    }

    setCows(data || []);
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
            <h1 className="font-display text-3xl font-bold text-foreground">Cow Management</h1>
            <p className="text-muted-foreground">Manage your herd information</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="hero">
                <Plus className="h-4 w-4" />
                Add Cow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editingCow ? 'Edit Cow' : 'Add New Cow'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Bessie"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tag Number *</Label>
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
                    <Label>Breed</Label>
                    <Input
                      value={formData.breed}
                      onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                      placeholder="Holstein"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
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
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthy">Healthy</SelectItem>
                        <SelectItem value="pregnant">Pregnant</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                        <SelectItem value="in_heat">In Heat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  {editingCow ? 'Update Cow' : 'Add Cow'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or tag..."
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
                {searchTerm ? 'No cows found' : 'No cows yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Try a different search term' : 'Add your first cow to get started'}
              </p>
              {!searchTerm && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Cow
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
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Beef className="h-6 w-6 text-primary" />
                      </div>
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
                        <span className="text-muted-foreground">Breed</span>
                        <span className="text-foreground">{cow.breed}</span>
                      </div>
                    )}
                    {cow.weight && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight</span>
                        <span className="text-foreground">{cow.weight} kg</span>
                      </div>
                    )}
                    {cow.date_of_birth && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Born</span>
                        <span className="text-foreground">
                          {new Date(cow.date_of_birth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(cow)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
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
    </DashboardLayout>
  );
}
