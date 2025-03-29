/* eslint-disable @typescript-eslint/no-unsafe-return */
/**
 * Method decorator to ensure a provider is initialized before executing a method.
 */
export function ensureInitialized(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  const originalMethod = descriptor.value as (...args: any[]) => Promise<any>;

  descriptor.value = function (...args: any[]) {
    if (typeof this.isInitialized !== 'boolean') {
      throw new Error(
        'ensureInitialized decorator can only be used on classes with isInitialized property',
      );
    }

    if (!this.isInitialized) {
      throw new Error('Provider not initialized. Call authenticate() first.');
    }

    return originalMethod.apply(this, args);
  };

  return descriptor;
}
