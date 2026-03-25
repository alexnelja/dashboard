import type { CommodityType } from './types';

export const SPEC_FIELDS: Record<CommodityType, { key: string; label: string }[]> = {
  chrome: [
    { key: 'cr2o3_pct', label: 'Cr\u2082O\u2083 (%)' },
    { key: 'fe_pct', label: 'Fe (%)' },
    { key: 'sio2_pct', label: 'SiO\u2082 (%)' },
    { key: 'moisture_pct', label: 'Moisture (%)' },
  ],
  manganese: [
    { key: 'mn_pct', label: 'Mn (%)' },
    { key: 'fe_pct', label: 'Fe (%)' },
    { key: 'sio2_pct', label: 'SiO\u2082 (%)' },
    { key: 'moisture_pct', label: 'Moisture (%)' },
  ],
  iron_ore: [
    { key: 'fe_pct', label: 'Fe (%)' },
    { key: 'sio2_pct', label: 'SiO\u2082 (%)' },
    { key: 'al2o3_pct', label: 'Al\u2082O\u2083 (%)' },
    { key: 'moisture_pct', label: 'Moisture (%)' },
  ],
  coal: [
    { key: 'cv_kcal', label: 'Calorific Value (kcal/kg)' },
    { key: 'ash_pct', label: 'Ash (%)' },
    { key: 'volatile_pct', label: 'Volatile Matter (%)' },
    { key: 'moisture_pct', label: 'Moisture (%)' },
  ],
  aggregates: [
    { key: 'particle_size_mm', label: 'Particle Size (mm)' },
    { key: 'density', label: 'Density (t/m\u00b3)' },
    { key: 'moisture_pct', label: 'Moisture (%)' },
  ],
};

export const SPEC_LABELS: Record<string, string> = {
  cr2o3_pct: 'Cr\u2082O\u2083 (%)',
  fe_pct: 'Fe (%)',
  sio2_pct: 'SiO\u2082 (%)',
  al2o3_pct: 'Al\u2082O\u2083 (%)',
  moisture_pct: 'Moisture (%)',
  mn_pct: 'Mn (%)',
  cv_kcal: 'Calorific Value (kcal/kg)',
  ash_pct: 'Ash (%)',
  volatile_pct: 'Volatile Matter (%)',
  particle_size_mm: 'Particle Size (mm)',
  density: 'Density (t/m\u00b3)',
  size_mm: 'Size (mm)',
  aav: 'AAV',
  crushing_value: 'Crushing Value',
};
