import { useState, useEffect } from 'react';
import { useAuth } from "react-oidc-context";
import '@cloudscape-design/global-styles/index.css';

import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { applyTheme } from '@cloudscape-design/components/theming';

import AppLayout from '@cloudscape-design/components/app-layout';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import Container from '@cloudscape-design/components/container';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Input from '@cloudscape-design/components/input';
import Button from '@cloudscape-design/components/button';
import Box from '@cloudscape-design/components/box';
import Tabs from '@cloudscape-design/components/tabs';
import Select from '@cloudscape-design/components/select';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import FormField from '@cloudscape-design/components/form-field';
import Tiles from '@cloudscape-design/components/tiles';
import Alert from '@cloudscape-design/components/alert';
import Spinner from '@cloudscape-design/components/spinner'; 

export default function App() {
  const auth = useAuth(); 

  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false); 

  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Jay Swaminarayan! Let me know what you need help with today.' }
  ]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  const [quizStarted, setQuizStarted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [chosenAnswer, setChosenAnswer] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // Apply Theme
  useEffect(() => {
    applyMode(isDarkMode ? Mode.Dark : Mode.Light);
    applyTheme({
      theme: {
        tokens: {
          colorBackgroundButtonPrimaryDefault: '#f07d00', 
          colorBackgroundButtonPrimaryHover: '#d16d00',
          colorBackgroundButtonPrimaryActive: '#b35d00',
          colorTextAccent: '#f07d00',
          colorBorderButtonNormalActive: '#f07d00',
        }
      }
    });
  }, [isDarkMode]);

  // NEW: Fetch Chat History on Load
  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.id_token && !isHistoryLoaded) {
      const loadHistory = async () => {
        try {
          const response = await fetch("https://0oix9kxtwj.execute-api.us-east-1.amazonaws.com/chat", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${auth.user.id_token}` 
            },
            body: JSON.stringify({ action: "get_history" })
          });
          const data = await response.json();
          if (data.history && data.history.length > 0) {
            setMessages([
              { sender: 'bot', text: 'Jay Swaminarayan! Welcome back. Here is your conversation history:' },
              ...data.history
            ]);
          }
        } catch (err) {
          console.error("Could not load history from DynamoDB:", err);
        } finally {
          setIsHistoryLoaded(true);
        }
      };
      loadHistory();
    }
  }, [auth.isAuthenticated, auth.user, isHistoryLoaded]);

  const signOutRedirect = async () => {
    await auth.removeUser();
    const clientId = "etvj75eakdlr5n4soh2qm6h53";
    const logoutUri = "https://d9fy86td1wwlq.cloudfront.net/"; 
    const cognitoDomain = "https://us-east-1v8bbaldsn.auth.us-east-1.amazoncognito.com";
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  const examOptions = [
    { label: "Satsang Prarambha", value: "prarambha" },
    { label: "Satsang Pravesh", value: "pravesh" },
    { label: "Satsang Parichay", value: "parichay" },
    { label: "Satsang Pravin", value: "pravin" }
  ];

  const bookMapping = {
    prarambha: [
      { label: "Ghanshyam Charitra", value: "Ghanshyam-Charitra.pdf" },
      { label: "Kishore Satsang Prarambha", value: "KS-Prarambha.pdf" },
      { label: "Yogiji Maharaj", value: "Yogiji-Maharaj.pdf" }
    ],
    pravesh: [
      { label: "Nilkanth Charitra", value: "Nilkanth-Charitra.pdf" },
      { label: "Kishore Satsang Pravesh", value: "Kishore-Satsang-Pravesh.pdf" },
      { label: "Satsang Reader Part 1", value: "SE-Satsang-Reader-Part-1.pdf" },
      { label: "Shastriji Maharaj", value: "" }
    ],
    parichay: [
      { label: "Sahajanand Charitra", value: "Sahajanand-Charitra.pdf" },
      { label: "Satsang Reader Part 2", value: "Satsang-Reader-Part-2.pdf" },
      { label: "Kishore Satsang Parichay", value: "Kishore-Satsang-Parichay.pdf" },
      { label: "Pragji Bhakta", value: "Pragji-Bhakta.pdf" }
    ],
    pravin: [
      { label: "Akshar-Purushottam Upasana", value: "Akshar-Purushottam-Upasana.pdf" },
      { label: "Satsang Reader Part 3", value: "Satsang-Reader-Part-3.pdf" },
      { label: "Portraits of Inspiration", value: "Portraits-of-Inspiration.pdf" },
      { label: "Kishore Satsang Pravin", value: "Kishore-Satsang-Pravin.pdf" },
      { label: "Gunatitanand Swami", value: "Pravin-Gunatitanand-Swami.pdf" }
    ]
  };

  const availableBooks = selectedExam ? bookMapping[selectedExam.value] : [];

  const handleExamChange = (detail) => {
    setSelectedExam(detail.selectedOption);
    setSelectedBook(null); 
    resetQuizState();
  };

  const handleBookChange = (detail) => {
    setSelectedBook(detail.selectedOption);
    resetQuizState();
  };

  const resetQuizState = () => {
    setQuizStarted(false);
    setQuizError(null); 
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setChosenAnswer('');
    setIsAnswerSubmitted(false);
    setScore(0);
  };

  const handleSubmitAnswer = () => {
    if (!chosenAnswer) return;
    setIsAnswerSubmitted(true);
    if (chosenAnswer === questions[currentQuestionIdx].correct) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    setChosenAnswer('');
    setIsAnswerSubmitted(false);
    setCurrentQuestionIdx(currentQuestionIdx + 1);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputValue('');
    setMessages((prev) => [...prev, { sender: 'bot', text: 'Thinking...' }]);

    try {
      const response = await fetch("https://0oix9kxtwj.execute-api.us-east-1.amazonaws.com/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.user?.id_token}` 
        },
        body: JSON.stringify({ 
          action: "chat",
          message: userText,
          book: selectedBook ? selectedBook.value : "General"
        })
      });

      const data = await response.json();
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { 
          sender: 'bot', 
          text: data.answer || data.error || "Error reading response." 
        };
        return newMessages;
      });

    } catch (error) {
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { sender: 'bot', text: `Error: ${error.message}` };
        return newMessages;
      });
    }
  };

  const handleStartQuiz = async () => {
    resetQuizState();
    setQuizLoading(true);

    try {
      const response = await fetch("https://0oix9kxtwj.execute-api.us-east-1.amazonaws.com/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${auth.user?.id_token}` 
        },
        body: JSON.stringify({
          action: "generate_quiz",
          exam: selectedExam.value,
          book: selectedBook.value
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        setQuizError(data.error); 
      } else if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions); 
        setQuizStarted(true);
      } else {
        setQuizError("Received an empty response from the AI. Please try again.");
      }
    } catch (error) {
      setQuizError(`Connection failed: ${error.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  if (auth.isLoading) return <Box textAlign="center" padding="xxl"><Spinner size="large" /><Box variant="h3">Authenticating...</Box></Box>;
  if (auth.error) return <Box textAlign="center" padding="xxl"><Alert type="error">{auth.error.message}</Alert></Box>;
  
  if (!auth.isAuthenticated) {
    return (
      <Box textAlign="center" padding="xxl" margin={{ top: 'xxl' }}>
        <Container>
          <SpaceBetween direction="vertical" size="xl">
            <Box variant="h1" fontSize="heading-xl" fontWeight="bold">{"Satsang Exam Study Assistant"}</Box>
            <Box variant="p" color="text-status-inactive">{"Please sign in to access your study materials."}</Box>
            <Button variant="primary" onClick={() => auth.signinRedirect()}>{"Sign In / Register"}</Button>
            
            {/* NEW: Spam Folder Warning */}
            <Box variant="small" color="text-status-inactive" padding={{ top: 's' }}>
              {"Note: When registering for a new account, please check your "}<strong>{"spam/junk folder"}</strong>{" for the verification code."}
            </Box>

          </SpaceBetween>
        </Container>
      </Box>
    );
  }

  return (
    <>
      <TopNavigation
        identity={{ href: '#', title: 'Study Assistant' }}
        utilities={[
          { type: 'button', text: isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode', onClick: () => setIsDarkMode(!isDarkMode) },
          { type: 'button', text: 'Sign Out', onClick: () => signOutRedirect() }
        ]}
      />
      <AppLayout
        navigationHide={true} toolsHide={true}      
        content={
          <Box margin={{ top: 'xxl', bottom: 'l' }} padding={{ horizontal: 'xxl' }}>
            <Box textAlign="center" margin={{ bottom: 'xl' }}>
              <Box variant="h1" fontSize="heading-xl" fontWeight="bold">{"Satsang Exam Study Assistant"}</Box>
              <Box variant="p" color="text-status-inactive" fontSize="heading-m">{"Here to help you earn Bapa's raajipo"}</Box>
            </Box>

            <Container>
              <SpaceBetween direction="vertical" size="l">
                <Tabs
                  activeTabId={activeTab}
                  onChange={({ detail }) => { setActiveTab(detail.activeTabId); resetQuizState(); }}
                  tabs={[ { label: "Chat Mode", id: "chat" }, { label: "Practice Questions", id: "practice" } ]}
                />

                <ColumnLayout columns={2} borders="vertical">
                  <FormField label="Select Exam">
                    <Select selectedOption={selectedExam} onChange={({ detail }) => handleExamChange(detail)} options={examOptions} placeholder="Choose an exam..." />
                  </FormField>
                  <FormField label="Select Book">
                    <Select selectedOption={selectedBook} onChange={({ detail }) => handleBookChange(detail)} options={availableBooks} placeholder={selectedExam ? "Choose a book..." : "Please select an exam first"} disabled={!selectedExam} />
                  </FormField>
                </ColumnLayout>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-border-divider-default)', margin: '10px 0' }} />

                {activeTab === 'chat' && (
                  <SpaceBetween direction="vertical" size="l">
                    <div style={{ height: '40vh', overflowY: 'auto', padding: '15px', backgroundColor: 'var(--color-background-layout-main)', borderRadius: '8px', border: '1px solid var(--color-border-divider-default)' }}>
                      <SpaceBetween direction="vertical" size="m">
                        {messages.map((msg, index) => (
                          <Box key={index} padding="s" style={{ backgroundColor: msg.sender === 'user' ? '#f07d00' : 'var(--color-background-container-content)', color: msg.sender === 'user' ? '#ffffff' : 'var(--color-text-body-default)', borderRadius: '8px', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', boxShadow: 'var(--shadow-container)', border: msg.sender === 'bot' ? '1px solid var(--color-border-divider-default)' : 'none' }}>
                            <strong>{msg.sender === 'user' ? 'You' : 'AI Assistant'}:</strong> {msg.text}
                          </Box>
                        ))}
                      </SpaceBetween>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ flexGrow: 1 }}>
                        <Input value={inputValue} onChange={({ detail }) => setInputValue(detail.value)} onKeyDown={({ detail }) => { if (detail.keyCode === 13) handleSendMessage(); }} placeholder="Ask any question..." disabled={!selectedExam || !selectedBook} />
                      </div>
                      <Button variant="primary" onClick={handleSendMessage} disabled={!selectedExam || !selectedBook}>{"Ask Question"}</Button>
                    </div>
                  </SpaceBetween>
                )}

                {activeTab === 'practice' && (
                  <Box padding={{ vertical: 'm' }}>
                    {!selectedExam || !selectedBook ? (
                      <Box textAlign="center" padding="xxl" color="text-status-inactive">{"Please select an Exam and a Book above to generate practice questions."}</Box>
                    ) : quizLoading ? (
                      <Box textAlign="center" padding="xxl" color="text-status-inactive">{"Generating custom questions from the Knowledge Base..."}</Box>
                    ) : quizError ? (
                      <Box textAlign="center" padding="xxl">
                        <SpaceBetween direction="vertical" size="m">
                          <Alert type="error" header="Quiz Generation Failed">{quizError}</Alert>
                          <Button onClick={handleStartQuiz}>{"Try Again"}</Button>
                        </SpaceBetween>
                      </Box>
                    ) : !quizStarted ? (
                      <Box textAlign="center" padding="xxl">
                        <SpaceBetween direction="vertical" size="m">
                          <Box variant="h3">{"Ready to test your knowledge?"}</Box>
                          <Box variant="p" color="text-status-inactive">{"Generate a live quiz directly from the text of "}<strong>{selectedBook.label}</strong>{"."}</Box>
                          <Button variant="primary" onClick={handleStartQuiz}>{"Generate Practice Quiz"}</Button>
                        </SpaceBetween>
                      </Box>
                    ) : currentQuestionIdx < questions.length ? (
                      <SpaceBetween direction="vertical" size="xl">
                        <Box variant="small" decimalPadding="none"><strong>{"Question "}{currentQuestionIdx + 1}{" of "}{questions.length}</strong></Box>
                        <Box fontSize="heading-m" fontWeight="bold">{questions[currentQuestionIdx].question}</Box>
                        <FormField label="Choose the correct alternative:">
                          <Tiles onChange={({ detail }) => !isAnswerSubmitted && setChosenAnswer(detail.value)} value={chosenAnswer} items={(questions[currentQuestionIdx]?.options || []).map(opt => typeof opt === 'string' ? { label: opt, value: opt } : opt)} />
                        </FormField>
                        {isAnswerSubmitted && (
                          <Alert type={chosenAnswer === questions[currentQuestionIdx].correct ? "success" : "error"} header={chosenAnswer === questions[currentQuestionIdx].correct ? "Correct Answer!" : "Incorrect Answer"}>
                            {questions[currentQuestionIdx].explanation}
                          </Alert>
                        )}
                        <Box textAlign="right">
                          {!isAnswerSubmitted ? (
                            <Button variant="primary" onClick={handleSubmitAnswer} disabled={!chosenAnswer}>{"Submit Answer"}</Button>
                          ) : (
                            <Button variant="primary" onClick={handleNextQuestion}>{currentQuestionIdx + 1 === questions.length ? "Finish Quiz" : "Next Question"}</Button>
                          )}
                        </Box>
                      </SpaceBetween>
                    ) : (
                      <Box textAlign="center" padding="xxl">
                        <SpaceBetween direction="vertical" size="m">
                          <Box variant="h2">{"Quiz Completed! 🎉"}</Box>
                          <Box fontSize="heading-xl" fontWeight="bold" color="text-status-success">{"Your Score: "}{score}{" / "}{questions.length}</Box>
                          {/* NEW: Button text updated to Generate Quiz */}
                          <Button onClick={handleStartQuiz}>{"Generate Quiz"}</Button>
                        </SpaceBetween>
                      </Box>
                    )}
                  </Box>
                )}

              </SpaceBetween>
            </Container>
          </Box>
        }
      />
    </>
  );
}