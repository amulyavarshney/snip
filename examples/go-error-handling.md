# Go Error Types

**Task:** "Add proper error types for our user service so callers can distinguish not-found from validation errors."

## Without Snip

```go
type UserErrorCode string

const (
    ErrCodeNotFound   UserErrorCode = "USER_NOT_FOUND"
    ErrCodeInvalid    UserErrorCode = "USER_INVALID"
    ErrCodeForbidden  UserErrorCode = "USER_FORBIDDEN"
    ErrCodeConflict   UserErrorCode = "USER_CONFLICT"
)

type UserError struct {
    Code    UserErrorCode
    Message string
    Details map[string]any
}

func (e *UserError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

type NotFoundError struct{ *UserError }
type ValidationError struct{ *UserError }
type ForbiddenError struct{ *UserError }
type ConflictError struct{ *UserError }

func NewNotFoundError(id int) *NotFoundError {
    return &NotFoundError{&UserError{Code: ErrCodeNotFound, Message: fmt.Sprintf("user %d not found", id)}}
}

func NewValidationError(field, msg string) *ValidationError {
    return &ValidationError{&UserError{
        Code:    ErrCodeInvalid,
        Message: msg,
        Details: map[string]any{"field": field},
    }}
}

func IsUserError(err error) bool {
    var e *UserError
    return errors.As(err, &e)
}
```

Seven types, a const block, four constructors, and a helper — so a caller can do `errors.Is` on error values that already exist.

## With Snip

```go
// snip: sentinel errors; upgrade to typed struct if callers need Code or
// Details fields via errors.As (e.g. to return structured API error responses)
var (
    ErrUserNotFound  = errors.New("user: not found")
    ErrUserInvalid   = errors.New("user: validation failed")
    ErrUserForbidden = errors.New("user: permission denied")
    ErrUserConflict  = errors.New("user: already exists")
)

// Wrap at call site:
//   return fmt.Errorf("get user %d: %w", id, ErrUserNotFound)
// Check at call site:
//   if errors.Is(err, ErrUserNotFound) { ... }
```

**~50 lines → 5 lines.** Sentinel errors with `errors.New` give callers everything they need for `errors.Is` checks. The `UserErrorCode` enum, the `UserError` base struct, and the four subtype constructors add zero capability until a caller needs to call `errors.As` to read structured fields — and the comment tells them exactly when to make that upgrade.
