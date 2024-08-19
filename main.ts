import { Plugin, TFile, Notice, MenuItem, MarkdownView, WorkspaceLeaf } from 'obsidian'

export default class MarkdownSourceViewPlugin extends Plugin {
  sourceViewPaths: string[] = []

  async onload() {
    await this.loadSettings()

    // Register file menu items
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          const isSourceView = this.sourceViewPaths.includes(file.path)
          menu.addItem((item: MenuItem) => {
            item
              .setTitle(isSourceView ? 'Disable default source view' : 'Enable default source view')
              .setIcon(isSourceView ? 'code-off' : 'code')
              .onClick(() => this.toggleSourceViewMode(file))
          })
        }
      })
    )

    // Handle file open to check if it should be opened in source view
    this.registerEvent(
      this.app.workspace.on('file-open', (file: TFile | null) => {
        if (file && file.extension === 'md') {
          setImmediate(() => {
            const isSourceView = this.sourceViewPaths.includes(file.path)
            const view = this.app.workspace.getActiveViewOfType(MarkdownView)
            if (view) {
              this.handleState(view.leaf, isSourceView)
            }
          })
        }
      })
    )

    // Register command to toggle source view mode for current file
    this.addCommand({
      id: 'toggle-source-view-mode',
      name: 'Toggle default source view mode for current file',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile()
        if (file && file.extension === 'md') {
          if (!checking) {
            this.toggleSourceViewMode(file)
          }
          return true
        }
        return false
      }
    })
  }

  async loadSettings() {
    const data = await this.loadData()
    this.sourceViewPaths = data?.sourceViewPaths || []
  }

  async saveSettings() {
    await this.saveData({ sourceViewPaths: this.sourceViewPaths })
  }

  async toggleSourceViewMode(file: TFile) {
    const isSourceView = this.sourceViewPaths.includes(file.path)
    if (isSourceView) {
      this.sourceViewPaths = this.sourceViewPaths.filter(path => path !== file.path)
      new Notice(`Default source view disabled for ${file.name}`)
    } else {
      this.sourceViewPaths.push(file.path)
      new Notice(`Default source view enabled for ${file.name}`)
    }
    await this.saveSettings()

    // Get all markdown leaves
    const markdownLeaves = this.app.workspace.getLeavesOfType('markdown')

    // Iterate through all markdown leaves
    markdownLeaves.forEach(leaf => {
      if (leaf.view instanceof MarkdownView && leaf.view.file === file) {
        this.handleState(leaf, !isSourceView)
      }
    })
  }

  handleState(leaf: WorkspaceLeaf, sourceStatus: boolean) {
    const viewState = leaf.getViewState()
    viewState.state.mode = 'source'
    viewState.state.source = sourceStatus
    leaf.setViewState(viewState)
  }
}
