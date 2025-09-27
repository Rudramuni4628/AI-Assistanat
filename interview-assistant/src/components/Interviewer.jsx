import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Card, Input, Table, Tag } from 'antd'
import CandidateDetail from './CandidateDetail'

export default function Interviewer() {
  const candidates = useSelector((s) => s.candidates.list)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)

  const data = useMemo(() => {
    const filtered = candidates.filter((c) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      )
    })
    return filtered
      .slice()
      .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
      .map((c) => ({ key: c.id, ...c }))
  }, [candidates, query])

  const columns = [
    { title: 'Name', dataIndex: 'name' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Score', dataIndex: 'finalScore', sorter: (a, b) => (a.finalScore || 0) - (b.finalScore || 0) },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s) => <Tag color={s === 'completed' ? 'green' : 'blue'}>{s || 'in_progress'}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => <a onClick={() => setSelected(record)}>View</a>,
    },
  ]

  return (
    <>
      <Card title="Candidates">
        <Input.Search placeholder="Search by name/email/phone" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 12 }} />
        <Table columns={columns} dataSource={data} pagination={{ pageSize: 5 }} />
      </Card>
      <CandidateDetail candidate={selected} onClose={() => setSelected(null)} />
    </>
  )
}