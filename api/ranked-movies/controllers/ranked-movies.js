'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/3.0.0-beta.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const axios = require('axios')
const tmdbAPI = `https://api.themoviedb.org/3/movie`
function log (str) {
  console.log(str)
}

function getYYYYMMDD () {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`
}
async function popMovie () {
  const key = getYYYYMMDD()
  const dbResult = await strapi.query('ranked-movies').findOne({ key: `pop-${key}` })
  let content = null
  console.log('pop movie list', key, dbResult)
  if (!dbResult) {
    const { data } = await axios.get(`${tmdbAPI}/popular/?api_key=${process.env.TMDB_API_KEY}&language=en-US&page=1`)
    console.log(data)
    if (data.hasOwnProperty('results') && data.results) {
      const movieData = await strapi.query('ranked-movies').create({
        key,
        list: data.results,
      })
      content = movieData
      console.log('ranked data pop ', movieData)
    }
  } else {
    content = dbResult
  }

  return content
}

module.exports = {
  popMovie
};
