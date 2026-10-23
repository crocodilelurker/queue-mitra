// Validators return an i18n key for the error message, or '' when valid.
export const MAX_AGE = 120
export const MAX_NAME_LENGTH = 50 // the backend rejects longer first names

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

// Optional: an Indian mobile number (10 digits starting 6-9), the format the backend accepts.
export function validateMobile(value) {
  const v = value.trim()
  if (!v) return ''
  return /^[6-9]\d{9}$/.test(v) ? '' : 'errMobileInvalid'
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
