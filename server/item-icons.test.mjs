import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveItemIcon, ICON_STYLES } from '../src/lib/item-icons.ts';
import { createConsumables } from './consumables.mjs';
import { ASSET_KINDS } from '../src/lib/store/types.ts';

test('every departmental consumable and supported asset has a recognisable icon', () => {
  for(const item of createConsumables())assert.notEqual(resolveItemIcon(item.name,item.icon),'package',item.name);
  for(const kind of ASSET_KINDS)assert.notEqual(resolveItemIcon(kind),'package',kind);
});

test('specific stationery and equipment descriptions take precedence over general words', () => {
  const cases={
    'DESK CALENDER':'calendar', 'RIBBON for Printer':'ink', 'CATRIDGE FOR HP':'ink',
    'TONNER 5020/5021':'ink', 'REGISTER,100 SHEETS,A4,75GSM':'register',
    'INK STAMP PAD':'stamp', 'STEPLER PIN':'staples', 'STEPLER MACHINE (Light)':'stapler',
    'C.FAN 48"':'fan', 'FILE,PLASTIC COATED,PINK,280X350MM':'folder',
    'Air conditioner':'ac', 'Sofa':'sofa', 'Chair':'chair',
  };
  for(const [description,key] of Object.entries(cases))assert.equal(resolveItemIcon(description),key,description);
  assert.equal(resolveItemIcon('SAFETY SHOE,INDUSTRIAL,SIZE:4','safety'),'shoe');
});

test('saved icon choices remain valid and unknown or legacy values fall back safely', () => {
  for(const key of Object.keys(ICON_STYLES))assert.equal(resolveItemIcon('',key),key);
  assert.equal(resolveItemIcon('BROOM (FLOWER)','pen'),'pen');
  assert.equal(resolveItemIcon('Monitor','retired-icon-name'),'monitor');
  assert.equal(resolveItemIcon('Unknown material'),'package');
  assert.equal(resolveItemIcon('Unknown material','toString'),'package');
});
