import { useEffect, useState } from 'react'

interface DraftData {
  storyName?: string
  storyContent?: string
}

export function useStoryDraft(storageKey: string, isCreateMode: boolean) {
  // Start with empty strings to match server-side rendering
  // Load from localStorage after hydration to prevent mismatches
  const [storyName, setStoryName] = useState('')
  const [storyContent, setStoryContent] = useState('')
  const [originalStoryContent, setOriginalStoryContent] = useState('')

  // Load draft from localStorage after hydration (create mode only)
  useEffect(() => {
    if (!isCreateMode || typeof window === 'undefined') {
      return
    }

    try {
      const draft = localStorage.getItem(storageKey)
      if (draft) {
        const parsed = JSON.parse(draft) as DraftData
        setStoryName(parsed.storyName ?? '')
        setStoryContent(parsed.storyContent ?? '')
        setOriginalStoryContent(parsed.storyContent ?? '')
      }
    } catch (e) {
      // Ignore localStorage errors
      console.error('Failed to load draft from localStorage:', e)
    }
  }, [storageKey, isCreateMode])

  // Save draft to localStorage whenever content changes (create mode only)
  useEffect(() => {
    if (!isCreateMode) {
      return
    }

    try {
      const draft: DraftData = {
        storyName,
        storyContent,
      }
      localStorage.setItem(storageKey, JSON.stringify(draft))
    } catch (e) {
      // Ignore localStorage errors
      console.error('Failed to save draft to localStorage:', e)
    }
  }, [isCreateMode, storageKey, storyName, storyContent])

  // Clear draft from localStorage
  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch (e) {
      // Ignore localStorage errors
      console.error('Failed to clear draft from localStorage:', e)
    }
  }

  return {
    storyName,
    setStoryName,
    storyContent,
    setStoryContent,
    originalStoryContent,
    setOriginalStoryContent,
    clearDraft,
  }
}
