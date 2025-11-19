// pages/api/deepseek.ts
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  answer: string
  error?: string
}

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
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
    
    if (!DEEPSEEK_API_KEY) {
      throw new Error('API key DeepSeek non configurée')
    }

    console.log('Appel API DeepSeek avec la question:', message)

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 2000,
        temperature: 0.7,
        stream: false
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      
      if (response.status === 402) {
        throw new Error('SOLDE_INSUFFISANT - Votre compte DeepSeek n\'a pas suffisamment de crédit. Veuillez recharger votre compte.')
      }
      
      throw new Error(`Erreur API: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    console.log('Réponse API DeepSeek reçue')

    const answer = data.choices?.[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.'

    res.status(200).json({ answer })

  } catch (error) {
    console.error('Erreur API DeepSeek:', error)
    
    let errorMessage = `# Erreur de service\n\n`
    
    if (error instanceof Error && error.message.includes('SOLDE_INSUFFISANT')) {
      errorMessage += `**Solde insuffisant sur votre compte DeepSeek**\n\n## Problème identifié:\n\n- Votre compte DeepSeek n'a pas suffisamment de crédit\n- Code d'erreur: 402 - Insufficient Balance\n\n## Solution:\n\n1. **Connectez-vous** à votre compte [DeepSeek](https://platform.deepseek.com/)\n2. **Vérifiez votre solde** dans la section billing\n3. **Rechargez votre compte** si nécessaire\n4. **Réessayez** après recharge\n\n**Votre question:** "${message}"\n\n*Cette question sera traitée une fois votre compte rechargé.*`
    } else {
      errorMessage += `**Désolé, le service DeepSeek est temporairement indisponible.**\n\n## Détails techniques:\n\n- Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}\n- Statut: Veuillez réessayer dans quelques instants\n\n## Votre question: "${message}"\n\n*Le service devrait être rétabli rapidement.*`
    }
    
    res.status(200).json({ answer: errorMessage })
  }
}