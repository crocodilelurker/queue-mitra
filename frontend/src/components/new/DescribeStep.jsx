import { useState } from 'react'
import { useI18n } from '../../i18n/index.jsx'
import SymptomBox from '../SymptomBox.jsx'
import TriageResult from '../TriageResult.jsx'
import { Icon } from '../common/Icons.jsx'

/** "No Knowledge" branch: describe the problem; the backend suggests a department (never a diagnosis). */
export default function DescribeStep({ patient, onAccept, onChooseOther, onBack }) {
  const { t } = useI18n()
  const [result, setResult] = useState(null)
  const [emergency, setEmergency] = useState(null)

  return (
    <div className="form">
      <SymptomBox
        age={patient.age}
        gender={patient.gender}
        submitLabel={t.suggestDept}
        onResult={(data) => {
          setEmergency(null)
          setResult(data)
        }}
        onEmergency={(detail) => {
          setResult(null)
          setEmergency(detail)
        }}
      />
      {emergency && (
        <section className="emergency-alert-banner" role="alert">
          <Icon name="emergency" size={24} />
          <p>{emergency.directive}</p>
        </section>
      )}
      {result && <TriageResult result={result} onAccept={onAccept} onChoose={onChooseOther} acceptLabel={t.useThisDept} />}
      <button type="button" className="btn btn--outline" onClick={onBack}>
        <Icon name="arrow-left" size={18} />
        <span>{t.back}</span>
      </button>
    </div>
  )
}
