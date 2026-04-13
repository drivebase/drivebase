package storage

import (
	"fmt"
	"sync"
)

// Factory creates a Provider from a decrypted credentials JSON blob.
type Factory func(creds Credentials) (Provider, error)

// Registry maps provider types to their factory functions.
// Each provider package registers itself via init().
var globalRegistry = &Registry{}

// Registry is a thread-safe map of ProviderType → Factory.
type Registry struct {
	mu        sync.RWMutex
	factories map[ProviderType]Factory
}

// Register adds a factory for a provider type.
// Panics if the same type is registered twice (caught at startup).
func (r *Registry) Register(t ProviderType, f Factory) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.factories == nil {
		r.factories = make(map[ProviderType]Factory)
	}
	if _, exists := r.factories[t]; exists {
		panic(fmt.Sprintf("storage: provider %q already registered", t))
	}
	r.factories[t] = f
}

// New instantiates a Provider of the given type using the provided credentials.
func (r *Registry) New(t ProviderType, creds Credentials) (Provider, error) {
	r.mu.RLock()
	f, ok := r.factories[t]
	r.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("storage: unknown provider type %q", t)
	}
	return f(creds)
}

// Register adds a factory to the global registry.
// Called from provider init() functions.
func Register(t ProviderType, f Factory) {
	globalRegistry.Register(t, f)
}

// New creates a provider using the global registry.
func New(t ProviderType, creds Credentials) (Provider, error) {
	return globalRegistry.New(t, creds)
}
