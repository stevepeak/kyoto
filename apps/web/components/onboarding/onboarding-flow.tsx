'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/client/trpc'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type CustomerType = 'indie-hacker' | 'vibe-coder' | 'big-tech' | 'startup'

type QuestionStep =
  | 'customer-type'
  | 'current-testing'
  | 'goals'
  | 'broken-feature'
  | 'written-user-stories'

const questions: Record<QuestionStep, { kanji: string; kanjiTitle: string; title: string; description: string }> = {
  'customer-type': {
    kanji: 'ようこそ',
    kanjiTitle: 'Yōkoso - Welcome',
    title: 'Welcome to Kyoto',
    description: 'Let\'s get to know you better. What type of customer are you?',
  },
  'current-testing': {
    kanji: 'テスト',
    kanjiTitle: 'Tesuto - Testing',
    title: 'How are you testing today?',
    description: 'Tell us about your current testing approach.',
  },
  'goals': {
    kanji: '目標',
    kanjiTitle: 'Mokuhyō - Goals',
    title: 'What are your goals with Kyoto?',
    description: 'What do you hope to achieve?',
  },
  'broken-feature': {
    kanji: '問題',
    kanjiTitle: 'Mondai - Problem',
    title: 'Describe a feature that has broken lately',
    description: 'Tell us about something in your app that didn\'t work as expected.',
  },
  'written-user-stories': {
    kanji: '物語',
    kanjiTitle: 'Monogatari - Story',
    title: 'Have you written agile user stories before?',
    description: 'Are you familiar with writing user stories?',
  },
}

export function OnboardingFlow() {
  const router = useRouter()
  const [step, setStep] = useState<QuestionStep>('customer-type')
  const [customerType, setCustomerType] = useState<CustomerType | null>(null)
  const [currentTesting, setCurrentTesting] = useState('')
  const [goals, setGoals] = useState('')
  const [brokenFeature, setBrokenFeature] = useState('')
  const [writtenUserStories, setWrittenUserStories] = useState<boolean | null>(null)

  const { data: user } = api.user.get.useQuery()
  const updateOnboarding = api.user.updateOnboarding.useMutation()

  // Check if user has already completed onboarding
  useEffect(() => {
    if (user?.onboardingMetadata) {
      const metadata = user.onboardingMetadata as Record<string, unknown>
      if (
        typeof metadata.customerType === 'string' &&
        typeof metadata.currentTesting === 'string' &&
        typeof metadata.goals === 'string' &&
        typeof metadata.brokenFeature === 'string' &&
        typeof metadata.writtenUserStories === 'boolean'
      ) {
        // User has completed onboarding, redirect to app
        router.push('/app')
      } else {
        // User has partial answers, restore state
        if (metadata.customerType) setCustomerType(metadata.customerType as CustomerType)
        if (metadata.currentTesting) setCurrentTesting(metadata.currentTesting as string)
        if (metadata.goals) setGoals(metadata.goals as string)
        if (metadata.brokenFeature) setBrokenFeature(metadata.brokenFeature as string)
        if (typeof metadata.writtenUserStories === 'boolean') setWrittenUserStories(metadata.writtenUserStories)
        
        // Determine which step to show based on what's missing
        if (!metadata.customerType) setStep('customer-type')
        else if (!metadata.currentTesting) setStep('current-testing')
        else if (!metadata.goals) setStep('goals')
        else if (!metadata.brokenFeature) setStep('broken-feature')
        else if (typeof metadata.writtenUserStories !== 'boolean') setStep('written-user-stories')
      }
    }
  }, [user, router])

  const handleContinue = async () => {
    let nextStep: QuestionStep | null = null

    switch (step) {
      case 'customer-type':
        if (customerType) {
          await updateOnboarding.mutateAsync({ customerType })
          nextStep = 'current-testing'
        }
        break
      case 'current-testing':
        if (currentTesting.trim()) {
          await updateOnboarding.mutateAsync({ currentTesting: currentTesting.trim() })
          nextStep = 'goals'
        }
        break
      case 'goals':
        if (goals.trim()) {
          await updateOnboarding.mutateAsync({ goals: goals.trim() })
          nextStep = 'broken-feature'
        }
        break
      case 'broken-feature':
        if (brokenFeature.trim()) {
          await updateOnboarding.mutateAsync({ brokenFeature: brokenFeature.trim() })
          nextStep = 'written-user-stories'
        }
        break
      case 'written-user-stories':
        if (writtenUserStories !== null) {
          await updateOnboarding.mutateAsync({ writtenUserStories })
          // All questions answered, redirect to app
          router.push('/app')
          return
        }
        break
    }

    if (nextStep) {
      setStep(nextStep)
    }
  }

  const canContinue = () => {
    switch (step) {
      case 'customer-type':
        return customerType !== null
      case 'current-testing':
        return currentTesting.trim().length > 0
      case 'goals':
        return goals.trim().length > 0
      case 'broken-feature':
        return brokenFeature.trim().length > 0
      case 'written-user-stories':
        return writtenUserStories !== null
      default:
        return false
    }
  }

  const currentQuestion = questions[step]

  return (
    <div className="min-h-screen flex items-center justify-center">
      <EmptyState
        kanji={currentQuestion.kanji}
        kanjiTitle={currentQuestion.kanjiTitle}
        title={currentQuestion.title}
        description={currentQuestion.description}
        action={
          <div className="flex flex-col items-center gap-6 w-full max-w-md">
            {step === 'customer-type' && (
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => setCustomerType('indie-hacker')}
                  className={`p-4 rounded-md border text-left transition-all ${
                    customerType === 'indie-hacker'
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">Indie Hacker</div>
                </button>
                <button
                  onClick={() => setCustomerType('vibe-coder')}
                  className={`p-4 rounded-md border text-left transition-all ${
                    customerType === 'vibe-coder'
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">Vibe Coder</div>
                </button>
                <button
                  onClick={() => setCustomerType('big-tech')}
                  className={`p-4 rounded-md border text-left transition-all ${
                    customerType === 'big-tech'
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">Big Tech</div>
                </button>
                <button
                  onClick={() => setCustomerType('startup')}
                  className={`p-4 rounded-md border text-left transition-all ${
                    customerType === 'startup'
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">Startup</div>
                </button>
              </div>
            )}

            {step === 'current-testing' && (
              <div className="w-full">
                <Label htmlFor="current-testing" className="sr-only">
                  How are you testing today?
                </Label>
                <Textarea
                  id="current-testing"
                  placeholder="Tell us about your current testing approach..."
                  value={currentTesting}
                  onChange={(e) => setCurrentTesting(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            )}

            {step === 'goals' && (
              <div className="w-full">
                <Label htmlFor="goals" className="sr-only">
                  What are your goals with Kyoto?
                </Label>
                <Textarea
                  id="goals"
                  placeholder="What do you hope to achieve with Kyoto?"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            )}

            {step === 'broken-feature' && (
              <div className="w-full">
                <Label htmlFor="broken-feature" className="sr-only">
                  Describe a feature that has broken lately
                </Label>
                <Textarea
                  id="broken-feature"
                  placeholder="Tell us about something in your app that didn't work as expected..."
                  value={brokenFeature}
                  onChange={(e) => setBrokenFeature(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
            )}

            {step === 'written-user-stories' && (
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => setWrittenUserStories(true)}
                  className={`p-4 rounded-md border text-left transition-all ${
                    writtenUserStories === true
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">Yes</div>
                </button>
                <button
                  onClick={() => setWrittenUserStories(false)}
                  className={`p-4 rounded-md border text-left transition-all ${
                    writtenUserStories === false
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">No</div>
                </button>
              </div>
            )}

            <Button
              size="lg"
              onClick={handleContinue}
              disabled={!canContinue() || updateOnboarding.isPending}
              className="w-full"
            >
              {updateOnboarding.isPending ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        }
      />
    </div>
  )
}
