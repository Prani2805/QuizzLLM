import React, { useState } from 'react';
import Header from './components/header';
import Footer from './components/footer';

const Cquiz = () => {
    const [file, setFile] = useState(null);
    const [questionType, setQuestionType] = useState('');
    const [numQuestions, setNumQuestions] = useState('');
    const [questions, setQuestions] = useState([]);
    const [error, setError] = useState('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // Track the current question
    const [showAnswer, setShowAnswer] = useState(false); // Toggle answer visibility
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setQuestions([]); // Clear previous questions on new submission
        setCurrentQuestionIndex(0); // Reset question index
        setShowAnswer(false); // Hide answer by default
        setLoading(true);
    
        if (!file || !questionType || !numQuestions) {
            setError('Please upload a file and select all fields');
            return;
        }
    
        // Retrieve email from localStorage
        const email = localStorage.getItem('email');
        if (!email) {
            setError('Email is required. Please log in again.');
            console.error('No email found in localStorage.');
            return;
        }
    
        const formData = new FormData();
        formData.append('file', file);
        formData.append('questionType', questionType);
        formData.append('numQuestions', numQuestions);
        formData.append('email', email); // Add the email to the FormData
    
        try {
            const response = await fetch('http://localhost:5001/api/upload-and-generate-questions', {
                method: 'POST',
                body: formData,
            });
    
            if (response.ok) {
                const data = await response.json();
                console.log('Received data:', data);
    
                if (data && data.questions && Array.isArray(data.questions)) {
                    const parsedQuestions = data.questions.map((q) => ({
                        question: q.question || 'No question text available',
                        answer: q.answer || 'No answer available',
                        context: q.context || 'No context provided',
                    }));
                    setQuestions(parsedQuestions);
                } else {
                    console.error('Invalid data format or no questions found:', data);
                    setError('No questions generated or invalid data format.');
                }
            } else {
                const errorText = await response.text();
                console.error('Backend error:', errorText);
                setError('Failed to fetch questions: ' + errorText);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Error fetching data: ' + error.message);
        }
    };
    
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
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
                    <select
                        style={styles.dropdown}
                        value={questionType}
                        onChange={(e) => setQuestionType(e.target.value)}
                    >
                        <option value="">Select Question Type</option>
                        <option value="mcq">MCQ's</option>
                        {/* <option value="True_or_false">Booleans</option> */}
                        <option value="short_qa">Short Answers</option>
                        {/* <option value="fill_in_the_blanks">Fill in the blanks</option> */}
                    </select>
                    <select
                        style={styles.dropdown}
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(e.target.value)}
                    >
                        <option value="">Select Number of Questions</option>
                        {[1, 2, 3, 4, 5].map((num) => (
                            <option key={num} value={num}>
                                {num}
                            </option>
                        ))}
                    </select>
                    <input
                        type="file"
                        accept=".txt,.pdf,.docx"
                        onChange={handleFileChange}
                        style={styles.fileInput}
                    />
                    <button
                        style={styles.submitButton}
                        onClick={handleSubmit}
                        disabled={!file || !questionType || !numQuestions}
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
                        loading ? (
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
    fileInput: {
        marginRight: '10px',
        marginBottom: '10px',
        flex: '1 1 auto',
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

export default Cquiz;
