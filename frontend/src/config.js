// Empty = same origin (the Vite dev/preview proxy forwards /api and /socket.io to the backend).
export const API_URL = import.meta.env.VITE_API_URL || ''

// The hospital this deployment serves. It is created live in the /setup wizard, so the code is only
// known at runtime: HospitalProvider reads it from GET /api/setup/status and calls setHospitalCode().
// VITE_HOSPITAL_CODE can pin it for a multi-hospital backend.
let hospitalCode = import.meta.env.VITE_HOSPITAL_CODE || ''

export const getHospitalCode = () => hospitalCode
export function setHospitalCode(code) {
  hospitalCode = code || ''
}
