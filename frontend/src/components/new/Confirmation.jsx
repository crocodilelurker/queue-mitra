import { useI18n } from '../../i18n/index.jsx'

export default function Confirmation({ patient, path, doctor, problem, onStartOver }) {
  const { t } = useI18n()
  const rows = [
    [t.firstName, patient.firstName.trim()],
    [t.age, patient.age.trim()],
    [t.gender, t[`gender${patient.gender[0].toUpperCase()}${patient.gender.slice(1)}`]],
    ...(path === 'knowledge'
      ? [
          [t.doctorName, doctor.doctorName.trim()],
          [t.department, doctor.department.trim()],
        ]
      : [[t.problemLabel, problem.trim()]]),
  ]
  return (
    <div className="form" role="status">
      <h2 className="form__title">{t.captured}</h2>
      <p className="path__hint">{t.capturedNote}</p>
      <dl className="summary">
        {rows.map(([label, value]) => (
          <div key={label} className="summary__row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="form__actions">
        <button type="button" className="btn btn--primary" onClick={onStartOver}>
          {t.startOver}
        </button>
        <a className="btn" href="/">
          {t.backHome}
        </a>
      </div>
    </div>
  )
}
