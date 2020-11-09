module.exports = ({ env }) => ({
  defaultConnection: 'default',
  connections: {
    default: {
      connector: 'mongoose',
      // settings: {
      //   client: 'sqlite',
      //   filename: env('DATABASE_FILENAME', '.tmp/data.db'),
      // },
      settings: {
        uri: env('DATABASE_URI'),
      },
      options: {
        useNullAsDefault: true,
      },
    },
  },
});
