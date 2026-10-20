export interface ApiResult<T> {
  code: number
  msg: string
  data: T
}

export interface Page<T> {
  records: T[]
  total: number
  size: number
  current: number
  pages: number
}

export interface PageParams {
  pageNum?: number
  pageSize?: number
}

// Only profile fields used by the frontend; internal entity fields stay out.
export interface User {
  id: number
  username: string
  nickname: string | null
  avatar: string | null
  campus: string | null
  phone: string | null
  role: 'USER' | 'ADMIN'
  status: number
  createTime: string | null
  updateTime: string | null
}

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams extends LoginParams {
  nickname?: string
  campus?: string
  phone?: string
}

export interface UpdatePasswordParams {
  oldPassword: string
  newPassword: string
}
