'use strict';
const { mylog } = require('../../utils/')
/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const axios = require('axios')
const tmdbAPI = `https://api.themoviedb.org/3/movie`

function getYYYYMMDD() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}
async function popMovie() {
  const key = getYYYYMMDD()
  const dbResult = await strapi.query('ranked-movies').findOne({ key: `pop-${key}` })
  let content = null
  mylog.log('pop movie list', key, dbResult)
  if (!dbResult) {
    const { data } = await axios.get(`${tmdbAPI}/popular/?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`)
    mylog.log(data)
    if (data.hasOwnProperty('results') && data.results) {
      const movieData = await strapi.query('ranked-movies').create({
        key,
        list: data.results,
      })
      content = movieData
      mylog.log('ranked data pop ', movieData)
    }
  } else {
    content = dbResult
  }

  return content
}

module.exports = {
  popMovie
};
