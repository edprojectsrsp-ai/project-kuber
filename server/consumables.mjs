// Descriptions supplied by the department. Repeated descriptions share one stock balance.
export const consumableDescriptions = [
  'BROOM (COCONUT)', 'BROOM (FLOWER)', 'C.FAN 48"', 'C.FAN 56"',
  'LED FLOOD LIGHT 150W TO 200W', 'LEDSTREET LIGHT 80W TO 120W',
  'LED TUBE LIGHT 18-20W', 'PVC INSULATION TAPE', 'NAVTAL,PAD LOCK',
  'MARKER PEN,BLACK F/WRITING', 'ALPIN', 'ATTENDANCE REGISTER',
  'ATTENDANCE REGISTER (Big)', 'BIN CARD', 'CARBON PAPER A 3',
  'CARBON PAPER Black A 4', 'CARBON PAPER Bule A 4', 'CATRIDGE FOR HP',
  'CATRIDGE FOR XEROX', 'DOUBLE PUNCH', 'DUPLICATING BOOK', 'DUPLICATING INK',
  'DUSTER CLOTH', 'DUSTER FLOOR', 'DESK CALENDER', 'ENVELOPE CLOTH big',
  'ENVELOPE PLAIN big', 'EXERCISE BOOK', 'FILE,PLASTIC COATED,PINK,280X350MM',
  'FILE COVER (thinner)', 'FILE COVER LEVER ARCH', 'FLAT FILE (thicker)',
  'FILE,FLAP W/MILL COTTON TAPE,600X75MM', 'GUM', 'INK STAMP PAD', 'JEMS CLIP',
  'COMMON LETTERHEAD,WD:7XLG:8-1/4IN', 'COMMON LETTERHEAD,A4', 'NOTE SHEET',
  'PEON BOOK', 'POCKET BOOK', 'REGISTER LETTER DESPACH', 'REGISTER LETTER RECEIVED',
  'RULLED PAPER', 'RULLED REGISTER', 'REGISTER,65 SHEETS,A4,75GSM',
  'REGISTER,100 SHEETS,A4,75GSM', 'RULLED REGISTER', 'RIBBON for Printer',
  'SINGLE PUNCH', 'STAMP PAD', 'STEPLER MACHINE (Heavy)', 'STEPLER MACHINE (Light)',
  'STEPLER PIN', 'TAG', 'TONNER 5020/5021', 'WHITE PAPER', 'XEROX PAPER A4',
  'PAPER,DUPLICATING,210X297MM', 'XEROX PAPER A-3',
  'BOOK,POCKET,RULED,A6,GSM:52,PAGE:96', 'CARBON PAPER',
  'SAFETY SHOE,INDUSTRIAL,SIZE:4',
  ...[5,6,7,8,9,10,11,12].map(size => `SHOE,SAFETY,INDUSTRIAL,JODHPURI,SIZE:${size}`),
];

export function createConsumables() {
  return [...new Set(consumableDescriptions)].map((name, index) => ({
    id: `consumable_20261109_${index + 1}`, name, make: '',
    category: 'Consumables', unit: /SHOE/.test(name) ? 'pair' : 'nos',
    minQty: 1, qty: 0, icon: /SHOE/.test(name) ? 'safety' : 'auto',
  }));
}

export function replaceConsumables(data) {
  if (data.consumableCatalogueVersion === 1) return false;
  const retired = data.items;
  // Keep issued/closed requests and movement history readable after replacement.
  data.archivedItems = [...(data.archivedItems || []), ...retired];
  for (const slip of data.slips) {
    for (const line of slip.lines) {
      const item = retired.find(item => item.id === line.itemId);
      if (item) Object.assign(line, { name: item.name, make: item.make, unit: item.unit });
    }
    if (['open', 'approved'].includes(slip.status)) {
      slip.status = 'cancelled';
      slip.reason = 'Consumable catalogue replaced. Submit a new request using the departmental catalogue.';
    }
  }
  data.items = createConsumables();
  data.consumableCatalogueVersion = 1;
  return true;
}
