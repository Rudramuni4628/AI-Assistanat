import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from 'antd'
import { resetSession, startInterview } from '../slices/sessionSlice'

export default function WelcomeBackModal() {
  const session = useSelector((s) => s.session)
  const hasAnyCandidates = useSelector((s) => (s.candidates.list || []).length > 0)
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Show startup modal only for a true fresh session: no candidate yet and idle
  const isFreshStart = !session.currentCandidateId && session.stage === 'idle' && !hasAnyCandidates
  // Unfinished session includes collecting or interview stages. Only show on initial app load,
  // not when a new upload transitions into collecting during the same session.
  const unfinishedSession = !!session.currentCandidateId && session.stage !== 'completed'

  useEffect(() => {
    // Always show the startup modal when it's a true fresh start
    if (isFreshStart) {
      setOpen(true)
      return
    }

    // Show Welcome Back only once on initial app load if there is an unfinished session
    if (!initialized) {
      setInitialized(true)
      if (unfinishedSession) {
        setOpen(true)
      } else {
        setOpen(false)
      }
    } else {
      // After initialization, do not show Welcome Back for state transitions like upload
      setOpen(false)
    }
  }, [isFreshStart, unfinishedSession, initialized])

  function handleResume() {
    setOpen(false)
    if (session.stage === 'collecting' || session.stage === 'idle') {
      // resume collecting by leaving as is
    } else if (session.stage === 'interview' && !session.currentQuestionStartAt) {
      dispatch(startInterview())
    }
  }

  function handleRestart() {
    setOpen(false)
    dispatch(resetSession())
  }

  function handleStartInterview() {
    // For a fresh start, just close the modal and guide user to upload
    setOpen(false)
  }

  return (
    <Modal
      title={isFreshStart ? 'Welcome to Interview' : 'Welcome Back'}
      open={open}
      onOk={isFreshStart ? handleStartInterview : handleResume}
      onCancel={isFreshStart ? () => setOpen(false) : handleRestart}
      okText={isFreshStart ? 'Start Interview' : 'Resume'}
      cancelText={isFreshStart ? 'Close' : 'Start Over'}
    >
      {isFreshStart
        ? 'Upload your resume to start the interview.'
        : 'It looks like you have an unfinished session. Would you like to resume?'}
    </Modal>
  )
}