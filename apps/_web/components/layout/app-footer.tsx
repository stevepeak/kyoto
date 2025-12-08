export function AppFooter() {
  return (
    <footer className="border-t bg-muted/30 py-3">
      <div className="flex items-center justify-center px-4 text-sm text-muted-foreground">
        <span>
          Crafted with intent on{' '}
          <a
            href="https://github.com/stevepeak/kyoto"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Kyoto on GitHub"
          >
            GitHub
          </a>
        </span>
      </div>
    </footer>
  )
}
