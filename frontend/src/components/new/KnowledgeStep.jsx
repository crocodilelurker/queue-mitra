import { useI18n } from '../../i18n/index.jsx'
import { Icon } from '../common/Icons.jsx'

export default function KnowledgeStep({ onChoose, onBack }) {
  const { t } = useI18n()
  return (
    <div className="form card">
      <div className="form__header">
        <h2 className="form__title">Department Route</h2>
        <p className="form__subtitle">Do you already know which OPD department you need to visit?</p>
      </div>

      <div className="knowledge-grid">
        <button type="button" className="knowledge-card knowledge-card--yes" onClick={() => onChoose('knowledge')}>
          <div className="knowledge-card__icon-box">
            <Icon name="check" size={24} />
          </div>
          <div className="knowledge-card__text">
            <strong>{t.knowledge}</strong>
            <span>{t.knowledgeHint}</span>
          </div>
          <Icon name="chevron-right" size={20} className="knowledge-card__arrow" />
        </button>

        <button type="button" className="knowledge-card knowledge-card--no" onClick={() => onChoose('noKnowledge')}>
          <div className="knowledge-card__icon-box">
            <Icon name="sparkles" size={24} />
          </div>
          <div className="knowledge-card__text">
            <strong>{t.noKnowledge}</strong>
            <span>{t.noKnowledgeHint}</span>
          </div>
          <Icon name="chevron-right" size={20} className="knowledge-card__arrow" />
        </button>
      </div>

      <button type="button" className="btn btn--outline" onClick={onBack}>
        <Icon name="arrow-left" size={18} />
        <span>{t.back}</span>
      </button>
    </div>
  )
}
