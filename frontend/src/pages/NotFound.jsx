import Layout from '../components/Layout.jsx'
import { useI18n } from '../i18n/index.jsx'
import { Link } from '../router.jsx'
import { Icon } from '../components/common/Icons.jsx'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <Layout>
      <h1 className="hero hero--sm">{t.notFoundTitle}</h1>
      <Link className="btn btn--primary" to="/">
        <Icon name="home" size={18} /> {t.backHome}
      </Link>
    </Layout>
  )
}
