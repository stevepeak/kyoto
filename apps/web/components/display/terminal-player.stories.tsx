import { type Meta, type StoryObj } from '@storybook/nextjs-vite'

import { TerminalPlayer } from './terminal-player.js'

// Sample asciicast v2 recording for demos
const sampleRecording = `{"version":2,"width":120,"height":40,"timestamp":1702000000,"title":"Sample Terminal Session","env":{"TERM":"xterm-256color","SHELL":"/bin/bash"}}
[0.1,"o","$ "]
[0.5,"o","echo 'Hello, World!'"]
[0.8,"o","\\r\\n"]
[0.9,"o","Hello, World!\\r\\n"]
[1.1,"o","$ "]
[1.5,"o","ls -la"]
[1.8,"o","\\r\\n"]
[2.0,"o","total 48\\r\\n"]
[2.1,"o","drwxr-xr-x  12 user  staff   384 Dec 16 10:00 .\\r\\n"]
[2.2,"o","drwxr-xr-x   5 user  staff   160 Dec 16 09:00 ..\\r\\n"]
[2.3,"o","-rw-r--r--   1 user  staff  1024 Dec 16 10:00 README.md\\r\\n"]
[2.4,"o","-rw-r--r--   1 user  staff  2048 Dec 16 10:00 package.json\\r\\n"]
[2.5,"o","drwxr-xr-x   8 user  staff   256 Dec 16 10:00 src\\r\\n"]
[2.6,"o","$ "]
[3.0,"o","npm run build"]
[3.3,"o","\\r\\n"]
[3.5,"o","\\r\\n> kyoto@0.0.0 build\\r\\n"]
[3.7,"o","> turbo run build\\r\\n"]
[4.0,"o","\\r\\n"]
[4.2,"o","\\x1b[32m•\\x1b[0m Packages in scope: @app/web, @app/api\\r\\n"]
[4.5,"o","\\x1b[32m✓\\x1b[0m @app/api:build (1.2s)\\r\\n"]
[5.0,"o","\\x1b[32m✓\\x1b[0m @app/web:build (3.4s)\\r\\n"]
[5.5,"o","\\r\\n"]
[5.7,"o"," Tasks:    2 successful, 2 total\\r\\n"]
[5.9,"o"," Cached:   0 cached, 2 total\\r\\n"]
[6.1,"o"," Time:     4.8s\\r\\n"]
[6.3,"o","\\r\\n"]
[6.5,"o","$ "]`

const meta = {
  title: 'Components/Terminal Player',
  component: TerminalPlayer,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: [
        'asciinema',
        'dracula',
        'monokai',
        'nord',
        'solarized-dark',
        'solarized-light',
        'tango',
      ],
    },
    fit: {
      control: 'select',
      options: ['width', 'height', 'both', 'none'],
    },
    speed: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
    },
    idleTimeLimit: {
      control: { type: 'range', min: 0.5, max: 10, step: 0.5 },
    },
    autoPlay: {
      control: 'boolean',
    },
    loop: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof TerminalPlayer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    recording: sampleRecording,
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const AutoPlay: Story = {
  args: {
    recording: sampleRecording,
    autoPlay: true,
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const FastPlayback: Story = {
  args: {
    recording: sampleRecording,
    speed: 2,
    autoPlay: true,
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const Looping: Story = {
  args: {
    recording: sampleRecording,
    autoPlay: true,
    loop: true,
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const MonokaiTheme: Story = {
  args: {
    recording: sampleRecording,
    theme: 'monokai',
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const NordTheme: Story = {
  args: {
    recording: sampleRecording,
    theme: 'nord',
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const SolarizedLight: Story = {
  args: {
    recording: sampleRecording,
    theme: 'solarized-light',
    className: 'w-[800px] rounded-lg overflow-hidden',
  },
}

export const Compact: Story = {
  args: {
    recording: sampleRecording,
    className: 'w-[600px] rounded-lg overflow-hidden',
  },
}

export const AllThemes: Story = {
  args: {
    recording: sampleRecording,
  },
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-3">Dracula (default)</h3>
        <TerminalPlayer
          recording={sampleRecording}
          theme="dracula"
          className="w-[700px] rounded-lg overflow-hidden"
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3">Nord</h3>
        <TerminalPlayer
          recording={sampleRecording}
          theme="nord"
          className="w-[700px] rounded-lg overflow-hidden"
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3">Monokai</h3>
        <TerminalPlayer
          recording={sampleRecording}
          theme="monokai"
          className="w-[700px] rounded-lg overflow-hidden"
        />
      </div>
    </div>
  ),
}
