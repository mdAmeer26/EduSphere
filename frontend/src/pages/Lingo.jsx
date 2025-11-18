import React, { useEffect, useState } from 'react'

export default function Lingo() {
  const [view, setView] = useState('courses')
  const [languages, setLanguages] = useState([
    { id: 'spanish', name: 'Spanish', flag: '🇪🇸', level: 0, xp: 0, streak: 0, wordsLearned: 0, progress: 0 },
    { id: 'french', name: 'French', flag: '🇫🇷', level: 0, xp: 0, streak: 0, wordsLearned: 0, progress: 0 },
    { id: 'german', name: 'German', flag: '🇩🇪', level: 0, xp: 0, streak: 0, wordsLearned: 0, progress: 0 },
    { id: 'japanese', name: 'Japanese', flag: '🇯🇵', level: 0, xp: 0, streak: 0, wordsLearned: 0, progress: 0 },
    { id: 'italian', name: 'Italian', flag: '🇮🇹', level: 0, xp: 0, streak: 0, wordsLearned: 0, progress: 0 },
    { id: 'portuguese', name: 'Portuguese', flag: '🇵🇹', level: 0, xp: 0, streak: 0, wordsLearned: 0, progress: 0 }
  ])
  const [selectedLang, setSelectedLang] = useState(null)
  const [currentLesson, setCurrentLesson] = useState(null)
  const [lessons, setLessons] = useState([])
  const [completedLessons, setCompletedLessons] = useState([])
  const [progress, setProgress] = useState({ totalXp: 0, streak: 0, lessonsCompleted: 0, accuracy: 0, dailyGoal: 50, todayXp: 0 })
  
  const [exercise, setExercise] = useState(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)
  const [hearts, setHearts] = useState(5)
  const [showHint, setShowHint] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // Text-to-Speech function
  function speak(text, lang = 'es-ES') {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.8
      setIsPlaying(true)
      utterance.onend = () => setIsPlaying(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  useEffect(() => {
    loadProgress()
  }, [])

  function loadProgress() {
    setProgress({
      totalXp: 0,
      streak: 0,
      lessonsCompleted: 0,
      accuracy: 0,
      dailyGoal: 50,
      todayXp: 0
    })
  }

  function selectLanguage(lang) {
    setSelectedLang(lang)
    setView('lesson')
    generateLessons(lang.id)
  }

  function generateLessons(langId) {
    // Progressive learning path: Alphabet → Words → Phrases → Sentences → Paragraphs
    const spanishLessons = [
      // Level 1: Alphabet & Sounds (🔒 unlocked by default)
      { id: 1, title: 'Spanish Alphabet (A-E)', level: 1, xp: 20, completed: false, locked: false, icon: '🔤', 
        desc: 'Learn letters A, B, C, D, E with pronunciation' },
      { id: 2, title: 'Spanish Alphabet (F-J)', level: 1, xp: 20, completed: false, locked: true, icon: '🔤',
        desc: 'Learn letters F, G, H, I, J with sounds' },
      { id: 3, title: 'Spanish Alphabet (K-O)', level: 1, xp: 20, completed: false, locked: true, icon: '🔤',
        desc: 'Learn letters K, L, M, N, O' },
      { id: 4, title: 'Spanish Alphabet (P-T)', level: 1, xp: 20, completed: false, locked: true, icon: '🔤',
        desc: 'Learn letters P, Q, R, S, T' },
      { id: 5, title: 'Spanish Alphabet (U-Z)', level: 1, xp: 20, completed: false, locked: true, icon: '🔤',
        desc: 'Complete the alphabet: U, V, W, X, Y, Z' },
      
      // Level 2: Basic Words (10-20 essential words)
      { id: 6, title: 'Essential Words: Greetings', level: 2, xp: 30, completed: false, locked: true, icon: '👋',
        desc: 'Learn: Hola, Adiós, Buenos días, Buenas noches' },
      { id: 7, title: 'Essential Words: Politeness', level: 2, xp: 30, completed: false, locked: true, icon: '🙏',
        desc: 'Learn: Por favor, Gracias, De nada, Perdón' },
      { id: 8, title: 'Essential Words: Numbers 1-10', level: 2, xp: 30, completed: false, locked: true, icon: '🔢',
        desc: 'Count from uno to diez' },
      { id: 9, title: 'Essential Words: Colors', level: 2, xp: 30, completed: false, locked: true, icon: '🎨',
        desc: 'Learn: rojo, azul, verde, amarillo, negro, blanco' },
      { id: 10, title: 'Essential Words: Family', level: 2, xp: 30, completed: false, locked: true, icon: '👨‍👩‍👧',
        desc: 'Learn: madre, padre, hermano, hermana, hijo, hija' },
      
      // Level 3: Simple Phrases (2-3 word combinations)
      { id: 11, title: 'Simple Phrases: Introductions', level: 3, xp: 40, completed: false, locked: true, icon: '🗣️',
        desc: 'Me llamo..., ¿Cómo te llamas?, Mucho gusto' },
      { id: 12, title: 'Simple Phrases: Questions', level: 3, xp: 40, completed: false, locked: true, icon: '❓',
        desc: '¿Qué es esto?, ¿Cuánto cuesta?, ¿Dónde está?' },
      { id: 13, title: 'Simple Phrases: Responses', level: 3, xp: 40, completed: false, locked: true, icon: '💬',
        desc: 'Sí señor, No gracias, Está bien, Claro que sí' },
      { id: 14, title: 'Simple Phrases: Daily Life', level: 3, xp: 40, completed: false, locked: true, icon: '☀️',
        desc: 'Tengo hambre, Tengo sed, Estoy cansado' },
      
      // Level 4: Full Sentences (Subject + Verb + Object)
      { id: 15, title: 'Sentences: Present Tense', level: 4, xp: 50, completed: false, locked: true, icon: '📝',
        desc: 'Yo hablo español, Tú comes pan, Él lee libros' },
      { id: 16, title: 'Sentences: Questions & Answers', level: 4, xp: 50, completed: false, locked: true, icon: '🤔',
        desc: '¿Hablas inglés? - Sí, hablo inglés' },
      { id: 17, title: 'Sentences: Descriptions', level: 4, xp: 50, completed: false, locked: true, icon: '🖼️',
        desc: 'El gato es negro, La casa es grande' },
      { id: 18, title: 'Sentences: Actions', level: 4, xp: 50, completed: false, locked: true, icon: '🏃',
        desc: 'Yo camino al parque, Ella escribe una carta' },
      
      // Level 5: Short Paragraphs (3-5 connected sentences)
      { id: 19, title: 'Paragraph: My Day', level: 5, xp: 60, completed: false, locked: true, icon: '📅',
        desc: 'Describe your daily routine in 4-5 sentences' },
      { id: 20, title: 'Paragraph: My Family', level: 5, xp: 60, completed: false, locked: true, icon: '👨‍👩‍👧‍👦',
        desc: 'Write about your family members' },
      { id: 21, title: 'Paragraph: At the Restaurant', level: 5, xp: 60, completed: false, locked: true, icon: '🍽️',
        desc: 'Read and understand a dining conversation' },
      
      // Level 6: Long Paragraphs & Stories
      { id: 22, title: 'Story: A Trip to Spain', level: 6, xp: 80, completed: false, locked: true, icon: '✈️',
        desc: 'Read a 10-sentence story with comprehension' },
      { id: 23, title: 'Story: Market Shopping', level: 6, xp: 80, completed: false, locked: true, icon: '🛒',
        desc: 'Full dialogue at a Spanish market' },
      { id: 24, title: 'Story: Making Friends', level: 6, xp: 80, completed: false, locked: true, icon: '🤝',
        desc: 'Conversation between two new friends' }
    ]

    const frenchLessons = [
      { id: 1, title: 'French Alphabet (A-E)', level: 1, xp: 20, completed: false, locked: false, icon: '🔤',
        desc: 'Learn French letters with pronunciation' },
      { id: 2, title: 'French Alphabet (F-J)', level: 1, xp: 20, completed: false, locked: true, icon: '🔤',
        desc: 'Continue learning the alphabet' },
      { id: 3, title: 'Essential Words: Bonjour!', level: 2, xp: 30, completed: false, locked: true, icon: '👋',
        desc: 'Learn basic French greetings' },
      { id: 4, title: 'Essential Words: Numbers', level: 2, xp: 30, completed: false, locked: true, icon: '🔢',
        desc: 'Count from un to dix' },
      { id: 5, title: 'Simple Phrases: Je m\'appelle', level: 3, xp: 40, completed: false, locked: true, icon: '🗣️',
        desc: 'Introduce yourself in French' }
    ]

    const japLessons = [
      { id: 1, title: 'Hiragana: Vowels (あいうえお)', level: 1, xp: 25, completed: false, locked: false, icon: 'あ',
        desc: 'Learn the 5 basic vowel sounds' },
      { id: 2, title: 'Hiragana: K-row (かきくけこ)', level: 1, xp: 25, completed: false, locked: true, icon: 'か',
        desc: 'Learn ka, ki, ku, ke, ko' },
      { id: 3, title: 'Essential Words: Greetings', level: 2, xp: 30, completed: false, locked: true, icon: '👋',
        desc: 'こんにちは, ありがとう, さようなら' },
      { id: 4, title: 'Simple Phrases: Self-intro', level: 3, xp: 40, completed: false, locked: true, icon: '🗣️',
        desc: 'わたしは___です (I am ___)' }
    ]

    const lessonMap = {
      spanish: spanishLessons,
      french: frenchLessons,
      japanese: japLessons,
      german: spanishLessons.map(l => ({ ...l, title: l.title.replace('Spanish', 'German') })),
      italian: spanishLessons.map(l => ({ ...l, title: l.title.replace('Spanish', 'Italian') })),
      portuguese: spanishLessons.map(l => ({ ...l, title: l.title.replace('Spanish', 'Portuguese') }))
    }
    
    setLessons(lessonMap[langId] || spanishLessons)
  }

  function startLesson(lesson) {
    if (lesson.locked) {
      alert('🔒 Complete previous lessons first!')
      return
    }
    setCurrentLesson(lesson)
    setView('practice')
    setHearts(5)
    setScore(0)
    setQuestionsAnswered(0)
    generateExercise(lesson)
  }

  function generateExercise(lesson) {
    const langCode = selectedLang.id === 'spanish' ? 'es-ES' : selectedLang.id === 'french' ? 'fr-FR' : selectedLang.id === 'japanese' ? 'ja-JP' : 'es-ES'
    
    // Different exercises based on level
    let exercisePool = []
    
    if (lesson.level === 1) {
      // Alphabet level - letter recognition and pronunciation
      const letters = lesson.id === 1 ? ['A', 'B', 'C', 'D', 'E'] : 
                     lesson.id === 2 ? ['F', 'G', 'H', 'I', 'J'] :
                     lesson.id === 3 ? ['K', 'L', 'M', 'N', 'O'] :
                     lesson.id === 4 ? ['P', 'Q', 'R', 'S', 'T'] : ['U', 'V', 'W', 'X', 'Y', 'Z']
      
      exercisePool = letters.map(letter => ({
        type: 'alphabet',
        question: `🔊 Click to hear the letter, then type it`,
        word: letter,
        correctAnswer: letter.toLowerCase(),
        audioText: letter,
        langCode: langCode,
        hint: `The letter is ${letter}`
      }))
    } else if (lesson.level === 2) {
      // Word level - basic vocabulary with images and audio
      const wordData = {
        6: [ // Greetings
          { word: 'Hola', meaning: 'Hello', emoji: '👋' },
          { word: 'Adiós', meaning: 'Goodbye', emoji: '👋' },
          { word: 'Buenos días', meaning: 'Good morning', emoji: '☀️' },
          { word: 'Buenas noches', meaning: 'Good night', emoji: '🌙' }
        ],
        7: [ // Politeness
          { word: 'Por favor', meaning: 'Please', emoji: '🙏' },
          { word: 'Gracias', meaning: 'Thank you', emoji: '🙏' },
          { word: 'De nada', meaning: 'You\'re welcome', emoji: '😊' },
          { word: 'Perdón', meaning: 'Sorry', emoji: '😔' }
        ],
        8: [ // Numbers
          { word: 'uno', meaning: '1', emoji: '1️⃣' },
          { word: 'dos', meaning: '2', emoji: '2️⃣' },
          { word: 'tres', meaning: '3', emoji: '3️⃣' },
          { word: 'cuatro', meaning: '4', emoji: '4️⃣' },
          { word: 'cinco', meaning: '5', emoji: '5️⃣' }
        ]
      }
      
      const words = wordData[lesson.id] || wordData[6]
      exercisePool = words.flatMap(w => [
        {
          type: 'word_audio',
          question: `🔊 Listen and select the correct meaning`,
          word: w.word,
          emoji: w.emoji,
          correctAnswer: w.meaning.toLowerCase(),
          options: [w.meaning, ...words.filter(x => x !== w).slice(0, 3).map(x => x.meaning)],
          audioText: w.word,
          langCode: langCode,
          hint: `It means ${w.meaning}`
        },
        {
          type: 'word_translate',
          question: `Translate "${w.meaning}" to ${selectedLang.name}`,
          correctAnswer: w.word.toLowerCase(),
          options: [w.word, ...words.filter(x => x !== w).slice(0, 3).map(x => x.word)],
          audioText: w.word,
          langCode: langCode,
          hint: `Think about the greeting/word`
        }
      ])
    } else if (lesson.level === 3) {
      // Phrase level - 2-3 word combinations
      const phrases = [
        { phrase: 'Me llamo Juan', meaning: 'My name is Juan', audio: 'Me llamo Juan' },
        { phrase: '¿Cómo te llamas?', meaning: 'What is your name?', audio: '¿Cómo te llamas?' },
        { phrase: 'Mucho gusto', meaning: 'Nice to meet you', audio: 'Mucho gusto' },
        { phrase: '¿Qué es esto?', meaning: 'What is this?', audio: '¿Qué es esto?' }
      ]
      
      exercisePool = phrases.map(p => ({
        type: 'phrase',
        question: '🔊 Listen to the phrase and select meaning',
        word: p.phrase,
        correctAnswer: p.meaning.toLowerCase(),
        options: [p.meaning, ...phrases.filter(x => x !== p).slice(0, 3).map(x => x.meaning)],
        audioText: p.audio,
        langCode: langCode,
        hint: `Common Spanish phrase`
      }))
    } else if (lesson.level === 4) {
      // Sentence level - complete sentences
      const sentences = [
        { sentence: 'Yo hablo español', meaning: 'I speak Spanish', audio: 'Yo hablo español' },
        { sentence: 'Tú comes pan', meaning: 'You eat bread', audio: 'Tú comes pan' },
        { sentence: 'Él lee libros', meaning: 'He reads books', audio: 'Él lee libros' },
        { sentence: 'Nosotros vivimos aquí', meaning: 'We live here', audio: 'Nosotros vivimos aquí' }
      ]
      
      exercisePool = sentences.map(s => ({
        type: 'sentence',
        question: '🔊 Listen and translate the sentence',
        word: s.sentence,
        correctAnswer: s.meaning.toLowerCase(),
        options: [s.meaning, ...sentences.filter(x => x !== s).slice(0, 3).map(x => x.meaning)],
        audioText: s.audio,
        langCode: langCode,
        hint: `Full sentence translation`
      }))
    } else {
      // Paragraph level - longer texts
      exercisePool = [{
        type: 'paragraph',
        question: '🔊 Listen to the paragraph and answer',
        word: 'Me llamo María. Vivo en Madrid. Tengo dos hermanos. Me gusta leer libros.',
        correctAnswer: 'maría lives in madrid',
        options: ['María lives in Madrid', 'María lives in Barcelona', 'Juan lives in Madrid', 'María lives in Paris'],
        audioText: 'Me llamo María. Vivo en Madrid. Tengo dos hermanos. Me gusta leer libros.',
        langCode: langCode,
        context: 'Short paragraph about María',
        hint: `Listen carefully to where she lives`
      }]
    }
    
    const randomEx = exercisePool[Math.floor(Math.random() * exercisePool.length)]
    setExercise(randomEx)
    setUserAnswer('')
    setFeedback(null)
    setShowHint(false)
  }

  function checkAnswer() {
    if (!userAnswer.trim()) return
    
    const correct = userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase()
    setFeedback({
      correct,
      message: correct ? '✅ Correct! Great job!' : `❌ Incorrect. The answer is "${exercise.correctAnswer}"`,
      xp: correct ? (currentLesson.xp || 10) : 5
    })
    
    if (correct) {
      setScore(score + (currentLesson.xp || 10))
    } else {
      setHearts(hearts - 1)
      if (hearts <= 1) {
        alert('💔 Out of hearts! Lesson failed.')
        setView('lesson')
        setHearts(5)
        return
      }
    }
    setQuestionsAnswered(questionsAnswered + 1)
  }

  function nextExercise() {
    if (questionsAnswered >= 10) {
      // Complete lesson
      const updatedLessons = lessonTopics[selectedLang.id].map(lesson => {
        if (lesson.id === currentLesson.id) {
          return { ...lesson, completed: true, locked: false }
        }
        if (lesson.id === currentLesson.id + 1) {
          return { ...lesson, locked: false }
        }
        return lesson
      })
      
      lessonTopics[selectedLang.id] = updatedLessons
      
      const newCompletedLessons = [...completedLessons, currentLesson.id]
      setCompletedLessons(newCompletedLessons)
      
      const newXP = progress.xp + score
      const newLevel = Math.floor(newXP / 100)
      setProgress({
        ...progress,
        xp: newXP,
        level: newLevel,
        wordsLearned: progress.wordsLearned + 5
      })
      
      const updatedLanguages = languages.map(lang => {
        if (lang.id === selectedLang.id) {
          return {
            ...lang,
            xp: newXP,
            level: newLevel,
            wordsLearned: lang.wordsLearned + 5
          }
        }
        return lang
      })
      setLanguages(updatedLanguages)
      
      setView('lesson')
      setFeedback(null)
      setQuestionsAnswered(0)
      alert(`🎉 Lesson Complete!\n\n✨ +${score} XP\n📚 +5 Words Learned\n🔓 Next lesson unlocked!`)
      setScore(0)
    } else {
      generateExercise(currentLesson)
    }
  }

  function selectOption(option) {
    setUserAnswer(option)
  }

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui' }}>
      <header style={{ marginBottom: 30, textAlign: 'center' }}>
        <h1 style={{ fontSize: 42, margin: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌍 EduLingo
        </h1>
        <p style={{ color: '#666', fontSize: 18 }}>Learn languages the fun way!</p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 20 }}>
          <div style={{ background: '#FFF3E0', padding: '10px 20px', borderRadius: 10, border: '2px solid #FFB74D' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#F57C00' }}>🔥 {progress.streak}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Day Streak</div>
          </div>
          <div style={{ background: '#E8F5E9', padding: '10px 20px', borderRadius: 10, border: '2px solid #81C784' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#388E3C' }}>⭐ {progress.totalXp}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Total XP</div>
          </div>
          <div style={{ background: '#E3F2FD', padding: '10px 20px', borderRadius: 10, border: '2px solid #64B5F6' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1976D2' }}>📚 {progress.lessonsCompleted}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Lessons</div>
          </div>
          <div style={{ background: '#F3E5F5', padding: '10px 20px', borderRadius: 10, border: '2px solid #BA68C8' }}>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#7B1FA2' }}>🎯 {progress.accuracy}%</div>
            <div style={{ fontSize: 12, color: '#666' }}>Accuracy</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '2px solid #eee', paddingBottom: 10 }}>
        <button onClick={() => setView('courses')} style={{ padding: '10px 20px', background: view === 'courses' ? '#667eea' : '#fff', color: view === 'courses' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontWeight: '600' }}>
          Languages
        </button>
        <button onClick={() => setView('progress')} style={{ padding: '10px 20px', background: view === 'progress' ? '#667eea' : '#fff', color: view === 'progress' ? '#fff' : '#333', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontWeight: '600' }}>
          Progress
        </button>
      </div>

      {view === 'courses' && (
        <div>
          <h2>Choose a Language</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
            {languages.map(lang => (
              <div 
                key={lang.id} 
                onClick={() => selectLanguage(lang)}
                style={{ 
                  padding: 30, 
                  border: '2px solid #ddd', 
                  borderRadius: 15, 
                  textAlign: 'center', 
                  cursor: 'pointer', 
                  background: '#fff',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)' }}
              >
                <div style={{ fontSize: 60, marginBottom: 10 }}>{lang.flag}</div>
                <h3 style={{ margin: '10px 0' }}>{lang.name}</h3>
                <div style={{ fontSize: 14, color: '#666' }}>Level {lang.level}</div>
                <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: '#FF9800' }}>⭐ {lang.xp} XP</span>
                  <span style={{ fontSize: 12, color: '#F57C00' }}>🔥 {lang.streak} days</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'lesson' && selectedLang && (
        <div>
          <button onClick={() => setView('courses')} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer', marginBottom: 20 }}>
            ← Back to Languages
          </button>
          <h2>{selectedLang.flag} {selectedLang.name} Learning Path</h2>
          <p style={{ color: '#666', marginBottom: 30 }}>Complete lessons in order to unlock the next one! 🚀</p>
          
          {/* Group lessons by level */}
          {[1, 2, 3, 4, 5, 6].map(levelNum => {
            const levelLessons = lessons.filter(l => l.level === levelNum)
            if (levelLessons.length === 0) return null
            
            const levelNames = {
              1: '🔤 Level 1: Alphabet Foundation',
              2: '📚 Level 2: Essential Words',
              3: '🗣️ Level 3: Simple Phrases',
              4: '📝 Level 4: Complete Sentences',
              5: '📄 Level 5: Short Paragraphs',
              6: '📖 Level 6: Long Stories'
            }
            
            return (
              <div key={levelNum} style={{ marginBottom: 40 }}>
                <h3 style={{ 
                  fontSize: 20, 
                  fontWeight: '700',
                  color: '#667eea',
                  marginBottom: 20,
                  padding: '10px 15px',
                  background: 'linear-gradient(135deg, #E8EAF6 0%, #F5F5F5 100%)',
                  borderRadius: 10,
                  borderLeft: '5px solid #667eea'
                }}>
                  {levelNames[levelNum]}
                </h3>
                
                <div style={{ display: 'grid', gap: 15 }}>
                  {levelLessons.map(lesson => (
                    <div 
                      key={lesson.id} 
                      style={{ 
                        padding: 20, 
                        border: lesson.locked ? '2px dashed #ccc' : lesson.completed ? '2px solid #4CAF50' : '2px solid #667eea', 
                        borderRadius: 10, 
                        background: lesson.locked ? '#f9f9f9' : lesson.completed ? '#E8F5E9' : '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        opacity: lesson.locked ? 0.6 : 1
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 28 }}>{lesson.icon}</span>
                          <h4 style={{ margin: 0 }}>
                            {lesson.locked && '🔒 '}
                            {lesson.completed && '✅ '}
                            {lesson.title}
                          </h4>
                        </div>
                        {lesson.desc && (
                          <p style={{ margin: '5px 0', fontSize: 14, color: '#666' }}>{lesson.desc}</p>
                        )}
                        <div style={{ display: 'flex', gap: 15, fontSize: 13, color: '#666', marginTop: 8 }}>
                          <span style={{ 
                            padding: '3px 10px', 
                            background: '#E3F2FD',
                            color: '#1976D2',
                            borderRadius: 5,
                            fontSize: 11,
                            fontWeight: '600'
                          }}>
                            LEVEL {lesson.level}
                          </span>
                          <span>⭐ {lesson.xp} XP</span>
                          {lesson.completed && <span style={{ color: '#4CAF50', fontWeight: '600' }}>✓ Completed</span>}
                        </div>
                      </div>
                      <button 
                        onClick={() => startLesson(lesson)}
                        disabled={lesson.locked}
                        style={{ 
                          padding: '12px 28px', 
                          background: lesson.locked ? '#ccc' : lesson.completed ? '#4CAF50' : '#667eea', 
                          color: '#fff', 
                          border: 'none', 
                          borderRadius: 8, 
                          cursor: lesson.locked ? 'not-allowed' : 'pointer',
                          fontWeight: '600',
                          fontSize: 15,
                          boxShadow: !lesson.locked ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
                        }}
                      >
                        {lesson.locked ? 'Locked' : lesson.completed ? 'Review' : 'Start Lesson'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'practice' && exercise && (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30 }}>
            <button onClick={() => setView('lesson')} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 5, cursor: 'pointer' }}>
              ← Exit
            </button>
            <div style={{ display: 'flex', gap: 20 }}>
              <span style={{ fontWeight: '600' }}>Score: {score}</span>
              <span>Question {questionsAnswered + 1}/10</span>
            </div>
          </div>

          <div style={{ padding: 40, border: '2px solid #ddd', borderRadius: 15, background: '#fff', minHeight: 400 }}>
            <h2 style={{ textAlign: 'center', color: '#667eea', marginBottom: 30 }}>{exercise.question}</h2>
            
            {exercise.word && (
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                marginBottom: 30
              }}>
                <div style={{ 
                  fontSize: 48, 
                  fontWeight: 'bold', 
                  textAlign: 'center', 
                  padding: 30, 
                  background: '#F5F5F5', 
                  borderRadius: 10,
                  flex: 1
                }}>
                  {exercise.emoji && <span style={{ marginRight: 15 }}>{exercise.emoji}</span>}
                  {exercise.word}
                </div>
                {exercise.audioText && (
                  <button
                    onClick={() => speak(exercise.audioText, exercise.langCode)}
                    style={{
                      width: 70,
                      height: 70,
                      borderRadius: '50%',
                      background: isPlaying ? '#FFB74D' : '#667eea',
                      border: 'none',
                      fontSize: 32,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      transition: 'all 0.3s'
                    }}
                    title="Listen to pronunciation"
                  >
                    {isPlaying ? '🔊' : '🔉'}
                  </button>
                )}
              </div>
            )}

            {exercise.context && (
              <div style={{
                padding: 15,
                background: '#E3F2FD',
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 14,
                color: '#1976D2'
              }}>
                💡 Context: {exercise.context}
              </div>
            )}

            {!feedback && (
              <div style={{ display: 'grid', gap: 15 }}>
                {showHint && exercise.hint && (
                  <div style={{
                    padding: 15,
                    background: '#FFF3E0',
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#F57C00',
                    marginBottom: 10
                  }}>
                    💡 Hint: {exercise.hint}
                  </div>
                )}
                
                {exercise.options ? (
                  exercise.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => selectOption(option)}
                      style={{
                        padding: 20,
                        fontSize: 18,
                        border: userAnswer === option ? '3px solid #667eea' : '2px solid #ddd',
                        borderRadius: 10,
                        background: userAnswer === option ? '#E8EAF6' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { if (userAnswer !== option) e.target.style.background = '#F5F5F5' }}
                      onMouseLeave={e => { if (userAnswer !== option) e.target.style.background = '#fff' }}
                    >
                      {option}
                    </button>
                  ))
                ) : (
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && checkAnswer()}
                    placeholder="Type your answer..."
                    style={{ padding: 20, fontSize: 18, border: '2px solid #ddd', borderRadius: 10 }}
                    autoFocus
                  />
                )}
                
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    onClick={checkAnswer}
                    disabled={!userAnswer}
                    style={{ 
                      flex: 1,
                      padding: 16, 
                      fontSize: 18, 
                      background: userAnswer ? '#667eea' : '#ccc', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 10, 
                      cursor: userAnswer ? 'pointer' : 'not-allowed',
                      fontWeight: '600',
                      marginTop: 20
                    }}
                  >
                    Check Answer
                  </button>
                  {!showHint && exercise.hint && (
                    <button
                      onClick={() => setShowHint(true)}
                      style={{
                        padding: '16px 20px',
                        fontSize: 16,
                        background: '#FFF3E0',
                        color: '#F57C00',
                        border: '2px solid #FFB74D',
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: '600',
                        marginTop: 20
                      }}
                    >
                      💡 Hint
                    </button>
                  )}
                </div>
              </div>
            )}

            {feedback && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  fontSize: 80, 
                  marginBottom: 20 
                }}>
                  {feedback.correct ? '🎉' : '😅'}
                </div>
                <div style={{ 
                  fontSize: 24, 
                  fontWeight: '600', 
                  color: feedback.correct ? '#4CAF50' : '#F44336',
                  marginBottom: 10
                }}>
                  {feedback.message}
                </div>
                <div style={{ fontSize: 18, color: '#666', marginBottom: 30 }}>
                  +{feedback.xp} XP
                </div>
                <button 
                  onClick={nextExercise}
                  style={{ 
                    padding: '16px 40px', 
                    fontSize: 18, 
                    background: '#667eea', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 10, 
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  {questionsAnswered >= 10 ? 'Finish Lesson' : 'Next Question →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'progress' && (
        <div>
          <h2>Your Learning Journey</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 30 }}>
            <div style={{ padding: 20, background: '#fff', border: '2px solid #ddd', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>🔥</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#F57C00' }}>{progress.streak}</div>
              <div style={{ color: '#666' }}>Day Streak</div>
            </div>
            <div style={{ padding: 20, background: '#fff', border: '2px solid #ddd', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>⭐</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#FFC107' }}>{progress.totalXp}</div>
              <div style={{ color: '#666' }}>Total XP</div>
            </div>
            <div style={{ padding: 20, background: '#fff', border: '2px solid #ddd', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>📚</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#2196F3' }}>{progress.lessonsCompleted}</div>
              <div style={{ color: '#666' }}>Lessons Done</div>
            </div>
            <div style={{ padding: 20, background: '#fff', border: '2px solid #ddd', borderRadius: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>🎯</div>
              <div style={{ fontSize: 32, fontWeight: 'bold', color: '#9C27B0' }}>{progress.accuracy}%</div>
              <div style={{ color: '#666' }}>Accuracy</div>
            </div>
          </div>

          <div style={{ padding: 30, background: '#fff', border: '2px solid #ddd', borderRadius: 10 }}>
            <h3>Recent Activity</h3>
            <div style={{ display: 'grid', gap: 15, marginTop: 20 }}>
              <div style={{ padding: 15, background: '#F5F5F5', borderRadius: 8, borderLeft: '4px solid #4CAF50' }}>
                <div style={{ fontWeight: '600' }}>✅ Completed "Basic Greetings" in Spanish</div>
                <div style={{ fontSize: 14, color: '#666' }}>+50 XP • 2 hours ago</div>
              </div>
              <div style={{ padding: 15, background: '#F5F5F5', borderRadius: 8, borderLeft: '4px solid #4CAF50' }}>
                <div style={{ fontWeight: '600' }}>✅ Completed "Numbers 1-20" in Spanish</div>
                <div style={{ fontSize: 14, color: '#666' }}>+50 XP • 1 day ago</div>
              </div>
              <div style={{ padding: 15, background: '#F5F5F5', borderRadius: 8, borderLeft: '4px solid #2196F3' }}>
                <div style={{ fontWeight: '600' }}>🎯 Achieved 7-day streak!</div>
                <div style={{ fontSize: 14, color: '#666' }}>Keep it up! • 2 days ago</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
