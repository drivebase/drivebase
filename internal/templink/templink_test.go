package templink

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "test-secret-key"

func TestSign_format(t *testing.T) {
	id := uuid.New()
	qs := Sign(id, testSecret, time.Hour)
	assert.Contains(t, qs, "exp=")
	assert.Contains(t, qs, "sig=")
}

func TestVerify_valid(t *testing.T) {
	id := uuid.New()
	qs := Sign(id, testSecret, time.Hour)

	// Parse the returned query string manually
	exp, sig := parseQS(t, qs)
	assert.True(t, Verify(id.String(), exp, sig, testSecret))
}

func TestVerify_expired(t *testing.T) {
	id := uuid.New()
	// Sign with a negative TTL so it's already expired
	qs := Sign(id, testSecret, -time.Second)
	exp, sig := parseQS(t, qs)
	assert.False(t, Verify(id.String(), exp, sig, testSecret))
}

func TestVerify_wrongSecret(t *testing.T) {
	id := uuid.New()
	qs := Sign(id, testSecret, time.Hour)
	exp, sig := parseQS(t, qs)
	assert.False(t, Verify(id.String(), exp, sig, "different-secret"))
}

func TestVerify_tamperedFileNodeID(t *testing.T) {
	id := uuid.New()
	other := uuid.New()
	qs := Sign(id, testSecret, time.Hour)
	exp, sig := parseQS(t, qs)
	// Attacker tries to use the sig for a different file node
	assert.False(t, Verify(other.String(), exp, sig, testSecret))
}

func TestVerify_tamperedExpiry(t *testing.T) {
	id := uuid.New()
	qs := Sign(id, testSecret, time.Minute)
	_, sig := parseQS(t, qs)
	// Attacker extends expiry
	farFuture := "9999999999"
	assert.False(t, Verify(id.String(), farFuture, sig, testSecret))
}

func TestVerify_invalidExp(t *testing.T) {
	assert.False(t, Verify(uuid.New().String(), "notanumber", "somesig", testSecret))
}

// parseQS splits "exp=...&sig=..." into its two parts.
func parseQS(t *testing.T, qs string) (exp, sig string) {
	t.Helper()
	var expVal, sigVal string
	for _, part := range splitAmpersand(qs) {
		if len(part) > 4 && part[:4] == "exp=" {
			expVal = part[4:]
		}
		if len(part) > 4 && part[:4] == "sig=" {
			sigVal = part[4:]
		}
	}
	require.NotEmpty(t, expVal, "missing exp in query string")
	require.NotEmpty(t, sigVal, "missing sig in query string")
	return expVal, sigVal
}

func splitAmpersand(s string) []string {
	var parts []string
	start := 0
	for i, c := range s {
		if c == '&' {
			parts = append(parts, s[start:i])
			start = i + 1
		}
	}
	parts = append(parts, s[start:])
	return parts
}
