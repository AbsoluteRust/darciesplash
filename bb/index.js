require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require("fs");
const path = require("path");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ⭐ Folder mapping for saving images
const COLLECTION_FOLDERS = {
  celestial: "celestial",
  darcie: "darcie",
  madolche: "madolche",
  tobi: "tobi",
  halo: "allComms",
};

// ⭐ Function to download + save image into correct folder
async function saveImageToCollection(attachment, collection) {
  const folder = COLLECTION_FOLDERS[collection];
  if (!folder) throw new Error(`Unknown collection folder: ${collection}`);

  const saveDir = path.join(process.cwd(), "..", "public", "artpieces", folder);
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  const ext = path.extname(attachment.name) || ".png";
  const base = path.basename(attachment.name, ext);
  const filename = `${base}-${Date.now()}${ext}`;
  const filePath = path.join(saveDir, filename);

  const response = await fetch(attachment.url);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(filePath, buffer);

  return `/artpieces/${folder}/${filename}`;
}

// ---------------- SLASH COMMAND SETUP ----------------

const postCommand = new SlashCommandBuilder()
  .setName('post')
  .setDescription('Post a new card to the website')
  .addStringOption(opt =>
    opt.setName('title').setDescription('Card title').setRequired(true)
  )
  .addStringOption(opt =>
    opt
      .setName('type')
      .setDescription('Card type')
      .setRequired(true)
      .addChoices(
        { name: 'Emote', value: 'emote' },
        { name: 'Splash Art', value: 'splash' },
        { name: 'Wallpaper', value: 'wallpaper' },
        { name: 'Sticker', value: 'sticker' }
      )
  )
  .addStringOption(opt =>
    opt
      .setName('collection')
      .setDescription('Which collection this belongs to')
      .setRequired(true)
      .addChoices(
        { name: 'Darcie', value: 'darcie' },
        { name: 'Tobi', value: 'tobi' },
        { name: 'Madolche', value: 'madolche' },
        { name: 'Celestial', value: 'celestial' },
        { name: 'Halo', value: 'halo' }
      )
  )
  .addStringOption(opt =>
    opt.setName('about').setDescription('About this art').setRequired(true)
  )
  .addAttachmentOption(opt =>
    opt.setName('image').setDescription('Upload the card image').setRequired(true)
  );

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(client.user.id, "1216033209930747904"),
    { body: [postCommand.toJSON()] }
  );

  console.log('Slash command /post registered');
});

// ---------------- COMMAND HANDLER ----------------

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'post') return;

  const allowedUsers = [
    "665898420447215647",
    "164429062238896129"
  ];

  if (!allowedUsers.includes(interaction.user.id)) {
    return interaction.reply({
      content: "You are not authorised to post cards.",
      ephemeral: true
    });
  }

  const title = interaction.options.getString('title');
  const type = interaction.options.getString('type');
  const about = interaction.options.getString('about');
  const image = interaction.options.getAttachment('image');
  const collection = interaction.options.getString('collection');

  await interaction.deferReply({ ephemeral: true });

  try {
    // ⭐ Save image to correct folder
    const imageUrl = await saveImageToCollection(image, collection);

    // ⭐ Send card data to your Next.js API
    const res = await fetch(process.env.SITE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BOT_API_SECRET}`
      },
      body: JSON.stringify({
        title,
        type,
        collection,
        about,
        imageUrl
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    await interaction.editReply(`<:lilyBoop:1412169790763700274> Card posted: **${title}** (${type})`);
  } catch (err) {
    console.error(err);
    await interaction.editReply('❌ Failed to post card to the website.');
  }
});

client.login(process.env.DISCORD_TOKEN);
