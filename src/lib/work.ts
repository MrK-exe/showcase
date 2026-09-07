// Work-entry labels. Entries tagged `personal` are side projects, everything else is work —
// one place decides, so the detail kicker, the list badge and any future grouping agree.
export const workKind = (tags: readonly string[]) => (tags.includes('personal') ? 'Side quest' : 'Work');

// Human label for the Keystatic status value (mirrors the CMS select labels).
const STATUS_LABEL: Record<string, string> = { wip: 'in progress', shipped: 'shipped', archived: 'archived' };
export const statusLabel = (status?: string | null) => (status ? STATUS_LABEL[status] ?? status : undefined);
