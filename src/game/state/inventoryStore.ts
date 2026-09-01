/**
 * Whether the Inventory overlay is open — a plain reactive singleton
 * rather than component state, so it can be toggled from anywhere
 * (a Phaser scene's keyboard handler, the React overlay's own button,
 * a global keydown listener) without threading callbacks through props.
 */
class InventoryStore {
  private open = false;
  private listeners = new Set<() => void>();

  isOpen(): boolean {
    return this.open;
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.notify();
  }

  toggle(): void {
    this.setOpen(!this.open);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const inventoryStore = new InventoryStore();
