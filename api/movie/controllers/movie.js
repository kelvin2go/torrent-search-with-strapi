'use strict';

const { mylog } = require('../../utils/')
/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const axios = require('axios')
const omdbAPI = `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=`

async function movieInfo(keyword) {
  if (!keyword) return
  const dbResult = await strapi.query('Movie').findOne({ title: keyword.toLowerCase() })
  let content = {
    title: '',
    imdbID: [],
    info: []
  }
  mylog.log('movieInfo', keyword, dbResult)
  if (!dbResult) {
    const { data } = await axios.get(`${omdbAPI}${keyword}`)
    mylog.log('movieinfo search result', data)
    if (data && !data.hasOwnProperty('Error')) {
      try {
        const movieData = await strapi.query('Movie').create({
          title: data.Title.toLowerCase(),
          imdbID: data.imdbID,
          info: data
        })
        content = movieData
      } catch (err) {
        mylog.log(err)
      }

    }
  } else {
    content = dbResult
  }

  return content
}

module.exports = {
  getMovieInfo: async ctx => {
    // console.log(ctx.request.query)
    if (ctx.request.query.hasOwnProperty('keyword')) {
      const keyword = ctx.request.query.keyword
      return movieInfo(keyword)
    }
  }
}