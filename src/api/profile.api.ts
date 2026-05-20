import api from './axios'

export type ProfileUpdate = {
  name?: string
  phone?: string
  extension?: string
}

export type PasswordChange = {
  currentPassword: string
  newPassword: string
}

export const profileAPI = {
  update: async (data: ProfileUpdate) => {
    const res = await api.patch('/agents/me', data)
    return res.data.data
  },

  changePassword: async (data: PasswordChange): Promise<void> => {
    await api.post('/auth/change-password', data)
  },
}
