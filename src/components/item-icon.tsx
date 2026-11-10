import {
  AirVent, Archive, Armchair, Battery, BookOpen, BrushCleaning, Cable,
  CalendarDays, Calculator, ClipboardList, Cpu, createLucideIcon, Droplets,
  FileText, HardDrive, Keyboard, Laptop, Lightbulb, LockKeyhole, Mail,
  Monitor, Mouse, Network, Package, Paperclip, PenTool, Pin, Plug, Printer,
  Projector, Scan, Scissors, Shield, Sofa, Stamp, Table2, Tag, Usb, Wrench,
  Fan, Folder, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICON_STYLES, resolveItemIcon, type ItemIconKey } from '@/lib/item-icons';

const Broom = createLucideIcon('Broom', [
  ['path', { d: 'm17 3-8 11M7 12l7 4-4 6-7-4 4-6Z', key: 'outline' }],
  ['path', { d: 'm7 16-2 4m5-2-2 3', key: 'bristles' }],
]);
const Stapler = createLucideIcon('Stapler', [
  ['path', { d: 'm4 6 16 5v4H4V6Zm1 9v3m-2 0h18v3H3v-3Z', key: 'body' }],
  ['circle', { cx: '7', cy: '11', r: '1', key: 'hinge' }],
]);
const Staples = createLucideIcon('Staples', [
  ['path', { d: 'M4 16V6h12v10M8 19V9h12v10', key: 'strips' }],
]);
const PaperPunch = createLucideIcon('PaperPunch', [
  ['path', { d: 'M4 5h16v5H4zM7 10v7m10-7v7M3 17h18v4H3z', key: 'body' }],
  ['path', { d: 'M7 19h2m6 0h2', key: 'holes' }],
]);
const Tape = createLucideIcon('Tape', [
  ['ellipse', { cx: '10', cy: '8', rx: '7', ry: '4', key: 'roll' }],
  ['ellipse', { cx: '10', cy: '8', rx: '2.5', ry: '1.4', key: 'core' }],
  ['path', { d: 'M3 8v7c0 2.2 3.1 4 7 4h11v-5h-4V8', key: 'tail' }],
]);
const Cartridge = createLucideIcon('Cartridge', [
  ['path', { d: 'M5 7h14v3h2v10H3V10h2V7Zm3-4h8v4M7 13h10m-9 4h8', key: 'body' }],
]);
const SafetyShoe = createLucideIcon('SafetyShoe', [
  ['path', { d: 'M4 4h7v7l4 3 5 1 1 3v3H3v-7l1-4V4Zm-1 14h18M8 8h3m-3 3h3m2 3 2-2', key: 'boot' }],
]);

export const ITEM_ICONS: Record<ItemIconKey, LucideIcon> = {
  package: Package, paper: FileText, pen: PenTool, mouse: Mouse, keyboard: Keyboard,
  cable: Cable, plug: Plug, liquid: Droplets, bulb: Lightbulb, tools: Wrench,
  folder: Folder, scissors: Scissors, notebook: BookOpen, register: ClipboardList,
  clip: Paperclip, cleaning: BrushCleaning, broom: Broom, safety: Shield,
  shoe: SafetyShoe, drive: HardDrive, cpu: Cpu, monitor: Monitor, printer: Printer,
  ink: Cartridge, laptop: Laptop, battery: Battery, scanner: Scan, projector: Projector,
  network: Network, fan: Fan, ac: AirVent, sofa: Sofa, chair: Armchair,
  table: Table2, cabinet: Archive, lock: LockKeyhole, envelope: Mail,
  calendar: CalendarDays, stamp: Stamp, pin: Pin, stapler: Stapler,
  staples: Staples, punch: PaperPunch, tape: Tape, tag: Tag, usb: Usb, calculator: Calculator,
};

export { ICON_STYLES };

export function ItemIcon({ name = '', icon = 'auto', badge = false, className }: {
  name?: string;
  icon?: string;
  badge?: boolean;
  className?: string;
}) {
  const key = resolveItemIcon(name, icon);
  const Icon = ITEM_ICONS[key];
  const { color } = ICON_STYLES[key];
  if (badge) return <span aria-hidden="true" className={cn('item-icon-badge', className || 'size-10')} style={{ backgroundColor: color }}>
    <Icon className="size-[58%]" strokeWidth={2} />
  </span>;
  return <Icon aria-hidden="true" className={cn('shrink-0', className || 'size-5')} style={{ color }} strokeWidth={1.9} />;
}
