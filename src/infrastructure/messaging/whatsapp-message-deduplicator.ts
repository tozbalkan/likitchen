export class WhatsAppMessageDeduplicator {
  private readonly processedIds = new Set<string>();

  isDuplicate(providerMessageId: string): boolean {
    if (!providerMessageId || providerMessageId.trim() === '') {
      return false;
    }
    if (this.processedIds.has(providerMessageId)) {
      return true;
    }
    this.processedIds.add(providerMessageId);
    return false;
  }

  clear(): void {
    this.processedIds.clear();
  }
}
