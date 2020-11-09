const axios = require('axios')
const TorrentSearchApi = require('torrent-search-api')
const WebTorrent = require('webtorrent')

TorrentSearchApi.enablePublicProviders()
const WT = new WebTorrent()

const omdbAPI = `http://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&t=`
const DOWNLOAD_OPT = {
  path: process.env.DOWNLOAD_PATH,
}


const mylog = (function () {
  return {
    log: function () {
      if (process.env !== 'production') {
        var args = Array.prototype.slice.call(arguments);
        console.log.apply(console, args);
      }
    },
    warn: function () {
      var args = Array.prototype.slice.call(arguments);
      console.warn.apply(console, args);
    },
    error: function () {
      var args = Array.prototype.slice.call(arguments);
      console.error.apply(console, args);
    }
  }
}())

mylog.log(DOWNLOAD_OPT)
mylog.log(process.env.DOWNLOAD_PATH)

function chownFile(name) {
  const { exec } = require('child_process');
  exec(`chown www-data ${process.env.DOWNLOAD_PATH}/${name}`, (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command
      return
    }

    // the *entire* stdout and stderr (buffered)
    console.err(`${stdout}`)
    console.er(`${stderr}`)
  })
}



async function movieInfo(keyword) {
  const dbResult = await strapi.query('Movie').findOne({ title: keyword })
  let content = null
  if (!dbResult) {
    const { data } = await axios.get(`${omdbAPI}${keyword}`)
    mylog.log(data)
    content = data
  } else {
    content = dbResult.content
  }
  return content
}

module.exports = {
  getMovieInfo: async ctx => {
    mylog.log(ctx.request.query)
    if (ctx.request.query.hasOwnProperty('keyword')) {
      const keyword = ctx.request.query.keyword
      return movieInfo(keyword)
    }
  },
  search: async ctx => {
    mylog.log(ctx.request.query)
    if (ctx.request.query.hasOwnProperty('keyword')) {
      const keyword = ctx.request.query.keyword
      // const providers = ctx.request.query.providers || ['ExtraTorrent',['1337x']]
      const per_page = ctx.request.query.hasOwnProperty('per_page') && ctx.request.query.per_page || 1
      const providers = ctx.request.query.hasOwnProperty('providers') && ctx.request.query.providers || null

      const dbMovieResult = await strapi.query('MovieResult').findOne({ keyword: `${keyword}_${per_page}` })
      mylog.log('dbMovieResult', dbMovieResult)
      let torrents = null

      if (dbMovieResult) {
        const nowTS = new Date()
        const minDiff = (nowTS - new Date(dbMovieResult.updatedAt)) / (60 * 1000)
        mylog.log('minDiff', minDiff)
        if (providers == null && minDiff < 15) {
          mylog.log('using saved search', keyword)
          torrents = dbMovieResult.result
        } else {
          torrents = providers ? await TorrentSearchApi.search(providers, keyword, 'Movies', per_page) :
            await TorrentSearchApi.search(keyword, 'Movies', per_page)
          mylog.log('new searching', keyword)
          const savedResult = await strapi.query('MovieResult').update(
            { id: dbMovieResult.id },
            {
              keyword: `${keyword}_${per_page}`,
              date: new Date(),
              result: torrents,
            })
        }
      } else {
        torrents = providers ? await TorrentSearchApi.search(providers, keyword, 'Movies', per_page) :
          await TorrentSearchApi.search(keyword, 'Movies', per_page)
        mylog.log('searching', keyword)
        const savedResult = await strapi.query('MovieResult').create({
          keyword: `${keyword}_${per_page}`,
          date: new Date(),
          result: torrents,
        })
      }
      mylog.log('tor', torrents)
      if (torrents) {
        let list = []
        for (let torrent of torrents.slice(0, per_page)) {
          mylog.log('torrent', torrent)
          const torrentResult = await strapi.query('torrent-file').findOne({ title: torrent.title })
          mylog.log('find ? ', torrentResult)
          if (!torrentResult) {
            const magnet = await TorrentSearchApi.getMagnet(torrent) || null
            mylog.log('mag', magnet)
            if (magnet) {
              const torrentFile = {
                magnet,
                ...torrent
              }
              mylog.log('torrentFile', torrentFile)
              const torResult = await strapi.query('torrent-file').create(torrentFile)
              mylog.log(torResult)
              list.push(torResult)
            }
          } else if (torrentResult) {
            list.push(torrentResult)
          }

        }

        mylog.log('list', list)
        return {
          keyword: ctx.request.query.keyword,
          torrent_count: torrents.length,
          movies: list
        }
      }

      return {
        keyword: ctx.request.query.keyword,
        torrent_count: torrents.length,
        message: 'not found',
        torrents
      }
    } else {
      return {
        message: 'Missing keyword not found',
      }
    }
  },
  magnet: async ctx => {
    // {
    //   title: 'Aladdin (2019) [WEBRip] [720p] [YTS] [YIFY]',
    //   time: "Aug. 7th '19",
    //   seeds: 13874,
    //   peers: 5264,
    //   size: '1.0 GB',
    //   desc: 'http://www.1337x.to/torrent/3927227/Aladdin-2019-WEBRip-720p-YTS-YIFY/',
    //   provider: '1337x'
    // }
    mylog.log(ctx.params.torrent)
    const magnet = await TorrentSearchApi.getMagnet(torrent)
  },
  providers: async ctx => {
    const providers = await TorrentSearchApi.getProviders();
    return providers
  },
  activeProviders: async ctx => {
    const providers = await TorrentSearchApi.getActiveProviders();
    return providers
  },
  magDownload: async ctx => {
    const torrentId = ctx.request.body.hasOwnProperty('params') && ctx.request.body.params.hasOwnProperty('magnet') ? ctx.request.body.params.magnet : null
    mylog.log(torrentId)
    if (!torrentId) return 'missing torrentId'

    const handler = (torrent) => {
      // Print out progress every 5 seconds
      var interval = setInterval(function () {
        const percent = (torrent.progress * 100).toFixed(1)
        mylog.log(`Progress ${title}: ${percent}%`)
      }, 5000)

      torrent.on('done', function () {
        mylog.log(`Progress ${title}: 100%`)
        WT.remove(torrentId, DOWNLOAD_OPT, handler)
        chownFile(dbTorrentFileResult.title)
        clearInterval(interval)
      })
    }
    if (!WT.get(torrentId)) {
      WT.add(torrentId, DOWNLOAD_OPT, handler)
    }

    return true
  },
  download: async ctx => {
    mylog.log(ctx)
    mylog.log(ctx.request.body)

    const torrentId = ctx.request.body.hasOwnProperty('params') && ctx.request.body.params.hasOwnProperty('torrentId') ? ctx.request.body.params.torrentId : null

    mylog.log(torrentId)
    if (!torrentId) return 'missing torrentId'

    const dbTorrentFileResult = await strapi.query('torrent-file').findOne({ magnet: torrentId })
    const title = dbTorrentFileResult && dbTorrentFileResult.hasOwnProperty('title') ? dbTorrentFileResult.title : 'not from db'
    mylog.log('starting', title)
    const handler = (torrent) => {
      var file = torrent.files.find(function (file) {
        return file.name.endsWith('.mp4') || file.name.endsWith('.srt') || file.name.endsWith('.jpg')
      })
      // Print out progress every 5 seconds
      var interval = setInterval(function () {
        const percent = (torrent.progress * 100).toFixed(1)
        mylog.log(`Progress ${title}: ${percent}%`)
        if (dbTorrentFileResult) {
          strapi.query('torrent-file').update(
            { id: dbTorrentFileResult.id },
            { status: 'downloading', percent }
          )
        }
      }, 5000)

      torrent.on('done', function () {
        mylog.log(`Progress ${title}: 100%`)
        if (dbTorrentFileResult) {
          strapi.query('torrent-file').update(
            { id: dbTorrentFileResult.id },
            { status: 'done', percent: 100 }
          )
        }
        WT.remove(torrentId, DOWNLOAD_OPT, handler)
        chownFile(dbTorrentFileResult.title)
        clearInterval(interval)
      })

      // // Render all files into to the page
      // torrent.files.forEach(function (file) {
      //   file.appendTo('.mylog.log')
      //   mylog.log('(Blob URLs only work if the file is loaded from a server. "http//localhost" works. "file://" does not.)')
      //   file.getBlobURL(function (err, url) {
      //     if (err) return mylog.log(err.message)
      //     mylog.log('File done.')
      //     mylog.log('<a href="' + url + '">Download full file: ' + file.name + '</a>')
      //   })
      // })
    }
    if (!WT.get(torrentId)) {
      WT.add(torrentId, DOWNLOAD_OPT, handler)
    }

    return true
  }
};