import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sun, Moon, User, MapPin, Globe, Bell } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  
  const [fullName, setFullName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [farmLocation, setFarmLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, farm_name')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFullName(data.full_name || '');
        setFarmName(data.farm_name || '');
      }
      
      // Get farm location from localStorage for now
      const savedLocation = localStorage.getItem('farm-location');
      if (savedLocation) setFarmLocation(savedLocation);
      
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: fullName, 
        farm_name: farmName 
      })
      .eq('user_id', user.id);

    // Save farm location to localStorage
    localStorage.setItem('farm-location', farmLocation);

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile saved successfully');
    }
    
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">{t('settings')}</h1>
          <p className="text-muted-foreground">{t('settingsDesc')}</p>
        </div>

        {/* Profile Section */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('fullName')}</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmName">{t('farmName')}</Label>
              <Input
                id="farmName"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="Enter your farm name"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="farmLocation" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {t('farmLocation')}
              </Label>
              <Input
                id="farmLocation"
                value={farmLocation}
                onChange={(e) => setFarmLocation(e.target.value)}
                placeholder="Enter your farm location"
                disabled={loading}
              />
            </div>
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving || loading}
              className="w-full sm:w-auto"
            >
              {saving ? 'Saving...' : t('saveChanges')}
            </Button>
          </CardContent>
        </Card>

        {/* Language Section */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('language')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t('selectLanguage')}</Label>
              <Select value={language} onValueChange={(value: 'en' | 'es' | 'fr' | 'sw' | 'ta' | 'hi') => setLanguage(value)}>
                <SelectTrigger className="w-full sm:w-[280px]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="sw">Kiswahili</SelectItem>
                  <SelectItem value="ta">தமிழ் (Tamil)</SelectItem>
                  <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications Section */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('pushNotifications')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <div>
                  <Label className="text-foreground font-medium">{t('enableNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {isSupported ? t('notificationsSupportedDesc') : t('notificationsNotSupported')}
                  </p>
                </div>
              </div>
              <Switch 
                checked={isSubscribed} 
                onCheckedChange={(checked) => checked ? subscribe() : unsubscribe()}
                disabled={!isSupported}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Section */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="font-display">{t('appearance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <Label className="text-foreground font-medium">{t('darkMode')}</Label>
                  <p className="text-sm text-muted-foreground">{t('toggleDarkTheme')}</p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
