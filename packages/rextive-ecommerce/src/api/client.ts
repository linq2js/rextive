import type { 
  Product, 
  ProductsResponse, 
  Category, 
  User, 
  LoginCredentials,
  Cart 
} from './types'

const BASE_URL = 'https://dummyjson.com'

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  endpoint: string, 
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ApiError(
      data?.message || `HTTP ${response.status}`,
      response.status,
      data
    )
  }

  return response.json()
}

// Products API
export const productsApi = {
  /** Get all products with pagination */
  getAll: (params: {
    limit?: number
    skip?: number
    select?: string[]
  } = {}, signal?: AbortSignal): Promise<ProductsResponse> => {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.skip) searchParams.set('skip', String(params.skip))
    if (params.select?.length) searchParams.set('select', params.select.join(','))
    
    const query = searchParams.toString()
    return request(`/products${query ? `?${query}` : ''}`, {}, signal)
  },

  /** Get single product by ID */
  getById: (id: number, signal?: AbortSignal): Promise<Product> => {
    return request(`/products/${id}`, {}, signal)
  },

  /** Search products */
  search: (query: string, params: {
    limit?: number
    skip?: number
  } = {}, signal?: AbortSignal): Promise<ProductsResponse> => {
    const searchParams = new URLSearchParams()
    searchParams.set('q', query)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.skip) searchParams.set('skip', String(params.skip))
    
    return request(`/products/search?${searchParams}`, {}, signal)
  },

  /** Get products by category */
  getByCategory: (category: string, params: {
    limit?: number
    skip?: number
  } = {}, signal?: AbortSignal): Promise<ProductsResponse> => {
    const searchParams = new URLSearchParams()
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.skip) searchParams.set('skip', String(params.skip))
    
    const query = searchParams.toString()
    return request(`/products/category/${category}${query ? `?${query}` : ''}`, {}, signal)
  },

  /** Get all categories */
  getCategories: (signal?: AbortSignal): Promise<Category[]> => {
    return request('/products/categories', {}, signal)
  },

  /** Sort products */
  getSorted: (params: {
    sortBy: 'title' | 'price' | 'rating'
    order?: 'asc' | 'desc'
    limit?: number
    skip?: number
  }, signal?: AbortSignal): Promise<ProductsResponse> => {
    const searchParams = new URLSearchParams()
    searchParams.set('sortBy', params.sortBy)
    if (params.order) searchParams.set('order', params.order)
    if (params.limit) searchParams.set('limit', String(params.limit))
    if (params.skip) searchParams.set('skip', String(params.skip))
    
    return request(`/products?${searchParams}`, {}, signal)
  },
}

// Auth API
export const authApi = {
  /** Login user */
  login: (credentials: LoginCredentials, signal?: AbortSignal): Promise<User> => {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }, signal)
  },

  /** Get current user (requires token) */
  getCurrentUser: (token: string, signal?: AbortSignal): Promise<User> => {
    return request('/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, signal)
  },

  /** Refresh token */
  refreshToken: (refreshToken: string, signal?: AbortSignal): Promise<{ accessToken: string; refreshToken: string }> => {
    return request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken, expiresInMins: 30 }),
    }, signal)
  },
}

// Cart API (for reference - we'll use local cart primarily)
export const cartApi = {
  /** Get user's carts */
  getByUser: (userId: number, signal?: AbortSignal): Promise<{ carts: Cart[] }> => {
    return request(`/carts/user/${userId}`, {}, signal)
  },

  /** Add new cart */
  add: (userId: number, products: { id: number; quantity: number }[], signal?: AbortSignal): Promise<Cart> => {
    return request('/carts/add', {
      method: 'POST',
      body: JSON.stringify({ userId, products }),
    }, signal)
  },

  /** Update cart */
  update: (cartId: number, products: { id: number; quantity: number }[], signal?: AbortSignal): Promise<Cart> => {
    return request(`/carts/${cartId}`, {
      method: 'PUT',
      body: JSON.stringify({ products }),
    }, signal)
  },
}

export { ApiError }

