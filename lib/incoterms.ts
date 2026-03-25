export const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'FCA', 'DAP'] as const;

export const INCOTERM_DESCRIPTIONS: Record<string, { short: string; context: 'loading' | 'delivery' }> = {
  FOB: { short: 'Free On Board — seller delivers to loading port', context: 'loading' },
  CIF: { short: 'Cost, Insurance & Freight — seller pays freight + insurance to destination', context: 'delivery' },
  CFR: { short: 'Cost & Freight — seller pays freight to destination, no insurance', context: 'delivery' },
  EXW: { short: 'Ex Works — buyer arranges all transport from mine', context: 'loading' },
  DDP: { short: 'Delivered Duty Paid — seller delivers to buyer\'s location, all costs', context: 'delivery' },
  FCA: { short: 'Free Carrier — seller delivers to carrier at named place', context: 'loading' },
  DAP: { short: 'Delivered At Place — seller delivers to destination, not unloaded', context: 'delivery' },
};
