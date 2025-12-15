import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
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
  )
}

export function deactivate() {}

class VibeChecksProvider implements vscode.TreeDataProvider<TreeItem> {
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): Thenable<TreeItem[]> {
    return Promise.resolve([new TreeItem('Hello World')])
  }
}

class VibeTestsProvider implements vscode.TreeDataProvider<TreeItem> {
  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element
  }

  getChildren(): Thenable<TreeItem[]> {
    return Promise.resolve([new TreeItem('Hello World')])
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(label: string) {
    super(label, vscode.TreeItemCollapsibleState.None)
  }
}
