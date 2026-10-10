const KEY = 'stellarspark_lost_in_orbit_v1', SKEY = 'stellarspark_lost_in_orbit_settings';
export const DEFAULT_SETTINGS = { muted: false, sensitivity: 1, uiScale: 1, quality: 'auto' };
export const SaveSystem = {
  save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('save failed', e); } },
  load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  has() { const s = this.load(); return !!(s && !s.finished); },
  clear() { try { localStorage.removeItem(KEY); } catch {} },
  saveSettings(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {} },
  loadSettings() { try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SKEY)) }; } catch { return { ...DEFAULT_SETTINGS }; } },
};
