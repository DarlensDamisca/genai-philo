// pages/api/groq.ts
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  answer: string
  error?: string
}

// Models Groq disponibles
const AVAILABLE_MODELS = [
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it'
]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ answer: 'Method not allowed' })
  }

  const { message } = req.body

  if (!message) {
    return res.status(400).json({ answer: 'Message is required' })
  }

  try {
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    
    if (!GROQ_API_KEY) {
      throw new Error('API key Groq non configurée')
    }

    console.log('Appel API Groq avec la question:', message)

    // Essayer différents modèles jusqu'à ce qu'un fonctionne
    let lastError = null
    
    for (const model of AVAILABLE_MODELS) {
      try {
        console.log(`Essai avec le modèle: ${model}`)
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: message
              }
            ],
            max_tokens: 4000,
            temperature: 0.7,
            stream: false
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          
          // Si c'est une erreur de modèle, essayer le suivant
          if (response.status === 400 && errorData?.error?.message?.includes('model')) {
            lastError = errorData.error.message
            continue // Essayer le modèle suivant
          }
          
          throw new Error(`Erreur API Groq: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`)
        }

        const data = await response.json()
        console.log(`Réponse API Groq reçue avec le modèle: ${model}`)

        const answer = data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.'

        return res.status(200).json({ answer })
        
      } catch (error) {
        // Si c'est une erreur de modèle, continuer avec le suivant
        if (error instanceof Error && error.message.includes('model')) {
          lastError = error.message
          continue
        }
        throw error
      }
    }

    // Si aucun modèle n'a fonctionné
    throw new Error(`Tous les modèles ont échoué. Dernière erreur: ${lastError}`)

  } catch (error) {
    console.error('Erreur API Groq:', error)
    
    const errorMessage = `# Erreur de service temporaire\n\n**Désolé, le service Groq est temporairement indisponible.**\n\n## Détails techniques:\n\n- Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}\n- Statut: Veuillez réessayer dans quelques instants\n\n## Votre question: "${message}"\n\n*Le service devrait être rétabli rapidement.*`
    
    res.status(200).json({ answer: errorMessage })
  }
}