// pages/index.tsx
import { useState, useRef, useEffect, FormEvent, useMemo, useCallback } from 'react'
import Head from 'next/head'
import { Moon, Sun, Send, Loader2, Plus, MessageSquare, Menu, X, ChevronRight, Zap, Search, Download, Volume2, VolumeX, Settings } from 'lucide-react'
import { Response, Conversation } from '../types'

// Import de KaTeX
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

// Themes personnalisés
const themes = {
  dark: { primary: '#3B82F6', background: '#1F2937', name: 'Sombre' },
  blue: { primary: '#1D4ED8', background: '#0F172A', name: 'Bleu nuit' },
  green: { primary: '#059669', background: '#064E3B', name: 'Vert forêt' }
}

// Traductions
const translations = {
  fr: {
    newConversation: 'Nouvelle conversation',
    askQuestion: 'Posez votre question à GEN AI...',
    history: 'Historique des conversations',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    ultraFast: 'Ultra-Rapide',
    startConversation: 'Commencez une conversation',
    closeResponse: 'Fermer la réponse',
    viewResponse: 'Voir la réponse GEN AI',
    generatingResponse: 'GEN AI génère la réponse...',
    responseComplete: 'Réponse complète',
    pressEnter: 'Appuyez sur Entrée pour envoyer',
    searchConversations: 'Rechercher des conversations...',
    export: 'Exporter',
    speak: 'Lire',
    stop: 'Arrêter',
    settings: 'Paramètres',
    retry: 'Réessayer',
    error: 'Erreur',
    success: 'Succès'
  },
  en: {
    newConversation: 'New conversation',
    askQuestion: 'Ask your question to GEN AI...',
    history: 'Conversation history',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    ultraFast: 'Ultra-Fast',
    startConversation: 'Start a conversation',
    closeResponse: 'Close response',
    viewResponse: 'View Gen AI response',
    generatingResponse: 'Generating response...',
    responseComplete: 'Response complete',
    pressEnter: 'Press Enter to send',
    searchConversations: 'Search conversations...',
    export: 'Export',
    speak: 'Speak',
    stop: 'Stop',
    settings: 'Settings',
    retry: 'Retry',
    error: 'Error',
    success: 'Success'
  }
}

// Komponent Notifikasyon
const Notification = ({ 
  message, 
  type, 
  onClose 
}: { 
  message: string; 
  type: 'success' | 'error';
  onClose: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`
      fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm transform transition-transform duration-300
      ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white
    `}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

// Skeleton Loader
const ConversationSkeleton = () => (
  <div className="animate-pulse p-3 rounded-lg bg-gray-700">
    <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-600 rounded w-1/2"></div>
  </div>
)

// Composant pour afficher les formules mathématiques avec KaTeX
const MathFormula = ({ formula, displayMode = false }: { formula: string; displayMode?: boolean }) => {
  try {
    if (displayMode) {
      return <BlockMath math={formula} />
    } else {
      return <InlineMath math={formula} />
    }
  } catch (error) {
    console.error('Erreur de rendu KaTeX:', error)
    return (
      <span className="text-red-500 text-sm">
        {displayMode ? `[Erreur formule: ${formula}]` : `(${formula})`}
      </span>
    )
  }
}

export default function Home() {
  const [question, setQuestion] = useState<string>('')
  const [responses, setResponses] = useState<Response[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [darkMode, setDarkMode] = useState<boolean>(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false)
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null)
  const [typingText, setTypingText] = useState<string>('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [language, setLanguage] = useState<'fr' | 'en'>('fr')
  const [currentTheme, setCurrentTheme] = useState<'dark' | 'blue' | 'green'>('dark')
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false)
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const responseContentRef = useRef<HTMLDivElement>(null)
  const speechSynthRef = useRef<SpeechSynthesis | null>(null)

  const t = translations[language]

  // Charger données depuis localStorage
  useEffect(() => {
    const loadSavedData = () => {
      try {
        setLoadingConversations(true)
        const savedConversations = localStorage.getItem('groq-conversations')
        const savedResponses = localStorage.getItem('groq-responses')
        const savedSettings = localStorage.getItem('groq-settings')

        if (savedConversations) {
          setConversations(JSON.parse(savedConversations))
        }
        if (savedResponses) {
          setResponses(JSON.parse(savedResponses))
        }
        if (savedSettings) {
          const settings = JSON.parse(savedSettings)
          setDarkMode(settings.darkMode)
          setLanguage(settings.language)
          setCurrentTheme(settings.theme)
        }
      } catch (error) {
        console.error('Erreur chargement données:', error)
        showNotification(t.error + ': ' + error, 'error')
      } finally {
        setLoadingConversations(false)
      }
    }

    loadSavedData()
    speechSynthRef.current = typeof window !== 'undefined' ? window.speechSynthesis : null
  }, [t.error])

  // Sauvegarder données dans localStorage
  useEffect(() => {
    const saveData = () => {
      try {
        localStorage.setItem('groq-conversations', JSON.stringify(conversations))
        localStorage.setItem('groq-responses', JSON.stringify(responses))
        localStorage.setItem('groq-settings', JSON.stringify({
          darkMode,
          language,
          theme: currentTheme
        }))
      } catch (error) {
        console.error('Erreur sauvegarde données:', error)
      }
    }

    saveData()
  }, [conversations, responses, darkMode, language, currentTheme])

  // Fonction pour afficher les notifications
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
  }

  // Fonction retry pour les appels API
  const retryCall = async (question: string, retries = 3): Promise<Response> => {
    try {
      return await callGroqAPI(question)
    } catch (error) {
      if (retries > 0) {
        showNotification(`${t.retry}... (${retries})`, 'error')
        await new Promise(resolve => setTimeout(resolve, 1000))
        return retryCall(question, retries - 1)
      }
      throw error
    }
  }

  // Fonction pour appeler l'API Groq
  const callGroqAPI = async (question: string): Promise<Response> => {
    setIsLoading(true)
    
    try {
      console.log('Envoi de la question à l\'API Groq:', question)
      
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: question,
          conversationId: currentConversationId || 'default'
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Erreur HTTP:', response.status, errorText)
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      const apiResponse: Response = {
        id: Date.now().toString(),
        question: question,
        answer: data.answer,
        timestamp: new Date().toISOString(),
        conversationId: currentConversationId || 'default'
      }

      console.log('Réponse Gen reçue avec succès')
      setIsLoading(false)
      showNotification(t.success, 'success')
      return apiResponse

    } catch (error) {
      console.error('Erreur API Groq:', error)
      
      const fallbackResponse: Response = {
        id: Date.now().toString(),
        question: question,
        answer: `# Erreur de connexion\n\n**Désolé, je n'ai pas pu contacter l'API Gen AiG.**\n\n**Détails de l'erreur:** ${error instanceof Error ? error.message : 'Erreur inconnue'}\n\nVeuillez vérifier:\n\n1. Votre connexion internet\n2. Que votre clé API Gen ai est valide\n3. Réessayer dans quelques instants\n\n**Votre question:** "${question}"`,
        timestamp: new Date().toISOString(),
        conversationId: currentConversationId || 'default'
      }
      
      setIsLoading(false)
      showNotification(t.error + ': ' + (error instanceof Error ? error.message : 'Erreur inconnue'), 'error')
      return fallbackResponse
    }
  }

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `${t.newConversation} ${conversations.length + 1}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newConversation.id)
    setResponses([])
    setSidebarOpen(false)
    setExpandedResponseId(null)
    showNotification(t.newConversation + ' créée', 'success')
  }

  // Animation d'écriture
  const typeText = (text: string, responseId: string) => {
    setTypingText('')
    let index = 0
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setTypingText(prev => prev + text[index])
        index++
      } else {
        clearInterval(typingInterval)
        setIsTyping(false)
      }
    }, 5)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    if (!currentConversationId && conversations.length === 0) {
      createNewConversation()
    }

    const response = await retryCall(question)
    
    setIsTyping(true)
    setResponses(prev => [response, ...prev])
    setQuestion('')

    setTimeout(() => {
      setExpandedResponseId(response.id)
      
      setTimeout(() => {
        typeText(response.answer, response.id)
      }, 200)
    }, 300)
  }

  // Text-to-speech functionality
  const speakText = (text: string) => {
    if (speechSynthRef.current) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language === 'fr' ? 'fr-FR' : 'en-US'
      utterance.rate = 0.8
      
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      speechSynthRef.current.speak(utterance)
      setIsSpeaking(true)
    }
  }

  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  // Export conversation
  const exportConversation = (conversationId: string) => {
    const conversationResponses = responses.filter(r => r.conversationId === conversationId)
    if (conversationResponses.length === 0) {
      showNotification('Aucune conversation à exporter', 'error')
      return
    }

    const text = conversationResponses.map(r => 
      `Q: ${r.question}\nA: ${r.answer}\n\n`
    ).join('')
    
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversationId}.txt`
    a.click()
    URL.revokeObjectURL(url)
    showNotification('Conversation exportée', 'success')
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setExpandedResponseId(null)
        stopSpeaking()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        createNewConversation()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [responses])

  // Filtrer les conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => 
      conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      responses.some(r => 
        r.conversationId === conv.id && 
        (r.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
         r.answer.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    )
  }, [conversations, searchTerm, responses])

  // Fonction pour formater le texte avec support Markdown amélioré et KaTeX
  const formatText = useCallback((text: string) => {
    if (!text) return []

    const lines = text.split('\n')
    let currentList: JSX.Element[] = []
    const elements: JSX.Element[] = []

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="my-4 ml-6 space-y-2 list-disc">
            {currentList}
          </ul>
        )
        currentList = []
      }
    }

    // Fonction pour traiter les formules mathématiques dans une ligne
    const processMathInLine = (line: string, key: string) => {
      const mathBlockRegex = /\$\$(.*?)\$\$/g
      const inlineMathRegex = /\$(.*?)\$/g
      
      let lastIndex = 0
      const parts: JSX.Element[] = []
      let match

      // D'abord traiter les blocs mathématiques ($$...$$)
      while ((match = mathBlockRegex.exec(line)) !== null) {
        // Texte avant la formule
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${parts.length}`}>{line.slice(lastIndex, match.index)}</span>)
        }
        // Formule mathématique en mode bloc
        parts.push(
          <div key={`math-${parts.length}`} className="my-2">
            <MathFormula formula={match[1]} displayMode={true} />
          </div>
        )
        lastIndex = match.index + match[0].length
      }

      // Si on a trouvé des blocs mathématiques, on retourne les parties
      if (parts.length > 0) {
        if (lastIndex < line.length) {
          parts.push(<span key={`text-end`}>{line.slice(lastIndex)}</span>)
        }
        return <div key={key}>{parts}</div>
      }

      // Sinon, traiter les formules inline ($...$)
      lastIndex = 0
      while ((match = inlineMathRegex.exec(line)) !== null) {
        // Texte avant la formule
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${parts.length}`}>{line.slice(lastIndex, match.index)}</span>)
        }
        // Formule mathématique inline
        parts.push(<MathFormula key={`math-${parts.length}`} formula={match[1]} displayMode={false} />)
        lastIndex = match.index + match[0].length
      }

      if (parts.length > 0) {
        if (lastIndex < line.length) {
          parts.push(<span key={`text-end`}>{line.slice(lastIndex)}</span>)
        }
        return <span key={key}>{parts}</span>
      }

      // Si pas de formules mathématiques, retourner le texte normal
      return line
    }

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        flushList()
        const codeContent = lines.slice(index + 1).findIndex(l => l.startsWith('```')) > -1 
          ? lines.slice(index + 1, lines.findIndex((l, i) => i > index && l.startsWith('```')))
          : [line.replace('```', '')]
        
        elements.push(
          <div key={index} className="my-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm overflow-x-auto">
            {codeContent.join('\n')}
          </div>
        )
        return
      }

      // Lignes de séparation
      if (line.trim() === '---') {
        flushList()
        elements.push(
          <hr key={index} className="my-6 border-gray-300 dark:border-gray-600" />
        )
        return
      }

      // Citations
      if (line.startsWith('> ')) {
        flushList()
        elements.push(
          <blockquote key={index} className="my-3 pl-4 border-l-4 border-blue-500 italic text-gray-600 dark:text-gray-400">
            {processMathInLine(line.substring(2), `quote-${index}`)}
          </blockquote>
        )
        return
      }

      // Liens
      if (line.includes('[') && line.includes('](') && line.includes(')')) {
        flushList()
        const linkRegex = /\[(.*?)\]\((.*?)\)/g
        let lastIndex = 0
        const parts = []
        let match
        
        while ((match = linkRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(processMathInLine(line.slice(lastIndex, match.index), `text-${parts.length}`))
          }
          parts.push(
            <a 
              key={parts.length}
              href={match[2]} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline"
            >
              {match[1]}
            </a>
          )
          lastIndex = match.index + match[0].length
        }
        
        if (lastIndex < line.length) {
          parts.push(processMathInLine(line.slice(lastIndex), `text-end`))
        }
        
        elements.push(
          <p key={index} className="my-3 leading-relaxed">
            {parts}
          </p>
        )
        return
      }

      // Code inline
      if (line.includes('`')) {
        flushList()
        const parts = line.split('`')
        elements.push(
          <p key={index} className="my-3">
            {parts.map((part, i) => 
              i % 2 === 0 ? processMathInLine(part, `code-${i}`) : (
                <code key={i} className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm font-mono">
                  {part}
                </code>
              )
            )}
          </p>
        )
        return
      }

      // Titres
      if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <h1 key={index} className="text-2xl font-bold mt-6 mb-4 text-blue-600 dark:text-blue-400">
            {processMathInLine(line.substring(2), `h1-${index}`)}
          </h1>
        )
        return
      }
      if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <h2 key={index} className="text-xl font-bold mt-5 mb-3 text-green-600 dark:text-green-400">
            {processMathInLine(line.substring(3), `h2-${index}`)}
          </h2>
        )
        return
      }
      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <h3 key={index} className="text-lg font-bold mt-4 mb-2 text-purple-600 dark:text-purple-400">
            {processMathInLine(line.substring(4), `h3-${index}`)}
          </h3>
        )
        return
      }
      
      // Images
      if (line.startsWith('![')) {
        flushList()
        const match = line.match(/!\[(.*?)\]\((.*?)\)/)
        if (match) {
          const [, alt, src] = match
          elements.push(
            <div key={index} className="my-4">
              <img 
                src={src} 
                alt={alt} 
                className="rounded-lg max-w-full h-auto mx-auto shadow-md max-h-64 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              {alt && <p className="text-center text-sm text-gray-500 mt-2">{alt}</p>}
            </div>
          )
        }
        return
      }
      
      // Texte en gras avec support mathématique
      if (line.includes('**')) {
        flushList()
        const parts = line.split('**')
        elements.push(
          <p key={index} className="my-3">
            {parts.map((part, i) => 
              i % 2 === 0 ? processMathInLine(part, `bold-${i}`) : 
              <strong key={i} className="font-bold text-gray-900 dark:text-white">
                {processMathInLine(part, `bold-math-${i}`)}
              </strong>
            )}
          </p>
        )
        return
      }
      
      // Listes avec support mathématique
      if (line.startsWith('- ')) {
        currentList.push(
          <li key={currentList.length}>
            {processMathInLine(line.substring(2), `list-${currentList.length}`)}
          </li>
        )
        return
      }
      
      // Paragraphes normaux
      if (line.trim() === '') {
        flushList()
        elements.push(<br key={index} />)
        return
      }
      
      // Paragraphes réguliers avec support mathématique
      flushList()
      elements.push(
        <p key={index} className="my-3 leading-relaxed">
          {processMathInLine(line, `para-${index}`)}
        </p>
      )
    })

    flushList()
    return elements
  }, [])

  const currentResponses = useMemo(() => {
    return responses.filter(r => r.conversationId === currentConversationId)
  }, [responses, currentConversationId])

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'
      }`}
      style={{
        backgroundColor: darkMode ? themes[currentTheme].background : undefined
      }}
    >
      <Head>
        <title>AI Assistant | GEN AI API</title>
        <meta name="description" content="Posez vos questions et obtenez des réponses ultra-rapides avec GEN AI" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Notification */}
      {notification && (
        <Notification 
          message={notification.message} 
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="flex h-screen">
        {/* Sidebar Navigation */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${darkMode ? 'bg-gray-800' : 'bg-white'} border-r ${darkMode ? 'border-gray-700' : 'border-gray-200'}
        `}>
          <div className="flex flex-col h-full">
            {/* Header Sidebar */}
            <div className="p-4 border-b border-gray-700">
              <button
                onClick={createNewConversation}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
                  darkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Plus size={20} />
                {t.newConversation}
              </button>

              {/* Barre de recherche */}
              <div className="mt-4 relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={t.searchConversations}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>

            {/* Liste des conversations */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {t.history}
              </h3>
              
              {loadingConversations ? (
                // Skeleton loaders
                Array.from({ length: 3 }).map((_, i) => (
                  <ConversationSkeleton key={i} />
                ))
              ) : filteredConversations.length === 0 ? (
                <p className={`text-sm text-center py-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {searchTerm ? 'Aucune conversation trouvée' : 'Aucune conversation'}
                </p>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`group rounded-lg transition-all duration-200 ${
                      currentConversationId === conversation.id
                        ? darkMode ? 'bg-gray-700' : 'bg-blue-50 border border-blue-200'
                        : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setCurrentConversationId(conversation.id)
                        setSidebarOpen(false)
                      }}
                      className="w-full text-left p-3"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare size={16} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">
                            {conversation.title}
                          </p>
                          <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(conversation.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                    
                    {/* Boutons d'action */}
                    <div className="flex gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => exportConversation(conversation.id)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded text-xs ${
                          darkMode 
                            ? 'bg-gray-600 hover:bg-gray-500' 
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                      >
                        <Download size={12} />
                        {t.export}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Sidebar */}
            <div className="p-4 border-t border-gray-700 space-y-2">
              {/* Sélecteur de langue */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>

              {/* Sélecteur de thème */}
              <select
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value as 'dark' | 'blue' | 'green')}
                className={`w-full p-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
              >
                <option value="dark">{t.darkMode}</option>
                <option value="blue">Bleu nuit</option>
                <option value="green">Vert forêt</option>
              </select>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                {darkMode ? t.lightMode : t.darkMode}
              </button>
            </div>
          </div>
        </div>

        {/* Overlay pour mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <header className={`sticky top-0 z-10 backdrop-blur-md border-b ${
            darkMode ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
          }`}>
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                GENAI TIMOUN PHILO YO
              </h1>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-yellow-500" />
                  <div className={`px-2 py-1 rounded-full text-xs ${
                    darkMode ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
                  }`}>
                    {t.ultraFast}
                  </div>
                </div>
                
                {/* Bouton paramètres */}
                <button
                  onClick={() => {
                    // Ouvrir modal paramètres (à implémenter)
                    showNotification('Paramètres - À implémenter', 'success')
                  }}
                  className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>
          </header>

          {/* Messages Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {currentResponses.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                    <MessageSquare className="text-white" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">{t.startConversation}</h2>
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                    Posez votre première question et obtenez une réponse ultra-rapide avec GEN AI.
                  </p>
                  <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <Zap size={16} className="text-yellow-500" />
                      GEN AI - {t.ultraFast}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Réponses générées en temps réel avec la GEN AI
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Colonne de gauche - Questions */}
                <div className="space-y-6">
                  {currentResponses.map((response) => (
                    <div key={response.id} className="space-y-4">
                      {/* Question */}
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          V
                        </div>
                        <div className="flex-1">
                          <div className={`rounded-2xl p-4 ${
                            darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
                          }`}>
                            <p>{response.question}</p>
                          </div>
                        </div>
                      </div>

                      {/* Bouton pour ouvrir la réponse */}
                      <div className="flex justify-center">
                        <button
                          onClick={() => setExpandedResponseId(
                            expandedResponseId === response.id ? null : response.id
                          )}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                            darkMode 
                              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          <ChevronRight 
                            size={16} 
                            className={`transition-transform duration-300 ${
                              expandedResponseId === response.id ? 'rotate-90' : ''
                            }`} 
                          />
                          {expandedResponseId === response.id ? t.closeResponse : t.viewResponse}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Colonne de droite - Réponses */}
                <div className="space-y-6">
                  {currentResponses.map((response, index) => (
                    <div
                      key={response.id}
                      className={`transition-all duration-500 ease-in-out ${
                        expandedResponseId === response.id
                          ? 'opacity-100 translate-x-0 max-h-[800px]'
                          : 'opacity-0 translate-x-4 max-h-0 pointer-events-none overflow-hidden'
                      }`}
                    >
                      {expandedResponseId === response.id && (
                        <div 
                          ref={index === 0 ? responseContentRef : null}
                          className={`rounded-2xl p-6 shadow-xl border ${
                            darkMode 
                              ? 'bg-gray-800 border-gray-700' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                                A
                              </div>
                              <div>
                                <h3 className="font-bold">Réponse GEN AI</h3>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {new Date(response.timestamp).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Boutons d'action réponse */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => isSpeaking ? stopSpeaking() : speakText(response.answer)}
                                className={`p-2 rounded-lg transition-colors ${
                                  darkMode 
                                    ? 'bg-gray-700 hover:bg-gray-600' 
                                    : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                              >
                                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                              </button>
                            </div>
                          </div>

                          <div className="prose max-w-none dark:prose-invert min-h-[200px]">
                            {isTyping && index === 0 ? (
                              <div className="space-y-4">
                                {/* Animation d'écriture */}
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {formatText(typingText)}
                                </div>
                                
                                {/* Curseur clignotant */}
                                <div className="flex items-center gap-2 mt-4">
                                  <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                  </div>
                                  <span className="text-sm text-gray-500">{t.generatingResponse}</span>
                                </div>
                              </div>
                            ) : (
                              formatText(response.answer)
                            )}
                          </div>

                          {/* Indicateur de statut */}
                          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                isTyping && index === 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                              }`}></div>
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {isTyping && index === 0 ? 'GEN AI répond...' : t.responseComplete}
                              </span>
                            </div>
                            
                            <button
                              onClick={() => setExpandedResponseId(null)}
                              className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                                darkMode 
                                  ? 'bg-gray-700 hover:bg-gray-600' 
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {t.closeResponse}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </main>

          {/* Input Area */}
          <footer className={`sticky bottom-0 border-t ${
            darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="max-w-4xl mx-auto p-4">
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t.askQuestion}
                  rows={3}
                  className={`w-full px-4 py-3 pr-12 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !question.trim()}
                  className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all duration-300 ${
                    isLoading || !question.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
              
              <div className={`mt-3 text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Zap size={12} className="inline mr-1" />
                {t.pressEnter} • {t.ultraFast} avec GEN AI
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}