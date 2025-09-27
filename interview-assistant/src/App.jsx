import 'antd/dist/reset.css'
import './App.css'
import { Tabs, Layout, Button, Space, message } from 'antd'
import Interviewee from './components/Interviewee'
import Interviewer from './components/Interviewer'
import WelcomeBackModal from './components/WelcomeBackModal'
import { useDispatch } from 'react-redux'
import { resetSession } from './slices/sessionSlice'
import { clearCandidates } from './slices/candidatesSlice'
import { persistor } from './store'

const { Header, Content } = Layout

function App() {
  const dispatch = useDispatch()

  function handleClearData() {
    // Clear persisted redux state and reset runtime slices
    try {
      persistor.purge()
      // Remove only our persisted root to avoid nuking unrelated keys
      try { localStorage.removeItem('persist:root') } catch {}
      dispatch(clearCandidates())
      dispatch(resetSession())
      message.success('Local data cleared. You can start fresh.')
    } catch (e) {
      console.error(e)
      message.error('Failed to clear local data')
    }
  }
  const items = [
    { key: 'interviewee', label: <span style={{ fontSize: 18, fontWeight: 600 }}>Interviewee (Chat)</span>, children: <Interviewee /> },
    { key: 'interviewer', label: <span style={{ fontSize: 18, fontWeight: 600 }}>Interviewer (Dashboard)</span>, children: <Interviewer /> },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ color: '#fff', fontSize: 18, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <span style={{ justifySelf: 'center' }}>AI Interview Assistant</span>
        <Space style={{ justifySelf: 'end' }} >
          <Button onClick={handleClearData}>Clear Local Data</Button>
        </Space>
      </Header>
      <Content style={{ padding: 16 }}>
        <WelcomeBackModal />
        <Tabs defaultActiveKey="interviewee" items={items} />
      </Content>
    </Layout>
  )
}

export default App


