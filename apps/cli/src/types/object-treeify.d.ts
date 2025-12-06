declare module 'object-treeify' {
  interface TreeifyOptions {
    joined?: boolean
    spacerNeighbour?: string
    spacerNoNeighbour?: string
    keyNoNeighbour?: string
    keyNeighbour?: string
  }

  function treeify(
    tree: Record<string, any>,
    options?: TreeifyOptions,
  ): string

  export default treeify
}

