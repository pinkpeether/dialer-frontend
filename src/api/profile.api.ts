import api from './axios'

export type ProfileUpdate = {
  name?: string
  email?: string
  displayName?: string
  phone?: string
}

export type PasswordChange = {
  currentPassword: string
  newPassword: string
}

export const profileAPI = {
  update: async (data: ProfileUpdate): Promise<void> => {
    await api.patch('/auth/profile', data)
  },

  changePassword: async (data: PasswordChange): Promise<void> => {
    await api.post('/auth/change-password', data)
  },
}