import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import EmergencyModal from '../components/common/EmergencyModal.jsx'

const EmergencyContext = createContext(null)

/** One emergency guidance modal for the whole app: header, home card, /new button and triage all open it. */
export function EmergencyProvider({ children }) {
  const [state, setState] = useState({ open: false, detail: null })
  const openEmergency = useCallback((detail = null) => setState({ open: true, detail }), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const value = useMemo(() => ({ openEmergency }), [openEmergency])
  return (
    <EmergencyContext.Provider value={value}>
      {children}
      <EmergencyModal open={state.open} detail={state.detail} onClose={close} />
    </EmergencyContext.Provider>
  )
}

export const useEmergency = () => useContext(EmergencyContext)
