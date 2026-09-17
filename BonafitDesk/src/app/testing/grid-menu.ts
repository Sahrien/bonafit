export function clickGridMenuAction(
  host: ParentNode | null | undefined,
  label: string,
  options?: { rowIndex?: number; rowText?: string },
): void {
  const rows = Array.from(host?.querySelectorAll('tr[mat-row]') ?? []) as HTMLTableRowElement[];
  const row = options?.rowText
    ? rows.find((item) => item.textContent?.includes(options.rowText ?? ''))
    : rows[options?.rowIndex ?? 0];
  const trigger = row?.querySelector('button[mat-icon-button]') as HTMLButtonElement | undefined;
  trigger?.click();
  const item = Array.from(document.querySelectorAll('button[mat-menu-item]')).find((button) =>
    button.textContent?.includes(label),
  ) as HTMLButtonElement | undefined;
  item?.click();
}
