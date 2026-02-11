import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, ShieldCheck, ShieldX, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  user_id: string;
  full_name: string | null;
  farm_name: string | null;
  roles: AppRole[];
}

export function AdminRoleManagement() {
  const { t } = useLanguage();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, farm_name'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const roleMap = new Map<string, AppRole[]>();
      (roles || []).forEach(r => {
        const existing = roleMap.get(r.user_id) || [];
        existing.push(r.role);
        roleMap.set(r.user_id, existing);
      });

      const combined: UserWithRole[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name,
        farm_name: p.farm_name,
        roles: roleMap.get(p.user_id) || [],
      }));

      setUsersWithRoles(combined);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error(t('failedToFetchRoles'));
    }
    setLoading(false);
  };

  const assignRole = async (userId: string, role: AppRole) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (error) {
      if (error.code === '23505') {
        toast.error(t('roleAlreadyAssigned'));
      } else {
        console.error('Error assigning role:', error);
        toast.error(t('failedToAssignRole'));
      }
    } else {
      toast.success(t('roleAssigned'));
      fetchUsersAndRoles();
    }
    setActionLoading(null);
  };

  const removeRole = async (userId: string, role: AppRole) => {
    setActionLoading(userId);
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      console.error('Error removing role:', error);
      toast.error(t('failedToRemoveRole'));
    } else {
      toast.success(t('roleRemoved'));
      fetchUsersAndRoles();
    }
    setActionLoading(null);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'admin': return 'destructive' as const;
      case 'moderator': return 'default' as const;
      default: return 'secondary' as const;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          {t('roleManagement')}
        </CardTitle>
        <CardDescription>{t('roleManagementDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adminName')}</TableHead>
              <TableHead>{t('adminFarmName')}</TableHead>
              <TableHead>{t('currentRoles')}</TableHead>
              <TableHead>{t('assignRole')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersWithRoles.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">
                  {user.full_name || t('notSet')}
                </TableCell>
                <TableCell>{user.farm_name || t('notSet')}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.length === 0 ? (
                      <Badge variant="outline">{t('noRoles')}</Badge>
                    ) : (
                      user.roles.map((role) => (
                        <Badge
                          key={role}
                          variant={getRoleBadgeVariant(role)}
                          className="flex items-center gap-1 cursor-pointer hover:opacity-80"
                          onClick={() => removeRole(user.user_id, role)}
                          title={t('clickToRemove')}
                        >
                          {role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                          {role}
                          <ShieldX className="h-3 w-3 ml-1" />
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    disabled={actionLoading === user.user_id}
                    onValueChange={(value) => assignRole(user.user_id, value as AppRole)}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder={t('selectRole')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('admin')}</SelectItem>
                      <SelectItem value="moderator">{t('moderator')}</SelectItem>
                      <SelectItem value="user">{t('userRole')}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {usersWithRoles.length === 0 && (
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
  );
}
