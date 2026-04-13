package storage

import "errors"

// Sentinel errors returned by Provider implementations.
// Callers use errors.Is() to check for these.
var (
	// ErrNotFound is returned when a file or folder does not exist.
	ErrNotFound = errors.New("storage: not found")

	// ErrNotSupported is returned when a provider does not support the operation.
	ErrNotSupported = errors.New("storage: operation not supported")

	// ErrAccessDenied is returned when the provider rejects the request due to permissions.
	ErrAccessDenied = errors.New("storage: access denied")

	// ErrQuotaExceeded is returned when the provider storage quota is full.
	ErrQuotaExceeded = errors.New("storage: quota exceeded")

	// ErrInvalidCredentials is returned when provider credentials are invalid or expired.
	ErrInvalidCredentials = errors.New("storage: invalid credentials")
)
