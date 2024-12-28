import React, { useState } from 'react';
import Header from './components/header';
import Footer from './components/footer';

const Quiz = () => {
    const [topic, setTopic] = useState('');
    const [subTopic, setSubTopic] = useState('');
    const [questionType, setQuestionType] = useState('');
    const [numQuestions, setNumQuestions] = useState('');
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Track the current question
    const [showAnswer, setShowAnswer] = useState(false); // Toggle answer visibility
    const [loding, setLoading] = useState(false);

    const topicMapping = {
        OS: ["OS Basics", "Structure of OS", "Types of OS", "Process Management", "CPU Scheduling", "Threads", "Process Synchronization", "Critical Section Problem", "Deadlocks", "Memory Management", "Page Replacement", "Storage Management"],
        DBMS: ["Basics of DBMS", "ER Model", "Relational Model", "Relational Algebra", "Functional Dependencies", "Normalisation", "TnC Control", "Indexing, B and B+ Trees", "File Organisation"],
        Java: ["Data Types", "Operators", "Control Statements", "Loops", "Arrays", "Strings", "Classes", "Interfaces", "Packages", "OOPS", "Exceptions", "Multithreading", "Collections", "File Handling", "JDBC"],
        JavaScript: ["Basics", "Variables", "Operators", "Control Statements", "Functions", "Arrays", "Objects", "DOM", "Events", "ES6", "AJAX", "JSON", "NodeJS", "ReactJS", "AngularJS", "VueJS"]
    };

    const handleSubmit = async () => {
        setError('');
        setQuestions([]);
        setCurrentQuestionIndex(0); // Reset question index
        setShowAnswer(false); // Hide answer by default
        setLoading(true);

        if (!topic || !subTopic || !questionType || !numQuestions) {
            setError('Please select all fields');
            return;
        }

        try {
            const email = localStorage.getItem('email');
            if (!email) {
                setError('Email is required. Please log in again.');
                console.error('No email found in localStorage.');
                return;
            }
            console.log("Sending request to server:", { topic, subTopic, questionType, numQuestions, email });

            const response = await fetch('http://localhost:5001/api/generate-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, subTopic, questionType, numQuestions, email }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Received data:', data);
                if (data && Array.isArray(data.questions)) {
                    setQuestions(data.questions);
                } else {
                    setError('No questions generated or invalid response format.');
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Failed to fetch questions');
            }
        } catch (error) {
            setError('Error fetching data: ' + error.message);
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setShowAnswer(false); // Hide answer for the next question
        }
    };

    const handleBack = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
            setShowAnswer(false); // Hide answer for the previous question
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <section style={{ flex: 1, padding: '0', paddingTop: '6%' }}>
                <div style={styles.formContainer}>
                    <select style={styles.dropdown} value={topic} onChange={(e) => { 
                        setTopic(e.target.value); 
                        setSubTopic('');
                    }}>
                        <option value="">Select Topic</option>
                        {Object.keys(topicMapping).map((key) => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                    <select style={styles.dropdown} value={subTopic} onChange={(e) => setSubTopic(e.target.value)}>
                        <option value="">Select Subtopic</option>
                        {topic && topicMapping[topic].map((sub, index) => (
                            <option key={index} value={sub}>{sub}</option>
                        ))}
                    </select>
                    <select style={styles.dropdown} value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                        <option value="">Select Question Type</option>
                        <option value="mcq">MCQ's</option>
                        <option value="short_qa">Short Answers</option>
                    </select>
                    <select style={styles.dropdown} value={numQuestions} onChange={(e) => setNumQuestions(e.target.value)}>
                        <option value="">Select Number of Questions</option>
                        {[1, 2, 3, 4, 5].map((num) => (
                            <option key={num} value={num}>{num}</option>
                        ))}
                    </select>
                    <button
                        style={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={!topic || !subTopic || !questionType || !numQuestions}
                    >
                        Submit
                    </button>
                </div>
                <hr style={styles.blackLine} />
                <div style={styles.questionBox}>
                    <h3 style={styles.questionTitle}>Generated Questions:</h3>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                    {questions.length > 0 ? (
                        <div style={styles.questionItem}>
                            <p><strong>Q{currentQuestionIndex + 1}:</strong> {questions[currentQuestionIndex].question}</p>
                            {showAnswer ? (
                                <p><strong>Answer:</strong> {questions[currentQuestionIndex].answer}</p>
                            ) : (
                                <button
                                    onClick={() => setShowAnswer(true)}
                                    style={styles.showAnswerButton}
                                >
                                    Show Answer
                                </button>
                            )}
                            <hr style={styles.blackLine} />
                            <div style={styles.navigationButtons}>
                                <button
                                    onClick={handleBack}
                                    disabled={currentQuestionIndex === 0}
                                    style={styles.navButton}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={currentQuestionIndex === questions.length - 1}
                                    style={styles.navButton}
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    ) : (
                        loding ? (
                            <p>Questions are being generated...</p>
                        ) : (
                            <p style={styles.noQuestions}>No questions generated</p>
                        )
                        
                    )}
                </div>
            </section>
            <Footer />
        </div>
    );
};

const styles = {
    showAnswerButton: {
        padding: '8px 15px',
        backgroundColor: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    navigationButtons: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px',
    },
    navButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    formContainer: {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        maxWidth: '55%',
        margin: 'auto',
        marginTop: '20px',
        flexWrap: 'wrap',
    },
    dropdown: {
        marginRight: '10px',
        marginBottom: '10px',
        padding: '5px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        flex: '1 1 200px',
    },
    submitButton: {
        padding: '8px 15px',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        flex: '1 1 auto',
    },
    blackLine: {
        border: 'none',
        borderTop: '2px solid black',
        width: '80%',
        margin: '20px auto',
    },
    questionBox: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        maxWidth: '60%',
        margin: '20px auto',
        backgroundColor: '#f9f9f9',
    },
    questionTitle: {
        marginBottom: '10px',
    },
    questionList: {
        listStyleType: 'none',
        padding: 0,
    },
    questionItem: {
        marginBottom: '20px',
        textAlign: 'left',
    },
    noQuestions: {
        color: '#999',
    },
};

export default Quiz;
