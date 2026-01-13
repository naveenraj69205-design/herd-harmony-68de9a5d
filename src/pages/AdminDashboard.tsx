import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Milk, MapPin, PawPrint, Shield, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  farm_name: string | null;
  location: string | null;
  created_at: string;
}

interface CowData {
  id: string;
  name: string;
  tag_number: string;
  breed: string | null;
  status: string | null;
  user_id: string;
  created_at: string;
  user_profile?: UserProfile;
}

interface MilkProductionData {
  id: string;
  cow_id: string;
  quantity_liters: number;
  recorded_at: string;
  user_id: string;
  cow_name?: string;
  user_profile?: UserProfile;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cows, setCows] = useState<CowData[]>([]);
  const [milkProduction, setMilkProduction] = useState<MilkProductionData[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCows: 0,
    totalMilkToday: 0,
    activeLocations: 0,
  });

  useEffect(() => {
    if (user) {
      checkAdminRole();
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const checkAdminRole = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (error) {
      console.error('Error checking admin role:', error);
      setIsAdmin(false);
    } else {
      setIsAdmin(data);
    }
    setLoading(false);
  };

  const fetchAllData = async () => {
    try {
      // Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      setUsers(profilesData || []);

      // Fetch all cows
      const { data: cowsData, error: cowsError } = await supabase
        .from('cows')
        .select('*')
        .order('created_at', { ascending: false });

      if (cowsError) throw cowsError;

      // Map cows with user profiles
      const cowsWithProfiles = (cowsData || []).map(cow => ({
        ...cow,
        user_profile: profilesData?.find(p => p.user_id === cow.user_id)
      }));
      setCows(cowsWithProfiles);

      // Fetch milk production
      const { data: milkData, error: milkError } = await supabase
        .from('milk_production')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (milkError) throw milkError;

      // Map milk production with cow names and user profiles
      const milkWithDetails = (milkData || []).map(milk => {
        const cow = cowsData?.find(c => c.id === milk.cow_id);
        return {
          ...milk,
          cow_name: cow?.name || 'Unknown',
          user_profile: profilesData?.find(p => p.user_id === milk.user_id)
        };
      });
      setMilkProduction(milkWithDetails);

      // Calculate stats
      const uniqueLocations = new Set(profilesData?.filter(p => p.location).map(p => p.location)).size;
      const today = new Date().toISOString().split('T')[0];
      const todayMilk = (milkData || [])
        .filter(m => m.recorded_at.startsWith(today))
        .reduce((sum, m) => sum + Number(m.quantity_liters), 0);

      setStats({
        totalUsers: profilesData?.length || 0,
        totalCows: cowsData?.length || 0,
        totalMilkToday: todayMilk,
        activeLocations: uniqueLocations,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Failed to fetch data');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">{t('adminDashboard')}</h1>
            <p className="text-muted-foreground">{t('adminDashboardDesc')}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{t('registeredUsers')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCows')}</CardTitle>
              <PawPrint className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCows}</div>
              <p className="text-xs text-muted-foreground">{t('acrossAllFarms')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('todayMilk')}</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMilkToday.toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">{t('totalProduction')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('activeLocations')}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeLocations}</div>
              <p className="text-xs text-muted-foreground">{t('farmLocations')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different data views */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('users')}
            </TabsTrigger>
            <TabsTrigger value="cows" className="flex items-center gap-2">
              <PawPrint className="h-4 w-4" />
              {t('cows')}
            </TabsTrigger>
            <TabsTrigger value="milk" className="flex items-center gap-2">
              <Milk className="h-4 w-4" />
              {t('milkProduction')}
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>{t('allUsers')}</CardTitle>
                <CardDescription>{t('allUsersDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('adminName')}</TableHead>
                      <TableHead>{t('adminFarmName')}</TableHead>
                      <TableHead>{t('adminLocation')}</TableHead>
                      <TableHead>{t('joinedDate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || t('notSet')}
                        </TableCell>
                        <TableCell>{user.farm_name || t('notSet')}</TableCell>
                        <TableCell>
                          {user.location ? (
                            <Badge variant="outline" className="flex items-center gap-1 w-fit">
                              <MapPin className="h-3 w-3" />
                              {user.location}
                            </Badge>
                          ) : (
                            t('notSet')
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {t('noUsersFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cows Tab */}
          <TabsContent value="cows">
            <Card>
              <CardHeader>
                <CardTitle>{t('allCows')}</CardTitle>
                <CardDescription>{t('allCowsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('adminCowName')}</TableHead>
                      <TableHead>{t('adminTagNumber')}</TableHead>
                      <TableHead>{t('adminBreed')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead>{t('owner')}</TableHead>
                      <TableHead>{t('addedDate')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cows.map((cow) => (
                      <TableRow key={cow.id}>
                        <TableCell className="font-medium">{cow.name}</TableCell>
                        <TableCell>{cow.tag_number}</TableCell>
                        <TableCell>{cow.breed || t('notSet')}</TableCell>
                        <TableCell>
                          <Badge variant={cow.status === 'healthy' ? 'default' : 'destructive'}>
                            {cow.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {cow.user_profile?.full_name || cow.user_profile?.farm_name || t('unknown')}
                        </TableCell>
                        <TableCell>
                          {new Date(cow.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {cows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          {t('noCowsFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Milk Production Tab */}
          <TabsContent value="milk">
            <Card>
              <CardHeader>
                <CardTitle>{t('allMilkProduction')}</CardTitle>
                <CardDescription>{t('allMilkProductionDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('adminCowName')}</TableHead>
                      <TableHead>{t('adminQuantity')}</TableHead>
                      <TableHead>{t('owner')}</TableHead>
                      <TableHead>{t('recordedAt')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {milkProduction.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.cow_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <TrendingUp className="h-3 w-3" />
                            {record.quantity_liters}L
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.user_profile?.full_name || record.user_profile?.farm_name || t('unknown')}
                        </TableCell>
                        <TableCell>
                          {new Date(record.recorded_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {milkProduction.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {t('noMilkRecordsFound')}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
