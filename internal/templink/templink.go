// Package templink provides HMAC-signed stateless download URLs.
package templink

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"time"

	"github.com/google/uuid"
)

// Sign returns query-string parameters that authenticate a time-limited
// download URL: "exp=UNIX&sig=HMAC-SHA256".
// Callers append this to /api/v1/templink/{fileNodeID}?.
func Sign(fileNodeID uuid.UUID, secret string, ttl time.Duration) string {
	exp := strconv.FormatInt(time.Now().Add(ttl).Unix(), 10)
	sig := computeSig(fileNodeID.String(), exp, secret)
	return fmt.Sprintf("exp=%s&sig=%s", exp, sig)
}

// Verify returns true if sig is a valid HMAC for fileNodeID+exp and the link
// has not yet expired.
func Verify(fileNodeID, exp, sig, secret string) bool {
	expected := computeSig(fileNodeID, exp, secret)
	if !hmac.Equal([]byte(sig), []byte(expected)) {
		return false
	}
	expUnix, err := strconv.ParseInt(exp, 10, 64)
	if err != nil {
		return false
	}
	return time.Now().Unix() <= expUnix
}

func computeSig(fileNodeID, exp, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(fileNodeID + ":" + exp))
	return hex.EncodeToString(mac.Sum(nil))
}
