import { type Meta, type StoryObj } from '@storybook/nextjs-vite'

import { ShikiCodeBlock } from './shiki-code-block.js'

const meta = {
  title: 'Components/Shiki Code Block',
  component: ShikiCodeBlock,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    code: {
      control: 'text',
      description: 'The code to highlight',
    },
    language: {
      control: 'select',
      options: [
        'typescript',
        'javascript',
        'tsx',
        'jsx',
        'python',
        'bash',
        'json',
        'yaml',
        'markdown',
        'html',
        'css',
      ],
      description: 'The programming language for syntax highlighting',
    },
    fileName: {
      control: 'text',
      description: 'Optional file name to display in the header',
    },
    githubUrl: {
      control: 'text',
      description: 'Optional GitHub URL to display in the header',
    },
  },
} satisfies Meta<typeof ShikiCodeBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    code: 'const hello = "world"\nconsole.log(hello)',
    language: 'typescript',
  },
}

export const WithFileName: Story = {
  args: {
    code: `function greet(name: string) {
  return \`Hello, \${name}!\`
}

greet('World')`,
    language: 'typescript',
    fileName: 'src/utils/greet.ts',
  },
}

export const WithGitHubUrl: Story = {
  args: {
    code: `import { useState, useEffect } from 'react'

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue)
  
  useEffect(() => {
    console.log('Count changed:', count)
  }, [count])
  
  return { count, setCount }
}`,
    language: 'tsx',
    fileName: 'hooks/use-counter.ts',
    githubUrl: 'https://github.com/example/repo/blob/main/hooks/use-counter.ts',
  },
}

export const JavaScript: Story = {
  args: {
    code: `// Async function example
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`/api/users/\${userId}\`)
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch user:', error)
    throw error
  }
}`,
    language: 'javascript',
    fileName: 'utils/api.js',
  },
}

export const Python: Story = {
  args: {
    code: `def fibonacci(n: int) -> int:
    """Calculate the nth Fibonacci number."""
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# Example usage
result = fibonacci(10)
print(f"Fibonacci(10) = {result}")`,
    language: 'python',
    fileName: 'math/fibonacci.py',
  },
}

export const JSON: Story = {
  args: {
    code: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  }
}`,
    language: 'json',
    fileName: 'package.json',
  },
}

export const Bash: Story = {
  args: {
    code: `#!/bin/bash

# Deploy script
echo "Building application..."
npm run build

echo "Running tests..."
npm test

echo "Deploying to production..."
npm run deploy`,
    language: 'bash',
    fileName: 'scripts/deploy.sh',
  },
}

export const LongCode: Story = {
  args: {
    code: `// This is a longer example to show scrolling behavior
interface User {
  id: string
  name: string
  email: string
  createdAt: Date
  updatedAt: Date
  preferences: {
    theme: 'light' | 'dark'
    notifications: boolean
    language: string
  }
}

function createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
  return {
    id: generateId(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function updateUser(id: string, updates: Partial<User>): User {
  const user = getUserById(id)
  return {
    ...user,
    ...updates,
    updatedAt: new Date(),
  }
}

function deleteUser(id: string): void {
  users.delete(id)
  emitEvent('user.deleted', { id })
}`,
    language: 'typescript',
    fileName: 'services/user-service.ts',
    githubUrl:
      'https://github.com/example/repo/blob/main/services/user-service.ts',
  },
}

export const InContainer: Story = {
  args: {
    code: `export const Button = ({ children, onClick }) => {
  return (
    <button onClick={onClick} className="btn">
      {children}
    </button>
  )
}`,
    language: 'tsx',
    fileName: 'components/button.tsx',
  },
  render: (args) => (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Code Example</h2>
      <p className="text-muted-foreground mb-4">
        This code block is displayed within a container to demonstrate its
        appearance in a typical layout.
      </p>
      <ShikiCodeBlock {...args} />
    </div>
  ),
}
