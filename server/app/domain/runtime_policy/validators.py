"""Structural validation for a RuntimePolicy.

validate() always returns a ValidationResult, never raises, for any
RuntimePolicy value it's given, no matter how invalid. An exception out
of this module means a genuine programming error (e.g. a caller passing
something that isn't a RuntimePolicy at all), never "the policy has a
mistake in it": that case is exactly what ValidationResult.errors is for.

This module deliberately does not check whether `scope.action` or a
condition's `field` are recognized by a particular domain adapter
(DOMAIN_ABSTRACTION.md). That check needs the active adapter's
vocabulary, which this package has no knowledge of by design; it belongs
at the layer that does, not here. What this module checks is structural
and internally-consistent well-formedness: the things true or false about
a RuntimePolicy regardless of which adapter is active.
"""

from dataclasses import dataclass, field

from app.domain.runtime_policy.conditions import Operator
from app.domain.runtime_policy.effects import Effect
from app.domain.runtime_policy.runtime_policy import RuntimePolicy

_NUMERIC_OPERATORS = {Operator.LTE, Operator.GTE, Operator.LT, Operator.GT}
_EQUALITY_OPERATORS = {Operator.EQ, Operator.NEQ}


@dataclass(frozen=True)
class ValidationError:
    field: str
    code: str
    message: str


@dataclass(frozen=True)
class ValidationResult:
    errors: tuple[ValidationError, ...] = field(default_factory=tuple)

    @property
    def ok(self) -> bool:
        return len(self.errors) == 0


def validate(policy: RuntimePolicy) -> ValidationResult:
    errors: list[ValidationError] = []
    errors.extend(_validate_required_fields(policy))
    errors.extend(_validate_scope(policy))
    errors.extend(_validate_effect(policy))
    errors.extend(_validate_conditions(policy))
    errors.extend(_validate_metadata(policy))
    return ValidationResult(errors=tuple(errors))


def _validate_required_fields(policy: RuntimePolicy) -> list[ValidationError]:
    errors = []
    if not policy.id or not policy.id.strip():
        errors.append(ValidationError("id", "REQUIRED_FIELD_MISSING", "id must not be empty"))
    if not policy.name or not policy.name.strip():
        errors.append(ValidationError("name", "REQUIRED_FIELD_MISSING", "name must not be empty"))
    if policy.version < 1:
        errors.append(
            ValidationError("version", "INVALID_VERSION", "version must be 1 or greater")
        )
    return errors


def _validate_scope(policy: RuntimePolicy) -> list[ValidationError]:
    errors = []
    scope = policy.scope
    if scope is None:
        return [ValidationError("scope", "INVALID_SCOPE", "scope must be set")]
    if not scope.principal or not scope.principal.strip():
        errors.append(
            ValidationError("scope.principal", "INVALID_SCOPE", "scope.principal must not be empty")
        )
    if not scope.action or not scope.action.strip():
        errors.append(
            ValidationError("scope.action", "INVALID_SCOPE", "scope.action must not be empty")
        )
    return errors


def _validate_effect(policy: RuntimePolicy) -> list[ValidationError]:
    if policy.effect not in Effect:
        return [
            ValidationError(
                "effect", "INVALID_EFFECT", f"'{policy.effect}' is not a recognized effect"
            )
        ]
    return []


def _validate_conditions(policy: RuntimePolicy) -> list[ValidationError]:
    errors: list[ValidationError] = []
    conditions = policy.conditions.all if policy.conditions else ()

    seen: set[tuple[str, str, str]] = set()
    for idx, condition in enumerate(conditions):
        path = f"conditions.all[{idx}]"

        if not condition.field or not condition.field.strip():
            errors.append(
                ValidationError(f"{path}.field", "INVALID_FIELD", "condition field must not be empty")
            )

        if condition.operator not in Operator:
            errors.append(
                ValidationError(
                    f"{path}.operator",
                    "UNSUPPORTED_OPERATOR",
                    f"'{condition.operator}' is not a supported operator",
                )
            )
        else:
            errors.extend(_validate_operator_value_shape(path, condition))

        dedup_key = (condition.field, str(condition.operator), repr(condition.value))
        if dedup_key in seen:
            errors.append(
                ValidationError(
                    path,
                    "DUPLICATE_CONDITION",
                    f"duplicate condition: {condition.field} {condition.operator} {condition.value!r}",
                )
            )
        seen.add(dedup_key)

    return errors


def _validate_operator_value_shape(path: str, condition) -> list[ValidationError]:
    """Numeric operators need a numeric, non-boolean value; `in` needs a
    list; equality operators accept anything. bool is deliberately
    checked before (int, float): in Python, bool is a subclass of int, so
    isinstance(True, int) is True and would otherwise let a boolean value
    silently pass a numeric-operator check it shouldn't."""
    errors: list[ValidationError] = []
    op = condition.operator
    value = condition.value

    if op in _NUMERIC_OPERATORS:
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            errors.append(
                ValidationError(
                    f"{path}.value",
                    "OPERATOR_VALUE_MISMATCH",
                    f"operator '{op}' requires a numeric value, got {value!r}",
                )
            )
    elif op == Operator.IN:
        if not isinstance(value, (list, tuple)):
            errors.append(
                ValidationError(
                    f"{path}.value",
                    "OPERATOR_VALUE_MISMATCH",
                    f"operator 'in' requires a list value, got {value!r}",
                )
            )

    return errors


def _validate_metadata(policy: RuntimePolicy) -> list[ValidationError]:
    errors: list[ValidationError] = []
    metadata = policy.metadata
    if metadata is None:
        return errors

    tags = metadata.tags or ()
    seen_tags: set[str] = set()
    for tag in tags:
        if not tag or not tag.strip():
            errors.append(
                ValidationError("metadata.tags", "INVALID_METADATA", "tags must not be empty strings")
            )
            continue
        if tag in seen_tags:
            errors.append(
                ValidationError(
                    "metadata.tags", "INVALID_METADATA", f"duplicate tag: '{tag}'"
                )
            )
        seen_tags.add(tag)

    return errors
