const { EventEmitter } = require('events');

module.exports = class extends EventEmitter {
    constructor(client) {
        super();
        this.client = client;

        const fetchInvites = async (guild) => {
            return await new Promise((resolve) => {
                guild.invites.fetch().then((invites) => {
                    let guildInviteCount = {};
                    invites.forEach((invite) => {
                        const { inviter, uses } = invite;
                        guildInviteCount[inviter.id] = (guildInviteCount[inviter.id] || 0) + uses;
                    });
                    resolve(guildInviteCount);
                });
            });
        };
        let invitesCount = {}; // { guildId: { userId: inviteCount , ... }, ... }

        this.client.on('ready', async () => {
            client.guilds.cache.forEach(async (guild) => {
                invitesCount[guild.id] = await fetchInvites(guild);
            });
        });

        this.client.on('inviteCreate', async (invite) => {
            const { inviter, guild } = invite;
            invitesCount[guild.id][inviter.id] = invitesCount[guild.id][inviter.id] || 0;
        });

        this.client.on('inviteDelete', async (invite) => {
            const { guild } = invite;
            invitesCount[guild.id] = await fetchInvites(guild);
        });

        this.client.on('guildMemberAdd', async (member) => {
            const { guild } = member;

            const invitesBefore = invitesCount[guild.id];
            const invitesAfter = await fetchInvites(guild);

            for (const inviter in invitesAfter) {
                if (invitesAfter[inviter] - invitesBefore[inviter] === 1) {
                    const user = await client.users.fetch(inviter);
                    member['inviter'] = user;
                    invitesCount[guild.id] = invitesAfter;
                    return this.emit('guildMemberAdd', member);
                } else {
                    return this.emit('guildMemberAdd', member);
                };
            };
        });
    };
};