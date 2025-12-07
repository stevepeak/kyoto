declare module 'object-treeify' {
  interface TreeifyOptions {
    joined?: boolean
    spacerNeighbour?: string
    spacerNoNeighbour?: string
    keyNoNeighbour?: string
    keyNeighbour?: string
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function treeify(tree: Record<string, any>, options?: TreeifyOptions): string

  export default treeify
}
