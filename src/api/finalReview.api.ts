import api from './axios'

const reviewPath = ['/support', '/diagnostics', '/access-review'].join('')

export const finalReviewAPI = {
  get: async () => {
    const res = await api.get(reviewPath)
    return res.data.data
  },
}
