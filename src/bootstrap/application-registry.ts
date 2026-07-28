export class ApplicationRegistry {
  private readonly instances = new Map<string, unknown>();

  register<T>(key: string, instance: T): void {
    this.instances.set(key, instance);
  }

  resolve<T>(key: string): T {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error(
        `[ApplicationRegistry] Dependency not registered for key: '${key}'`,
      );
    }
    return instance as T;
  }

  has(key: string): boolean {
    return this.instances.has(key);
  }
}
