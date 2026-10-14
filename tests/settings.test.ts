import { describe, it, expect, MockStorage } from '../src/testing/TestFixtures.ts';
import { SettingsStore, DEFAULT_USER_SETTINGS } from '../src/settings/SettingsStore.ts';

describe('Settings Persistence & Recovery (settings.test.ts)', () => {
  it('persists updated settings to storage and reloads them accurately', () => {
    const mockStorage = new MockStorage();
    const store1 = new SettingsStore(mockStorage);

    store1.update({
      mouseSensitivityX: 2.25,
      fov: 95,
      difficulty: 8,
      muted: true
    });

    const store2 = new SettingsStore(mockStorage);
    const loaded = store2.get();
    expect(loaded.mouseSensitivityX).toBe(2.25);
    expect(loaded.fov).toBe(95);
    expect(loaded.difficulty).toBe(8);
    expect(loaded.muted).toBe(true);
  });

  it('recovers safely when stored JSON is corrupt or contains invalid out-of-bounds values', () => {
    const mockStorage = new MockStorage();
    mockStorage.setItem('operation_blacksite_settings_v1', '{corrupt_json:true');

    const storeCorrupt = new SettingsStore(mockStorage);
    expect(storeCorrupt.get().fov).toBe(DEFAULT_USER_SETTINGS.fov);

    mockStorage.setItem(
      'operation_blacksite_settings_v1',
      JSON.stringify({
        mouseSensitivityX: -99,
        fov: 500,
        difficulty: 42,
        masterVolume: 5.0
      })
    );
    const storeClamped = new SettingsStore(mockStorage);
    const s = storeClamped.get();
    expect(s.mouseSensitivityX).toBe(0.1);
    expect(s.fov).toBe(110);
    expect(s.difficulty).toBe(10);
    expect(s.masterVolume).toBe(1.0);
  });
});
