// Validators return an i18n key for the error message, or '' when valid.
export const MAX_AGE = 120
export const MAX_PROBLEM_LENGTH = 500
export const MAX_NAME_LENGTH = 60

export function validateFirstName(value) {
  const v = value.trim()
  if (!v) return 'errNameRequired'
  if (v.length > MAX_NAME_LENGTH) return 'errNameLong'
  return ''
}

export function validateAge(value) {
  const v = value.trim()
  if (!v) return 'errAgeRequired'
  if (!/^\d+$/.test(v) || Number(v) > MAX_AGE) return 'errAgeInvalid'
  return ''
}

export function validateGender(value) {
  return value ? '' : 'errGenderRequired'
}

export function validateRequired(value) {
  return value.trim() ? '' : 'errRequired'
}

export function validateProblem(value) {
  const v = value.trim()
  if (!v) return 'errProblemRequired'
  if (v.length > MAX_PROBLEM_LENGTH) return 'errProblemLong'
  return ''
}

/** Runs `{ field: validator }` over `values`; returns only the fields that failed. */
export function validateAll(values, rules) {
  const errors = {}
  for (const [field, rule] of Object.entries(rules)) {
    const error = rule(values[field] ?? '')
    if (error) errors[field] = error
  }
  return errors
}

/** After a failed submit, move focus to the first invalid control. */
export function focusFirstInvalid(form) {
  form?.querySelector('[aria-invalid="true"], fieldset[data-invalid="true"] input')?.focus()
}
