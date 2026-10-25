import Layout from '../components/Layout.jsx'
import { Icon } from '../components/common/Icons.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <Layout>
      <section className="empty-state">
        <Icon name="compass" size={48} />
        <h1 className="page-title">{t.notFoundTitle}</h1>
        <p className="lead">{t.notFoundBody}</p>
        <Link className="btn btn--primary btn--block" to="/">
          <Icon name="home" size={22} />
          <span>{t.backHome}</span>
        </Link>
      </section>
    </Layout>
  )
}
