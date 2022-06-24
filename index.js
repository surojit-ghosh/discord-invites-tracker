const { EventEmitter } = require('events');
const db = require('quick.db');

module.exports = class extends EventEmitter {
    constructor(client, options = {}) {
        super();
        if (!client) throw new Error('Pass the client in options.');
        this.client = client;

        // this.model = connection.model('discord-invite-manager', new mongoose.Schema({
        //     guildId: { type: String, required: true },
        //     userId: { type: String, required: true },
        //     invites: { type: Number, default: 0 },
        //     invitedBy: { type: String }
        // }));

        const fetchInvites = async (guild) => {
            return await new Promise((resolve) => {
                guild.invites.fetch().then((invites) => {
                    let guildInviteCount = {};
                    invites.forEach((invite) => {
                        const { inviter, uses } = invite;
                       if(inviter) guildInviteCount[inviter.id] = (guildInviteCount[inviter.id] || 0) + uses;
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

        this.client.on('guildMemberAdd', async (member) => {
            const { guild } = member;

            const invitesBefore = invitesCount[guild.id];
            const invitesAfter = await fetchInvites(guild);

            for (const inviter in invitesAfter) {
                if (invitesAfter[inviter] - invitesBefore[inviter] === 1) {
                    let data = {
                        guildId: guild.id,
                        userId: member.id,
                        invitedBy: inviter
                    };
                    await db.set(`invitestracker_${guild.id}_${member.id}`, data);
                    const user = await client.users.fetch(inviter);
                    member['inviter'] = user;
                    let getData = await new Promise(async (resolve) => {
                        let userData = await db.get(`invitestracker_${guild.id}_${inviter}`);
                        if (!userData) {
                            userData = {
                                guildId: guild.id,
                                userId: inviter,
                                invites: 0
                            };
                        };
                        userData.invites++;
                        await db.set(`invitestracker_${guild.id}_${inviter}`, userData);
                        resolve(userData);
                    });
                    member['invites'] = getData.invites;
                    invitesCount[guild.id] = invitesAfter;
                    return this.emit('guildMemberAdd', member);
                };
            };
            return this.emit('guildMemberAdd', member);
        });

        this.client.on('guildMemberRemove', async (member) => {
            const { guild } = member;
            let data = await db.get(`invitestracker_${guild.id}_${member.id}`);
            if (!data) return;
            let userData = await db.get(`invitestracker_${guild.id}_${data.invitedBy}`);
            userData ? userData.invites-- : userData = {guildId: guild.id, userId: data.invitedBy, invites: 0};
            await db.set(`invitestracker_${guild.id}_${data.invitedBy}`, userData);
            db.delete(`invitestracker_${guild.id}_${member.id}`);
        });
        
        this.getInvites = async function(user, guild) {
            if (!user || !guild) throw new Error('Please pass the user');
            let userData = await db.get(`invitestracker_${guild.id}_${user.id}`);
            if (!userData) return 0;
            else return userData.invites;
        };
    };

};
