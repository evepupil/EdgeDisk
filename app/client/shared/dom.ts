export function requireElement<T>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`Missing required element: ${id}`)
  return element as unknown as T
}

export function closestElement(target: EventTarget | null, selector: string): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(selector) : null
}

export function closeParentDialog(target: EventTarget | null): void {
  const button = target instanceof Element ? target.closest<HTMLElement>('.dialog-cancel') : null
  button?.closest<HTMLDialogElement>('dialog')?.close()
}
