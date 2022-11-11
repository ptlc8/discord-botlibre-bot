const Discord = require("discord.js");
const fetch = require("node-fetch");
const fs = require("fs");
require("dotenv").config();

this.client = new Discord.Client({
    intents:
        [
            Discord.GatewayIntentBits.DirectMessages,
            Discord.GatewayIntentBits.MessageContent
        ],
    partials: [
        Discord.Partials.Channel
    ]
});

this.client.on("ready", () => {
    console.info(`Logged in Discord as ${this.client.user.tag}`);
});

this.client.on("messageCreate", async message => {
    if (message.author.id == this.client.user.id)
        return;
    if (message.channel.type != Discord.ChannelType.DM)
        return;
    var response = await getResponse(message.content, message.author.id);
    if (response)
        message.channel.send(response);
});

this.client.login(process.env.DISCORD_TOKEN);

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
 * Save object to json file
 * @param {string} filename
 * @param {any} object
 */
function saveToFile(filename, object) {
    fs.writeFileSync(filename, JSON.stringify(object));
}

/**
 * Load object from json file
 * @param {string} filename
 * @param {any} defolt if not found
 * @returns {any}
 * @see {@link saveToFile}
 */
function loadFromFile(filename, defolt) {
    if (!fs.existsSync(filename)) return defolt;
    return JSON.parse(fs.readFileSync(filename));
}