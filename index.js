import * as Discord from "discord.js";
import fetch from "node-fetch";
import * as dotenv from "dotenv";
dotenv.config();

const client = new Discord.Client({
    intents:
        [
            Discord.GatewayIntentBits.DirectMessages,
            Discord.GatewayIntentBits.MessageContent
        ],
    partials: [
        Discord.Partials.Channel
    ]
});

client.on("ready", () => {
    console.info(`Logged in Discord as ${client.user.tag}`);
});

client.on("messageCreate", async message => {
    console.log(message.author.username + " : " + toDisplayMessageContent(message.content, client));
    if (message.author.id == client.user.id)
        return;
    if (message.channel.type != Discord.ChannelType.DM)
        return;
    var response = await getResponse(toDisplayMessageContent(message.content, client), message.author.id);
    if (response)
        message.channel.send(response);
});

client.login(process.env.DISCORD_TOKEN);

/** @type {{string: {id: string, last: number}}} */
const conversations = {}

/**
 * Send message and get response from chatbot
 * @param {string} message 
 * @param {string} userId
 * @returns {Promise<string>}
 */
function getResponse(message, userId, newConversation = undefined) {
    return new Promise((resolve, _reject) => {
        if (!conversations[userId])
            conversations[userId] = {};
        if (newConversation === undefined)
            newConversation = conversations[userId].last + 3600 < Date.now() / 1000;
        conversations[userId].last = Date.now() / 1000;
        var headers = { "Content-Type": "application/json" };
        var body = {
            instance: process.env.BOTLIBRE_INSTANCE,
            application: process.env.BOTLIBRE_APPLICATION,
            message
        };
        if (!newConversation && conversations[userId]?.id)
            body.conversation = conversations[userId].id;
        fetch("https://www.botlibre.com/rest/json/chat", { method: "POST", headers, body: JSON.stringify(body) })
            .then(res => res.json())
            .then(res => {
                conversations[userId].id = res.conversation;
                resolve(res.message);
            });
    });
}

/**
 * Transform raw message content into displayable message content
 * @param {string} message 
 * @param {Discord.Client} client 
 * @param {Discord.Guild?} guild
 * @returns {string}
 */
function toDisplayMessageContent(message, client, guild = null) {
    return message.replace(/<@(!|)([0-9]+)>/, (match, _, id) => {
        var user = client.users.cache.get(id);
        return user ? user.username : "quelqu'un";
    }).replace(/<#([0-9]+)>/, (match, id) => {
        var channel = client.channels.cache.get(id);
        return channel?.name ? "#" + channel.name : "ce salon";
    }).replace(/<@&([0-9]+)>/, (match, id) => {
        var role = guild?.roles?.cache?.get(id);
        return role ? role.name : "ce rôle";
    }).replace(/<(:[a-zA-Z_]+:)([0-9]+)>/, (match, emoji, id) => {
        return emoji;
    });
}