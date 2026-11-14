export interface AppLifecyclePlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
