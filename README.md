<div align="center">
<h1>Discord Invites Tracker</h1>
<p>
    <a href="https://discord.gg/4JVfk6uKCk"><img src="https://img.shields.io/discord/827220483496869899" alt="discord server" /></a>
    <a href="https://www.npmjs.com/package/discord-invites-tracker"><img src="https://img.shields.io/npm/v/discord-invites-tracker.svg" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/discord-invites-tracker"><img src="https://img.shields.io/npm/dt/discord-invites-tracker.svg" alt="npm downloads" /></a>
  </p>
</div>

## About

discord-invites-tracker is a simple [Node.js](https://nodejs.org) module that allows you to easily track invites of a guild

## Installation

```sh
npm install discord-invites-tracker
# or
yarn add discord-invites-tracker
```

## Example

```js
const { Client, Intents } = require("discord.js");
const client = new Client({
    intents: [Intents.FLAGS.GUILDS],
});
const invitesTracker = require("discord-invites-tracker");
const tracker = new invitesTracker(client);

tracker.on("guildMemberAdd", (member) => {
    const welcomeChannel = member.guild.channels.cache.get("YOUR WELCOME CHANNEL ID HERE");

    if (!member.inviter) return welcomeChannel.send(`I'm unable to track who invited ${member}`);
    else return welcomeChannel.send(`Welcome ${member}! Invited by ${member.inviter}`);
});

client.login("YOUR BOT TOKEN HERE");
```

## Help
Join my [discord server](https://discord.gg/4JVfk6uKCk) for support regarding this module