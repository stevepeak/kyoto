const LINEAR_API_URL = 'https://api.linear.app/graphql'

interface LinearGraphQLResponse<T> {
  data?: T
  errors?: Array<{
    message: string
    extensions?: {
      code?: string
    }
  }>
}

export { LINEAR_API_URL }
export type { LinearGraphQLResponse }


