/**
 * Declarative item definitions. Systems interpret these; UI reads them for
 * icons and labels. Add new items here rather than hard-coding strings.
 */
export const ITEMS = {
  chip: {
    id: 'chip',
    name: 'Electronic Component',
    icon: 'icon-chip',
    description: 'Salvaged control board and wiring. Used to repair damaged equipment.'
  }
};

export function getItem(id) {
  return ITEMS[id] ?? null;
}
