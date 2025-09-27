import { Drawer, Descriptions, List } from 'antd'

export default function CandidateDetail({ candidate, onClose }) {
  return (
    <Drawer title="Candidate Details" open={!!candidate} onClose={onClose} width={640}>
      {candidate && (
        <>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Name">{candidate.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Email">{candidate.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Phone">{candidate.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Score">{candidate.finalScore ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="Summary">{candidate.summary || '-'}</Descriptions.Item>
          </Descriptions>

          <h4 style={{ marginTop: 16 }}>Questions & Answers</h4>
          <List
            bordered
            dataSource={candidate.questions || []}
            renderItem={(q, idx) => (
              <List.Item>
                <div>
                  <div><strong>Q{idx + 1} [{q.difficulty}]</strong>: {q.prompt}</div>
                  <div><strong>Answer</strong>: {q.answer || '(no answer)'}</div>
                  <div><strong>AI Score</strong>: {q.aiScore ?? '-'}</div>
                </div>
              </List.Item>
            )}
            style={{ marginBottom: 16 }}
          />

          <h4>Chat History</h4>
          <List
            bordered
            dataSource={candidate.chatHistory || []}
            renderItem={(m) => (
              <List.Item>
                <strong>{m.role === 'ai' ? 'Assistant' : 'You'}:</strong> {m.content}
              </List.Item>
            )}
          />
        </>
      )}
    </Drawer>
  )
}