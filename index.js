const { EventEmitter } = require('events');
const mongoose = require('mongoose');

module.exports = class extends EventEmitter {
    constructor(client, options = {}) {
        super();
        if (!client) throw new Error('Pass the client in options.');
        this.client = client;
        let mongourl = options.mongourl;

        let connection;
        if (mongourl) connection = mongoose.createConnection(mongourl, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        this.model = connection.model('discord-invite-manager', new mongoose.Schema({
            guildId: { type: String, required: true },
            userId: { type: String, required: true },
            invites: { type: Number, default: 0 },
            invitedBy: { type: String }
        }));

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

        this.client.on('guildMemberAdd', async (member) => {
            const { guild } = member;

            const invitesBefore = invitesCount[guild.id];
            const invitesAfter = await fetchInvites(guild);

            for (const inviter in invitesAfter) {
                if (invitesAfter[inviter] - invitesBefore[inviter] === 1) {
                    let data = new this.model();
                    data.guildId = guild.id;
                    data.userId = member.id;
                    data.invitedBy = inviter;
                    data.save();
                    const user = await client.users.fetch(inviter);
                    member['inviter'] = user;
                    if (connection) {
                        let getData = await new Promise(async (resolve) => {
                            let userData = await this.model.findOne({ guildId: guild.id, userId: inviter });
                            if (!userData) {
                                userData = new this.model();
                                userData['guildId'] = guild.id;
                                userData['userId'] = inviter;
                            };
                            userData['invites']++;
                            userData.save();
                            resolve(userData);
                        });
                        member['invites'] = getData.invites;
                    }
                    invitesCount[guild.id] = invitesAfter;
                    return this.emit('guildMemberAdd', member);
                };
            };
            return this.emit('guildMemberAdd', member);
        });

        this.client.on('guildMemberRemove', async (member) => {
            const { guild } = member;
            let data = await this.model.findOne({ guildId: guild.id, userId: member.id });
            if (!data) return;
            let userData = await this.model.findOne({ guildId: guild.id, userId: data.invitedBy });
            userData.invites--;
            userData.save();
            data.delete();
        });
    };

    static async getInvites(user, guild) {
        if (!user || !guild) throw new Error('Please pass the user');
        let userData = await this.model.findOne({ guildId: guild.id, userId: user.id });
        if (!userData) return 0;
        else return userData.invites;
    };
};