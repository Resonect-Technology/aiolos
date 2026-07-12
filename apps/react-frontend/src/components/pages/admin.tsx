import { DiagnosticsHistoryTable } from '@/components/molecules/tables/diagnostics-history-table';
import { AppSidebar } from '@/components/organisms/navigation/app-sidebar';
import { SiteHeader } from '@/components/organisms/navigation/site-header';
import { DiagnosticsPanel } from '@/components/organisms/panels/diagnostics-panel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CONFIG_PRESETS, type ConfigPreset } from '@/lib/admin-presets';
import {
  AdminApiError,
  getSession,
  getStationConfig,
  login,
  logout,
  saveStationConfig,
  setSystemConfig,
  type StationConfig,
} from '@/lib/api/admin';
import { getSystemConfig, parseBooleanConfig } from '@/lib/api/system-config';
import {
  AlertTriangle,
  HardHat,
  Loader2,
  LogOut,
  Save,
  Settings2,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type NumericConfigKey = Exclude<keyof StationConfig, 'remoteOta'>;
type ConfigFormValues = Record<NumericConfigKey, string>;
type SessionState = 'loading' | 'anonymous' | 'authenticated';

interface ConfigField {
  key: NumericConfigKey;
  label: string;
  hint: string;
}

const CONFIG_FIELDS: ConfigField[] = [
  { key: 'tempInterval', label: 'Temperature interval', hint: 'ms between temperature reports' },
  {
    key: 'windSendInterval',
    label: 'Wind send interval',
    hint: 'ms between wind reports; ≤ 5000 switches to livestream mode',
  },
  {
    key: 'windSampleInterval',
    label: 'Wind sample interval',
    hint: 'ms between samples in averaged mode',
  },
  { key: 'diagInterval', label: 'Diagnostics interval', hint: 'ms between diagnostics reports' },
  { key: 'timeInterval', label: 'Time sync interval', hint: 'ms between network clock syncs' },
  {
    key: 'restartInterval',
    label: 'Restart interval',
    hint: 'seconds between scheduled restarts (firmware floor: 1 hour)',
  },
  { key: 'sleepStartHour', label: 'Sleep start hour', hint: 'station-local hour 0–23' },
  { key: 'sleepEndHour', label: 'Sleep end hour', hint: 'station-local hour 0–23' },
  { key: 'otaHour', label: 'OTA window hour', hint: 'daily OTA window start hour' },
  { key: 'otaMinute', label: 'OTA window minute', hint: 'OTA window start minute 0–59' },
  { key: 'otaDuration', label: 'OTA window duration', hint: 'minutes the OTA AP stays open' },
  {
    key: 'utcOffsetMinutes',
    label: 'UTC offset',
    hint: 'station-local timezone offset in minutes (Vasiliki: 180)',
  },
  {
    key: 'livestreamStartHour',
    label: 'Livestream start hour',
    hint: 'morning slow mode ends at this station-local hour',
  },
  {
    key: 'lowBatteryThreshold',
    label: 'Low battery threshold',
    hint: 'volts; below this the station forces low-power mode',
  },
];

const emptyFormValues = (): ConfigFormValues => {
  const values = {} as ConfigFormValues;
  for (const field of CONFIG_FIELDS) values[field.key] = '';
  return values;
};

const configToFormValues = (config: StationConfig): ConfigFormValues => {
  const values = {} as ConfigFormValues;
  for (const field of CONFIG_FIELDS) {
    const value = config[field.key];
    values[field.key] = value === null || value === undefined ? '' : String(value);
  }
  return values;
};

/** Build the POST payload: filled fields become numbers, empty fields are omitted. */
const formValuesToPayload = (values: ConfigFormValues): Partial<StationConfig> => {
  const payload: Partial<StationConfig> = {};
  for (const field of CONFIG_FIELDS) {
    const raw = values[field.key].trim();
    if (raw !== '') payload[field.key] = Number(raw);
  }
  return payload;
};

export function AdminPage() {
  const stationId = 'vasiliki-001';

  const [session, setSession] = useState<SessionState>('loading');

  useEffect(() => {
    getSession()
      .then((authenticated) => setSession(authenticated ? 'authenticated' : 'anonymous'))
      .catch(() => setSession('anonymous'));
  }, []);

  // Shared 401 handler: any expired-session write flips back to the login card
  const handleApiError = useCallback((error: unknown, fallback: string) => {
    if (error instanceof AdminApiError && error.status === 401) {
      setSession('anonymous');
      toast.error('Session expired — please log in again.');
    } else {
      toast.error(error instanceof Error ? error.message : fallback);
    }
  }, []);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {session === 'loading' && (
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            )}

            {session === 'anonymous' && <LoginCard onSuccess={() => setSession('authenticated')} />}

            {session === 'authenticated' && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-primary h-5 w-5" />
                    <h2 className="text-2xl font-bold">Station Admin</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      logout()
                        .catch(() => {})
                        .finally(() => setSession('anonymous'));
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </Button>
                </div>

                <Tabs defaultValue="configuration">
                  <TabsList>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
                  </TabsList>

                  <TabsContent value="configuration" className="flex flex-col gap-4 md:gap-6">
                    <StationConfigCard stationId={stationId} onApiError={handleApiError} />
                    <ConstructionModeCard onApiError={handleApiError} />
                  </TabsContent>

                  <TabsContent value="monitoring" className="flex flex-col gap-4 md:gap-6">
                    <Card>
                      <DiagnosticsPanel stationId={stationId} />
                    </Card>
                    <DiagnosticsHistoryTable stationId={stationId} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>

          <footer className="text-muted-foreground mt-12 p-4 text-center text-sm">
            <p>Resonect Technology s.r.o. &copy; {new Date().getFullYear()}</p>
          </footer>
        </div>
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  );
}

function LoginCard({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof AdminApiError && err.status === 401
          ? 'Invalid password.'
          : 'Login failed. Please try again.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="mx-auto mt-12 w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="text-primary h-4 w-4" />
          Admin login
        </CardTitle>
        <CardDescription>Enter the admin password to manage the station.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit" className="w-full" disabled={pending || password.length === 0}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Log in
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function StationConfigCard({
  stationId,
  onApiError,
}: {
  stationId: string;
  onApiError: (error: unknown, fallback: string) => void;
}) {
  const [values, setValues] = useState<ConfigFormValues>(emptyFormValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const config = await getStationConfig(stationId);
      setValues(configToFormValues(config));
    } catch (error) {
      onApiError(error, 'Failed to load station config');
    } finally {
      setLoading(false);
    }
  }, [stationId, onApiError]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const save = async (payload: Partial<StationConfig>, successMessage: string) => {
    setSaving(true);
    try {
      await saveStationConfig(stationId, payload);
      toast.success(successMessage);
      await loadConfig();
    } catch (error) {
      onApiError(error, 'Failed to save station config');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => save(formValuesToPayload(values), 'Configuration saved.');

  const applyPreset = (preset: ConfigPreset) => {
    const merged = { ...formValuesToPayload(values), ...preset.values };
    return save(merged, `Preset "${preset.name}" applied.`);
  };

  const triggerOta = () =>
    save(
      { ...formValuesToPayload(values), remoteOta: true },
      'OTA window requested. The station opens its access point on the next config fetch.',
    );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="text-primary h-4 w-4" />
            Station configuration
          </CardTitle>
          <CardDescription>
            The station fetches this configuration every 5 minutes. Empty fields are not sent — the
            firmware keeps its current value for them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {CONFIG_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`config-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`config-${field.key}`}
                    type="number"
                    step="any"
                    value={values[field.key]}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                  />
                  <p className="text-muted-foreground text-xs">{field.hint}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 pt-4">
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save configuration
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={loading || saving}>
                <UploadCloud className="h-4 w-4" />
                Trigger OTA window
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Open an OTA update window?</AlertDialogTitle>
                <AlertDialogDescription>
                  This saves the current configuration with the remote-OTA flag set. On its next
                  config fetch the station opens its Wi-Fi access point for firmware upload —
                  someone must be within Wi-Fi range of the station to use it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={triggerOta}>Trigger OTA</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presets</CardTitle>
          <CardDescription>
            Apply a predefined operating mode. Fields a preset doesn't cover keep their current
            values; the OTA flag is never set by a preset.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {CONFIG_PRESETS.map((preset) => (
            <AlertDialog key={preset.name}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={loading || saving}
                  className="h-auto flex-col items-start gap-1 p-4 text-left whitespace-normal"
                >
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {preset.description}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apply the "{preset.name}" preset?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {preset.description} The station picks the new configuration up within 5
                    minutes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => applyPreset(preset)}>Apply</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function ConstructionModeCard({
  onApiError,
}: {
  onApiError: (error: unknown, fallback: string) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSystemConfig('construction_mode')
      .then((config) => setEnabled(parseBooleanConfig(config.value)))
      .catch(() => setEnabled(false));
  }, []);

  const handleToggle = async (checked: boolean) => {
    setSaving(true);
    setEnabled(checked);
    try {
      await setSystemConfig('construction_mode', String(checked));
      toast.success(`Construction mode ${checked ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setEnabled(!checked);
      onApiError(error, 'Failed to update construction mode');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <HardHat className="text-primary h-4 w-4" />
            Construction mode
          </CardTitle>
          <CardDescription>
            Shows a maintenance banner on the public dashboard while the station is being worked on.
          </CardDescription>
        </div>
        {enabled === null ? (
          <Skeleton className="h-5 w-9" />
        ) : (
          <Switch checked={enabled} onCheckedChange={handleToggle} disabled={saving} />
        )}
      </CardContent>
    </Card>
  );
}
