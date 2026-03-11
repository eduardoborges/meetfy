import Conf from 'conf';

const conf = new Conf<Record<string, unknown>>({
  projectName: 'meetfy',
  configName: 'meetfy-config',
});

export function getConfig<K extends string>(key: K): unknown {
  return conf.get(key);
}

export function setConfig(key: string, value: unknown): void {
  conf.set(key, value);
}

export function clearConfig(): void {
  conf.clear();
}
