import {
  type VibeCheckAgentResult,
  type VibeCheckFile,
  type VibeCheckFileFinding,
  vibeCheckFileSchema,
} from '@app/schemas'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as vscode from 'vscode'

const CHECK_FILE_PATH = '.kyoto/vibe/check/check.json'

export function activate(context: vscode.ExtensionContext): void {
  const vibeChecksProvider = new VibeChecksProvider()
  const vibeTestsProvider = new VibeTestsProvider()

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'kyoto.vibeChecks',
      vibeChecksProvider,
    ),
    vscode.window.registerTreeDataProvider(
      'kyoto.vibeTests',
      vibeTestsProvider,
    ),
    vscode.commands.registerCommand('kyoto.refreshVibeChecks', () => {
      vibeChecksProvider.refresh()
    }),
    vscode.commands.registerCommand(
      'kyoto.openFinding',
      (finding: FindingItem) => {
        const deepLink = generateCursorDeepLink(finding)
        vscode.env.openExternal(vscode.Uri.parse(deepLink))
      },
    ),
  )

  // Watch for check.json changes in all workspace folders
  const watchers: vscode.FileSystemWatcher[] = []
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const pattern = new vscode.RelativePattern(folder, CHECK_FILE_PATH)
    const watcher = vscode.workspace.createFileSystemWatcher(pattern)

    watcher.onDidChange(() => vibeChecksProvider.refresh())
    watcher.onDidCreate(() => vibeChecksProvider.refresh())
    watcher.onDidDelete(() => vibeChecksProvider.refresh())

    watchers.push(watcher)
    context.subscriptions.push(watcher)
  }
}

export function deactivate(): void {}

/**
 * Generates a Cursor deep link URL that spawns a new agent with a prompt
 * to fix the specified finding.
 */
function generateCursorDeepLink(finding: FindingItem): string {
  const promptParts: string[] = []

  promptParts.push(`Fix: ${finding.message}`)

  if (finding.path) {
    promptParts.push(`\n\nFile: ${finding.path}`)
  }

  if (finding.suggestion) {
    promptParts.push(`\n\nSuggestion: ${finding.suggestion}`)
  }

  promptParts.push(
    `\n\nThis issue was detected by the ${finding.agentLabel} agent.`,
  )

  const severityContext =
    finding.severity === 'error'
      ? 'This is a critical issue that must be fixed.'
      : finding.severity === 'warn'
        ? 'This is an important issue that should be addressed.'
        : 'This is a code improvement suggestion.'

  promptParts.push(severityContext)

  const prompt = promptParts.join('')
  const baseUrl = 'cursor://anysphere.cursor-deeplink/prompt'
  const url = new URL(baseUrl)
  url.searchParams.set('text', prompt)

  return url.toString()
}

type VibeCheckTreeItem = AgentItem | FindingItem | MetadataItem

class VibeChecksProvider implements vscode.TreeDataProvider<VibeCheckTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    VibeCheckTreeItem | undefined | null | void
  >()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private checkData: VibeCheckFile | null = null

  refresh(): void {
    this.checkData = null
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: VibeCheckTreeItem): vscode.TreeItem {
    return element
  }

  getChildren(
    element?: VibeCheckTreeItem,
  ): vscode.ProviderResult<VibeCheckTreeItem[]> {
    if (!element) {
      // Root level - load data and return agents
      return this.getRootItems()
    }

    if (element instanceof AgentItem) {
      // Return findings for this agent
      return element.agent.findings.map(
        (finding) => new FindingItem(finding, element.agent.label),
      )
    }

    return []
  }

  private async getRootItems(): Promise<VibeCheckTreeItem[]> {
    const data = await this.loadCheckFile()
    if (!data) {
      return [
        new MetadataItem(
          'No vibe check results found',
          'Run `kyoto vibe check` to generate results',
        ),
      ]
    }

    const items: VibeCheckTreeItem[] = []

    // Add metadata item showing when it ran
    const timestamp = new Date(data.timestamp)
    const timeAgo = getTimeAgo(timestamp)
    items.push(
      new MetadataItem(
        `Last run: ${timeAgo}`,
        data.git.headCommit
          ? `Commit: ${data.git.headCommit.slice(0, 7)}`
          : undefined,
      ),
    )

    // Add agent items
    for (const agent of data.agents) {
      items.push(new AgentItem(agent))
    }

    return items
  }

  private async loadCheckFile(): Promise<VibeCheckFile | null> {
    if (this.checkData) {
      return this.checkData
    }

    const folders = vscode.workspace.workspaceFolders
    if (!folders || folders.length === 0) {
      return null
    }

    // Try to find check.json in the first workspace folder
    const checkPath = path.join(folders[0].uri.fsPath, CHECK_FILE_PATH)

    try {
      const content = fs.readFileSync(checkPath, 'utf-8')
      const parsed = JSON.parse(content)
      const result = vibeCheckFileSchema.safeParse(parsed)

      if (result.success) {
        this.checkData = result.data
        return result.data
      }

      return null
    } catch {
      return null
    }
  }
}

class AgentItem extends vscode.TreeItem {
  constructor(public readonly agent: VibeCheckAgentResult) {
    const findingCount = agent.findings.length
    const label =
      findingCount > 0 ? `${agent.label} (${findingCount})` : agent.label

    super(
      label,
      findingCount > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    )

    this.description = agent.status
    this.iconPath = this.getIcon()
    this.contextValue = 'agent'
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.agent.status) {
      case 'fail':
        return new vscode.ThemeIcon(
          'error',
          new vscode.ThemeColor('errorForeground'),
        )
      case 'warn':
        return new vscode.ThemeIcon(
          'warning',
          new vscode.ThemeColor('editorWarning.foreground'),
        )
      case 'success':
        return new vscode.ThemeIcon(
          'pass',
          new vscode.ThemeColor('testing.iconPassed'),
        )
    }
  }
}

class FindingItem extends vscode.TreeItem {
  public readonly message: string
  public readonly path?: string
  public readonly suggestion?: string
  public readonly severity: 'info' | 'warn' | 'error'
  public readonly agentLabel: string

  constructor(finding: VibeCheckFileFinding, agentLabel: string) {
    super(finding.message, vscode.TreeItemCollapsibleState.None)

    this.message = finding.message
    this.path = finding.path
    this.suggestion = finding.suggestion
    this.severity = finding.severity
    this.agentLabel = agentLabel

    this.description = finding.path
    this.tooltip = this.buildTooltip(finding)
    this.iconPath = this.getIcon(finding.severity)
    this.contextValue = 'finding'

    // Make finding clickable to open deep link
    this.command = {
      command: 'kyoto.openFinding',
      title: 'Open Finding',
      arguments: [this],
    }
  }

  private buildTooltip(finding: VibeCheckFileFinding): vscode.MarkdownString {
    const md = new vscode.MarkdownString()
    md.appendMarkdown(`**${finding.message}**\n\n`)

    if (finding.path) {
      md.appendMarkdown(`📁 ${finding.path}\n\n`)
    }

    if (finding.suggestion) {
      md.appendMarkdown(`💡 ${finding.suggestion}\n\n`)
    }

    md.appendMarkdown(`_Click to open in Cursor agent_`)
    return md
  }

  private getIcon(severity: 'info' | 'warn' | 'error'): vscode.ThemeIcon {
    switch (severity) {
      case 'error':
        return new vscode.ThemeIcon(
          'error',
          new vscode.ThemeColor('errorForeground'),
        )
      case 'warn':
        return new vscode.ThemeIcon(
          'warning',
          new vscode.ThemeColor('editorWarning.foreground'),
        )
      case 'info':
        return new vscode.ThemeIcon(
          'info',
          new vscode.ThemeColor('editorInfo.foreground'),
        )
    }
  }
}

class MetadataItem extends vscode.TreeItem {
  constructor(label: string, description?: string) {
    super(label, vscode.TreeItemCollapsibleState.None)
    this.description = description
    this.iconPath = new vscode.ThemeIcon('clock')
    this.contextValue = 'metadata'
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) {
    return 'just now'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  return `${diffDays}d ago`
}

class VibeTestsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): Thenable<vscode.TreeItem[]> {
    const item = new vscode.TreeItem(
      'Coming soon...',
      vscode.TreeItemCollapsibleState.None,
    )
    item.iconPath = new vscode.ThemeIcon('beaker')
    return Promise.resolve([item])
  }
}
