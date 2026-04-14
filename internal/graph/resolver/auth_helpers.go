package resolver

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand/v2"
	"time"

	"github.com/drivebase/drivebase/internal/auth"
	entpasswordreset "github.com/drivebase/drivebase/internal/ent/passwordreset"
	entuser "github.com/drivebase/drivebase/internal/ent/user"
)

const otpTTL = 5 * time.Minute

func (r *mutationResolver) requestPasswordReset(ctx context.Context, email string) (bool, error) {
	// Always return true to avoid user enumeration
	exists, err := r.DB.User.Query().Where(entuser.Email(email)).Exist(ctx)
	if err != nil {
		return false, fmt.Errorf("internal error")
	}
	if !exists {
		return true, nil
	}

	otp := fmt.Sprintf("%06d", rand.IntN(1_000_000))

	_, err = r.DB.PasswordReset.Create().
		SetEmail(email).
		SetOtp(otp).
		SetExpiresAt(time.Now().Add(otpTTL)).
		Save(ctx)
	if err != nil {
		return false, fmt.Errorf("internal error")
	}

	slog.Info("password reset OTP", "email", email, "otp", otp)

	return true, nil
}

func (r *mutationResolver) resetPassword(ctx context.Context, email, otp, newPassword string) (bool, error) {
	if len(newPassword) < 8 {
		return false, fmt.Errorf("password must be at least 8 characters")
	}

	reset, err := r.DB.PasswordReset.Query().
		Where(
			entpasswordreset.Email(email),
			entpasswordreset.Otp(otp),
			entpasswordreset.UsedAtIsNil(),
			entpasswordreset.ExpiresAtGT(time.Now()),
		).
		Order(entpasswordreset.ByCreatedAt()).
		First(ctx)
	if err != nil {
		return false, fmt.Errorf("invalid or expired OTP")
	}

	hash, err := auth.HashPassword(newPassword)
	if err != nil {
		return false, fmt.Errorf("internal error")
	}

	now := time.Now()
	if err := r.DB.PasswordReset.UpdateOne(reset).SetUsedAt(now).Exec(ctx); err != nil {
		return false, fmt.Errorf("internal error")
	}

	if err := r.DB.User.Update().
		Where(entuser.Email(email)).
		SetPasswordHash(hash).
		Exec(ctx); err != nil {
		return false, fmt.Errorf("internal error")
	}

	return true, nil
}
