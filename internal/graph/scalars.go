package graph

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/google/uuid"
	"github.com/vektah/gqlparser/v2/ast"
)

// ---- Time scalar ----

func (ec *executionContext) _Time(_ context.Context, _ ast.SelectionSet, v *time.Time) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return graphql.WriterFunc(func(w io.Writer) {
		fmt.Fprintf(w, `"%s"`, v.UTC().Format(time.RFC3339))
	})
}

func (ec *executionContext) unmarshalInputTime(_ context.Context, v any) (time.Time, error) {
	str, ok := v.(string)
	if !ok {
		return time.Time{}, fmt.Errorf("Time must be a string, got %T", v)
	}
	return time.Parse(time.RFC3339, str)
}

// ---- UUID scalar ----

func (ec *executionContext) _UUID(_ context.Context, _ ast.SelectionSet, v *uuid.UUID) graphql.Marshaler {
	if v == nil {
		return graphql.Null
	}
	return graphql.WriterFunc(func(w io.Writer) {
		fmt.Fprintf(w, `"%s"`, v.String())
	})
}

func (ec *executionContext) unmarshalInputUUID(_ context.Context, v any) (uuid.UUID, error) {
	str, ok := v.(string)
	if !ok {
		return uuid.Nil, fmt.Errorf("UUID must be a string, got %T", v)
	}
	return uuid.Parse(str)
}
