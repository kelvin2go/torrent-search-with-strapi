module.exports = {

  me: async ctx => {
    return {
      user: {
        blocked: ctx.state.user.blocked,
        id: ctx.state.user.id,
        email: ctx.state.user.email,
        username: ctx.state.user.username,
      }
    }
  },

};