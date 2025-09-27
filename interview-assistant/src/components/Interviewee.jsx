import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Card, Input, List, Modal, Progress, Statistic, Upload, message, Space, Typography } from 'antd'
import { InboxOutlined } from '@ant-design/icons'
import { parseResume } from '../services/resumeParser'
import { v4 as uuidv4 } from 'uuid'
import { upsertCandidate, updateCandidateFields, setQuestions, recordAnswer, setChatHistory, finalizeCandidate } from '../slices/candidatesSlice'
import { startSession, startInterview, nextQuestion, completeInterview, resetSession } from '../slices/sessionSlice'
import { DIFFICULTY_ORDER, TIME_LIMITS, generateQuestions, scoreAnswer, summarizeCandidate } from '../ai/engine'

const { Dragger } = Upload
const { Text } = Typography

export default function Interviewee() {
  const dispatch = useDispatch()
  const session = useSelector((s) => s.session)
  const candidates = useSelector((s) => s.candidates.list)
  const candidate = useMemo(() => candidates.find((c) => c.id === session.currentCandidateId), [candidates, session.currentCandidateId])

  const [inputValue, setInputValue] = useState('')
  const timerRef = useRef(null)
  const candidatesRef = useRef([])
  useEffect(() => { candidatesRef.current = candidates }, [candidates])

  const chatHistory = useMemo(() => candidate?.chatHistory || [], [candidate])

  // Helper: add a timeout to long operations to avoid hanging uploads
  function withTimeout(promise, ms, timeoutMessage = 'Request timed out') {
    let timer
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), ms)
      }),
    ])
  }

  useEffect(() => {
    // Auto-advance if time elapsed
    if (session.stage === 'interview' && candidate?.questions) {
      const q = candidate.questions[session.currentQuestionIndex]
      if (!q) return
      const start = session.currentQuestionStartAt
      const limitMs = (q.timeLimit || TIME_LIMITS[q.difficulty] || 30) * 1000
      const remaining = start ? start + limitMs - Date.now() : limitMs
      if (remaining <= 0) {
        handleSubmitAnswer('')
      }
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        handleSubmitAnswer('')
      }, Math.max(0, remaining))
    }
    return () => timerRef.current && clearTimeout(timerRef.current)
  }, [session.stage, session.currentQuestionIndex, session.currentQuestionStartAt, candidate?.questions])

  function addChat(role, content, targetId) {
    const id = targetId || candidate?.id || session.currentCandidateId
    if (!id) return
    const current = candidatesRef.current.find((c) => c.id === id)
    const base = (current && current.chatHistory) ? current.chatHistory : []
    const updated = [...base, { role, content, timestamp: Date.now() }]
    dispatch(setChatHistory({ id, chatHistory: updated }))
  }

  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf,.docx',
    customRequest: async ({ file, onSuccess, onError, onProgress }) => {
      try {
        // Inform UI that parsing started
        onProgress && onProgress({ percent: 5 })
        const { text, fields } = await withTimeout(parseResume(file), 20000, 'Request timed out while parsing the file')
        onProgress && onProgress({ percent: 60 })
        const id = uuidv4()
        const base = { id, resumeText: text, status: 'in_progress', questions: [], chatHistory: [] }
        dispatch(upsertCandidate(base))
        dispatch(startSession({ candidateId: id }))
        dispatch(updateCandidateFields({ id, fields }))
        addChat('ai', 'Thanks for uploading your resume. Let me extract your details...', id)
        const missing = ['name', 'email', 'phone'].filter((f) => !fields[f])
        if (missing.length) {
          addChat('ai', `I could not find: ${missing.join(', ')}. Please provide them one by one.`, id)
        } else {
          addChat('ai', 'All required fields are present. Starting the interview now.', id)
          startTheInterview(id)
        }
        onProgress && onProgress({ percent: 100 })
        onSuccess && onSuccess('ok')
      } catch (e) {
        console.error(e)
        onError && onError(e)
        const msg = /timed out/i.test(e.message || '') ? e.message : (e.message || 'Failed to parse resume')
        message.error(msg)
        addChat('ai', msg + ' Try a text-based PDF/DOCX or a smaller file.')
      }
    },
    showUploadList: false,
  }

  function startTheInterview(id) {
    const questions = generateQuestions()
    dispatch(setQuestions({ id, questions }))
    dispatch(startInterview())
    addChat('ai', 'We will run a timed interview: 2 Easy (20s), 2 Medium (60s), 2 Hard (120s). Answer each within the time.', id)
    const firstQ = questions[0]
    addChat('ai', `[${firstQ.difficulty}] ${firstQ.prompt}`, id)
  }

  function handleFieldSubmit() {
    if (!candidate) return
    const trimmed = inputValue.trim()
    if (!trimmed) return
    // Determine what field is missing next
    const order = ['name', 'email', 'phone']
    const nextMissing = order.find((f) => !candidate[f])
    if (nextMissing) {
      let value = trimmed
      let errorMsg = ''

      if (nextMissing === 'name') {
        // Allow only letters and spaces; remove digits/special chars
        value = value.replace(/[^A-Za-z\s]/g, '').replace(/\s+/g, ' ').trim()
        if (!value || value.replace(/\s/g, '').length < 2) {
          errorMsg = 'Please enter your name using letters only (no numbers or special characters).'
        }
      } else if (nextMissing === 'email') {
        // Normalize spaces and lowercase; accept inputs like user@gmailcom by converting to user@gmail.com
        let raw = value.toLowerCase().replace(/\s+/g, '')
        if (!raw.includes('@')) {
          errorMsg = 'Please include an @ in your email (e.g., name@gmail.com).'
        } else {
          raw = raw.replace(/gmailcom$/, 'gmail.com')
          value = raw
        }
      } else if (nextMissing === 'phone') {
        // Digits only; require at least 10 digits
        const digits = value.replace(/\D/g, '')
        if (digits.length < 10) {
          errorMsg = 'Please enter a valid phone number with digits only (min 10 digits).'
        } else {
          value = digits
        }
      }

      if (errorMsg) {
        message.error(errorMsg)
        addChat('ai', errorMsg)
        return
      }

      dispatch(updateCandidateFields({ id: candidate.id, fields: { [nextMissing]: value } }))
      addChat('user', trimmed)
      const stillMissing = order.find((f) => !candidate[f] && f !== nextMissing)
      if (stillMissing) {
        addChat('ai', `Thanks. Next, please provide your ${stillMissing}.`)
      } else {
        addChat('ai', 'Great, we have all details. Starting the interview now.')
        startTheInterview(candidate.id)
      }
      setInputValue('')
    }
  }

  function handleSubmitAnswer(forceText) {
    if (!candidate || !candidate.questions) return
    const q = candidate.questions[session.currentQuestionIndex]
    if (!q) return
    const answerText = typeof forceText === 'string' ? forceText : inputValue
    const start = session.currentQuestionStartAt
    const timeTaken = start ? Math.round((Date.now() - start) / 1000) : null
    const aiScore = scoreAnswer(q, answerText)
    dispatch(
      recordAnswer({ id: candidate.id, questionIndex: session.currentQuestionIndex, answer: answerText, aiScore, timeTaken, answeredAt: Date.now() })
    )
    addChat('user', answerText)
    setInputValue('')

    const nextIdx = session.currentQuestionIndex + 1
    if (nextIdx < candidate.questions.length) {
      dispatch(nextQuestion())
      const nextQ = candidate.questions[nextIdx]
      addChat('ai', `[${nextQ.difficulty}] ${nextQ.prompt}`)
    } else {
      dispatch(completeInterview())
      const { finalScore, summary } = summarizeCandidate(candidate)
      dispatch(finalizeCandidate({ id: candidate.id, finalScore, summary }))
      addChat('ai', `Interview completed. Final Score: ${finalScore}. Summary: ${summary}`)
      message.success('Interview completed')
    }
  }

  const isCollecting = session.stage === 'collecting'
  const isInterview = session.stage === 'interview'
  const currentQ = candidate?.questions?.[session.currentQuestionIndex]
  const deadline = currentQ ? (session.currentQuestionStartAt || Date.now()) + (currentQ.timeLimit * 1000) : null

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="Upload Resume (PDF/DOCX)" extra={session.stage === 'completed' ? <Button onClick={() => dispatch(resetSession())}>Start New Interview</Button> : null}>
        <Dragger {...uploadProps} disabled={session.stage === 'interview'}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag file to this area to upload</p>
          <p className="ant-upload-hint">PDF required, DOCX optional. We will extract Name, Email, Phone.</p>
        </Dragger>
      </Card>

      <Card title="Chat" bodyStyle={{ textAlign: 'center', fontSize: 18 }}>
        <List
          size="small"
          bordered
          dataSource={chatHistory}
          renderItem={(m) => (
            <List.Item style={{ justifyContent: 'center' }}>
              <Space>
                <Text strong>{m.role === 'ai' ? 'Assistant:' : 'You:'}</Text>
                <Text>{m.content}</Text>
              </Space>
            </List.Item>
          )}
          style={{ maxHeight: 300, overflowY: 'auto' }}
        />
        <Space style={{ marginTop: 12, width: '100%', display: 'flex', justifyContent: 'center' }}>
          {isCollecting && (
            <>
              <Input
                placeholder="Provide missing field (Name/Email/Phone)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={handleFieldSubmit}
              />
              <Button type="primary" onClick={handleFieldSubmit}>
                Submit
              </Button>
            </>
          )}

          {isInterview && (
            <>
              <Input.TextArea style={{ fontSize: 18, width: '80%' }}
                placeholder="Type your answer"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoSize={{ minRows: 4, maxRows: 8 }}
              />
              <Button type="primary" onClick={() => handleSubmitAnswer()}>Submit Answer</Button>
            </>
          )}
        </Space>

        {isInterview && currentQ && (
          <Space style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>Question {session.currentQuestionIndex + 1} of {candidate.questions.length} — Difficulty: {currentQ.difficulty}</Text>
            <Text style={{ fontSize: 20 }}>Time Limit: {currentQ.timeLimit}s</Text>
            {deadline && (
              <Statistic.Countdown
                title="Time Remaining"
                value={deadline}
                format="s[s]"
              />
            )}
          </Space>
        )}
      </Card>
    </Space>
  )
}


