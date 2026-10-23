import { useI18n } from '../../i18n/index.jsx'

export default function KnowledgeStep({ onChoose, onBack }) {
  const { t } = useI18n()
  return (
    <div className="form">
      <h2 className="form__title">{t.knowQuestion}</h2>
      <div className="knowledge">
        <button type="button" className="knowledge__btn" onClick={() => onChoose('knowledge')}>
          <strong>{t.knowledge}</strong>
          <span>{t.knowledgeHint}</span>
        </button>
        <button type="button" className="knowledge__btn" onClick={() => onChoose('noKnowledge')}>
          <strong>{t.noKnowledge}</strong>
          <span>{t.noKnowledgeHint}</span>
        </button>
      </div>
      <button type="button" className="btn" onClick={onBack}>
        {t.back}
      </button>
    </div>
  )
}
