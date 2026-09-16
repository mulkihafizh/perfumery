import { getPerfumeDetails } from '../../utils/db'

export default defineEventHandler((event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug parameter is required' })
  }

  const result = getPerfumeDetails(slug)
  if (!result) {
    throw createError({ statusCode: 404, message: `Perfume '${slug}' not found` })
  }

  return result
})
