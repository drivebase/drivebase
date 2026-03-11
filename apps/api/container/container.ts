type Factory<T> = () => T;

interface Registration<T> {
	factory: Factory<T>;
	singleton: boolean;
	instance?: T;
}

/**
 * Lightweight service container with singleton and transient registrations.
 * No decorators, no reflection — just explicit wiring.
 */
export class ServiceContainer {
	private registrations = new Map<symbol, Registration<unknown>>();

	/**
	 * Register a transient service — new instance per resolve().
	 */
	register<T>(token: symbol, factory: Factory<T>): this {
		this.registrations.set(token, { factory, singleton: false });
		return this;
	}

	/**
	 * Register a singleton service — one instance, lazily created.
	 */
	singleton<T>(token: symbol, factory: Factory<T>): this {
		this.registrations.set(token, { factory, singleton: true });
		return this;
	}

	/**
	 * Register a pre-existing value (already instantiated).
	 */
	value<T>(token: symbol, instance: T): this {
		this.registrations.set(token, {
			factory: () => instance,
			singleton: true,
			instance,
		});
		return this;
	}

	/**
	 * Resolve a service by token.
	 */
	resolve<T>(token: symbol): T {
		const reg = this.registrations.get(token);
		if (!reg) {
			throw new Error(
				`ServiceContainer: no registration for ${token.toString()}`,
			);
		}

		if (reg.singleton) {
			if (!reg.instance) {
				reg.instance = reg.factory();
			}
			return reg.instance as T;
		}

		return reg.factory() as T;
	}

	/**
	 * Check if a token is registered.
	 */
	has(token: symbol): boolean {
		return this.registrations.has(token);
	}
}
