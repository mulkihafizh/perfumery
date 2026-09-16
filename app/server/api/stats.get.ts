import { getCatalogueStats } from '../utils/db'

export default defineEventHandler(() => {
  return getCatalogueStats()
})
