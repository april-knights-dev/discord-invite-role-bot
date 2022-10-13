const config = require("./config.json");
const fs = require("fs");
const { Client, GatewayIntentBits, AttachmentBuilder } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
  ],
});
// Initialize the invite cache
const guildInvites = new Map();

// A pretty useful method to create a delay without blocking the whole script.
const wait = require("util").promisify(setTimeout);
client.on("ready", async () => {
  // "ready" isn't really ready. We need to wait a spell.
  await wait(1000);
  console.log(`Logged in as ${client.user.tag}!`);
  await client.guilds.fetch();
  try {
    client.guilds.cache.forEach(async (guild) => {
      await guild.invites.fetch();
      const invites = guild.invites;
      console.log(`guild: ${guild.name}`);
      console.log(`INVITES CACHED: ${invites.cache.size}`);
      const codeUses = new Map();
      invites.cache.map((inv) => codeUses.set(inv.code, inv.uses));
      guildInvites.set(guild.id, codeUses);
    });
  } catch (err) {
    console.log("OnReady Error:", err);
  }
});

client.on("guildMemberAdd", async (member) => {
  // To compare, we need to load the current invite list.
  const newInvites = await member.guild.invites.fetch();
  // This is the *existing* invites for the guild.
  const cachedInvites = guildInvites.get(member.guild.id);

  // Look through the invites, find the one for which the uses went up.
  const usedInvite = newInvites.find((i) => cachedInvites.get(i.code) < i.uses);
  newInvites.each((inv) => cachedInvites.set(inv.code, inv.uses));
  guildInvites.set(member.guild.id, cachedInvites);
  if (usedInvite !== null) {
    addRole(member, usedInvite);
  }
});

const prefix = "~";
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;
  if (!message.member.permissions.has("ADMINISTRATOR")) return;

  const commandBody = message.content.slice(prefix.length);
  const args = commandBody.split(" ");
  const command = args.shift().toLowerCase();

  switch (command) {
    case "create":
      await create(message, args);
      break;
    case "add":
      await add(message, args);
      break;
    case "remove":
      await remove(message, args);
      break;
    case "list":
      list(message);
      break;
    default:
      message.reply(`command doesn't exist`);
  }

  if (command === "ping") {
    const timeTaken = Date.now() - message.createdTimestamp;
    message.reply(`Pong! This message had a latency of ${timeTaken}ms.`);
  }
});

async function addRole(member, invite) {
  let rawdata = fs.readFileSync("invites.json");
  let _invites = JSON.parse(rawdata);

  try {
    const { roleID } = _invites[invite.code];
    if (roleID) {
      const role = await member.guild.roles.fetch(roleID);
      member.roles.add(role);
    }
  } catch (err) {
    console.log(err);
  }
}

function list(message) {
  const attachment = new AttachmentBuilder("invites.json", "invites.json");
  message.reply({ content: "現在のリストです。", files: [attachment] });
}

async function add(message, args) {
  let rawdata = fs.readFileSync("invites.json");
  let _invites = JSON.parse(rawdata);

  if (args.length !== 2) {
    message.reply(`not enough arguments`);
    return;
  }
  const base = "https://discord.gg/";
  if (args[0].substring(0, base.length) !== base) {
    message.reply(`missing link starting with \`${base}\``);
    return;
  }
  const inviteCode = args[0].substring(base.length);
  const roleprefix = "<@&";
  if (args[1].substring(0, roleprefix.length) !== roleprefix) {
    message.reply(`invalid role`);
    return;
  }
  const roleID = args[1].substr(
    roleprefix.length,
    args[1].length - roleprefix.length - 1
  );
  const role = await message.guild.roles.fetch(roleID);

  if (typeof role === undefined) {
    message.reply(`invalid role`);
    return;
  }

  _invites[inviteCode] = { roleID, name: role.name };

  let data = JSON.stringify(_invites, null, 2);
  fs.writeFileSync("invites.json", data);
  message.reply(
    `role @${role.name} added to invite link \`${base + inviteCode}\``
  );
}

/**
 * 割当ロールを引数に、招待リンクの作成も一緒にやる
 * @param {*} message
 * @param {*} args
 * @returns
 */
async function create(message, args) {
  let rawdata = fs.readFileSync("invites.json");
  let _invites = JSON.parse(rawdata);

  if (args.length !== 1) {
    message.reply(`not enough arguments`);
    return;
  }

  // 招待リンクの作成
  const guild = message.guild;
  const channels = await guild.channels.fetch();
  const welcome_channel = channels.find((c) => c.name === "はじめに");

  // 作成したリンクを使ってaddと同じことをやる
  const roleprefix = "<@&";
  if (args[0].substring(0, roleprefix.length) !== roleprefix) {
    message.reply(`invalid role`);
    return;
  }
  const roleID = args[0].substr(
    roleprefix.length,
    args[0].length - roleprefix.length - 1
  );
  const role = await guild.roles.fetch(roleID);

  if (typeof role === undefined) {
    message.reply(`invalid role`);
    return;
  }

  const invite = await welcome_channel.createInvite({
    maxAge: 0,
    unique: true,
    reason: role.name,
  });
  const inviteCode = invite.code;
  _invites[inviteCode] = { roleID, name: role.name };

  let data = JSON.stringify(_invites, null, 2);
  fs.writeFileSync("invites.json", data);
  message.reply(
    `role @${role.name} を付与する招待リンクを作成しました。\n${invite.url}`
  );
}
client.login(config.BOT_TOKEN);
