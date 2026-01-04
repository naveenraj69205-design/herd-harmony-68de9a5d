import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Thermometer, 
  Scale, 
  Milk, 
  Radio, 
  Wifi, 
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface SensorStatus {
  type: string;
  name: string;
  icon: React.ReactNode;
  status: 'online' | 'offline' | 'warning';
  lastReading: string | null;
  lastValue: string | null;
  count: number;
}

export default function SensorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sensors, setSensors] = useState<SensorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchSensorStatus = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch latest heat records (activity sensors)
      const { data: heatData } = await supabase
        .from('heat_records')
        .select('sensor_type, sensor_reading, detected_at')
        .eq('user_id', user.id)
        .order('detected_at', { ascending: false })
        .limit(100);

      // Fetch latest weight readings
      const { data: weightData } = await supabase
        .from('weight_sensor_readings')
        .select('weight_kg, recorded_at, sensor_id')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Fetch latest milk production
      const { data: milkData } = await supabase
        .from('milk_production')
        .select('quantity_liters, recorded_at, sensor_id, is_automatic')
        .eq('user_id', user.id)
        .eq('is_automatic', true)
        .order('recorded_at', { ascending: false })
        .limit(50);

      // Fetch attendance records for biometric sensors
      const { data: attendanceData } = await supabase
        .from('attendance_records')
        .select('biometric_type, check_in')
        .eq('user_id', user.id)
        .order('check_in', { ascending: false })
        .limit(50);

      // Process sensor data
      const sensorTypes: Record<string, SensorStatus> = {};
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Process heat detection sensors
      if (heatData) {
        heatData.forEach(record => {
          const type = record.sensor_type || 'activity';
          if (!sensorTypes[type]) {
            sensorTypes[type] = {
              type,
              name: getSensorDisplayName(type),
              icon: getSensorIcon(type),
              status: 'offline',
              lastReading: null,
              lastValue: null,
              count: 0
            };
          }
          sensorTypes[type].count++;
          if (!sensorTypes[type].lastReading || new Date(record.detected_at) > new Date(sensorTypes[type].lastReading!)) {
            sensorTypes[type].lastReading = record.detected_at;
            sensorTypes[type].lastValue = record.sensor_reading?.toString() || 'N/A';
            sensorTypes[type].status = new Date(record.detected_at) > oneHourAgo ? 'online' : 'warning';
          }
        });
      }

      // Process weight sensors
      if (weightData && weightData.length > 0) {
        const latestWeight = weightData[0];
        sensorTypes['weight'] = {
          type: 'weight',
          name: t('weightSensor'),
          icon: <Scale className="h-6 w-6" />,
          status: new Date(latestWeight.recorded_at) > oneHourAgo ? 'online' : 'warning',
          lastReading: latestWeight.recorded_at,
          lastValue: `${latestWeight.weight_kg} kg`,
          count: weightData.length
        };
      }

      // Process milk sensors
      if (milkData && milkData.length > 0) {
        const latestMilk = milkData[0];
        sensorTypes['milk'] = {
          type: 'milk',
          name: t('milkSensor'),
          icon: <Milk className="h-6 w-6" />,
          status: new Date(latestMilk.recorded_at) > oneHourAgo ? 'online' : 'warning',
          lastReading: latestMilk.recorded_at,
          lastValue: `${latestMilk.quantity_liters} L`,
          count: milkData.length
        };
      }

      // Process biometric sensors
      if (attendanceData && attendanceData.length > 0) {
        const biometricTypes = [...new Set(attendanceData.map(a => a.biometric_type).filter(Boolean))];
        biometricTypes.forEach(type => {
          if (!type) return;
          const records = attendanceData.filter(a => a.biometric_type === type);
          const latest = records[0];
          sensorTypes[`biometric_${type}`] = {
            type: `biometric_${type}`,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Scanner`,
            icon: <Radio className="h-6 w-6" />,
            status: new Date(latest.check_in) > oneHourAgo ? 'online' : 'warning',
            lastReading: latest.check_in,
            lastValue: 'Active',
            count: records.length
          };
        });
      }

      // Add default sensors if no data
      if (Object.keys(sensorTypes).length === 0) {
        setSensors([
          {
            type: 'activity',
            name: t('activitySensor'),
            icon: <Activity className="h-6 w-6" />,
            status: 'offline',
            lastReading: null,
            lastValue: null,
            count: 0
          },
          {
            type: 'temperature',
            name: t('temperatureSensor'),
            icon: <Thermometer className="h-6 w-6" />,
            status: 'offline',
            lastReading: null,
            lastValue: null,
            count: 0
          },
          {
            type: 'weight',
            name: t('weightSensor'),
            icon: <Scale className="h-6 w-6" />,
            status: 'offline',
            lastReading: null,
            lastValue: null,
            count: 0
          },
          {
            type: 'milk',
            name: t('milkSensor'),
            icon: <Milk className="h-6 w-6" />,
            status: 'offline',
            lastReading: null,
            lastValue: null,
            count: 0
          }
        ]);
      } else {
        setSensors(Object.values(sensorTypes));
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching sensor status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensorStatus();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('sensor-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'heat_records' }, fetchSensorStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weight_sensor_readings' }, fetchSensorStatus)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milk_production' }, fetchSensorStatus)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const getSensorDisplayName = (type: string): string => {
    const names: Record<string, string> = {
      'activity': t('activitySensor'),
      'pedometer': t('pedometerSensor'),
      'neck_collar': t('neckCollarSensor'),
      'ear_tag': t('earTagSensor'),
      'body_temperature': t('temperatureSensor'),
      'vaginal_temperature': t('vaginalTempSensor'),
      'rumen_bolus': t('rumenBolusSensor'),
      'mounting_pressure': t('mountingSensor'),
      'tail_head': t('tailHeadSensor'),
      'rumination': t('ruminationSensor'),
      'milk_progesterone': t('progesteroneSensor')
    };
    return names[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const getSensorIcon = (type: string): React.ReactNode => {
    if (type.includes('temperature')) return <Thermometer className="h-6 w-6" />;
    if (type.includes('activity') || type.includes('pedometer')) return <Activity className="h-6 w-6" />;
    return <Radio className="h-6 w-6" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const onlineCount = sensors.filter(s => s.status === 'online').length;
  const warningCount = sensors.filter(s => s.status === 'warning').length;
  const offlineCount = sensors.filter(s => s.status === 'offline').length;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{t('sensorDashboard')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('lastUpdated')}: {format(lastRefresh, 'HH:mm:ss')}
            </p>
          </div>
          <Button onClick={fetchSensorStatus} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('online')}</p>
                  <p className="text-3xl font-bold text-green-600">{onlineCount}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-200 dark:border-yellow-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('warning')}</p>
                  <p className="text-3xl font-bold text-yellow-600">{warningCount}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('offline')}</p>
                  <p className="text-3xl font-bold text-red-600">{offlineCount}</p>
                </div>
                <WifiOff className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sensor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sensors.map((sensor) => (
            <Card key={sensor.type} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${getStatusColor(sensor.status)}`} />
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {sensor.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{sensor.name}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        {getStatusIcon(sensor.status)}
                        <span className="text-xs capitalize text-muted-foreground">
                          {t(sensor.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={sensor.status === 'online' ? 'default' : 'secondary'}>
                    {sensor.count} {t('readings')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {sensor.lastReading ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('lastReading')}:</span>
                      <span className="font-medium">{sensor.lastValue}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('time')}:</span>
                      <span className="font-medium">
                        {format(new Date(sensor.lastReading), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('noDataReceived')}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
