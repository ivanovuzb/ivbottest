/* eslint-disable no-underscore-dangle,no-console,no-eval,no-await-in-loop,no-loop-func */
const Datastore = require('nedb-promise').datastore;
const TelegramBot = require('tgfancy');
const scheduler = require('node-schedule');
const pm2 = require('pm2');
const Koa = require('koa');
const Router = require('koa-router');
// const koaBody = require('koa-body');

const zalgo = require('to-zalgo');

const db = {
  users: Datastore({
    filename: 'NeDB/users.json',
    autoload: true,
  }),
  data: Datastore({
    filename: 'NeDB/data.json',
    autoload: true,
  }),
};

const token = "468440302:AAFkmZojF20B24nSd_DeqEseBxmm530qK7U";
const bot = new TelegramBot(token, { polling: true });

const testChatId = -1001384812689;
const ppChatId = -1001384812689;


async function init() {
  
  await bot.sendMessage(testChatId, 'Бот запущен!');
}





init()
  .catch((err) => {
    console.log(err);
  });


bot.onText(/\/promote(.*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    if (senderDoc && senderDoc.admin) {
      const atPos = match[0].search('@');
      if (atPos !== -1) {
        const username = match[0].slice(atPos + 1);
        const promoteDoc = await db.users.findOne({ username });
        if (promoteDoc) {
          await db.users.update({ username }, { $set: { admin: true } });
          await bot.sendMessage(chatId, `@${username} теперь админ `);
        } else {
          await bot.sendMessage(chatId, 'Пользователь не писал ничего в этот чат, не могу дать админку.');
        }
      } else if (msg.reply_to_message) {
        await db.users.update({ _id: msg.reply_to_message.from.id }, { $set: { admin: true } });
        await bot.sendMessage(chatId, `@${msg.reply_to_message.from.username} теперь админ `);
      }
    }
  }
});

bot.onText(/\/demote(.*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    if (senderDoc && senderDoc.admin) {
      const atPos = match[0].search('@');
      if (atPos !== -1) {
        const username = match[0].slice(atPos + 1);
        const demoteDoc = await db.users.findOne({ username });
        if (demoteDoc) {
          await db.users.update({ username }, { $set: { admin: false } });
          await bot.sendMessage(chatId, `@${username} больше не админ `);
        } else {
          await bot.sendMessage(chatId, 'Пользователь не писал ничего в этот чат, не могу дать админку.');
        }
      } else if (msg.reply_to_message) {
        await db.users.update({ _id: msg.reply_to_message.from.id }, { $set: { admin: false } });
        await bot.sendMessage(chatId, `@${msg.reply_to_message.from.username} больше не админ `);
      }
    }
  }
});




bot.onText(/\/del/, async (msg) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    if (senderDoc && senderDoc.admin && msg.reply_to_message) {
      await bot.deleteMessage(chatId, msg.message_id);
      await bot.deleteMessage(chatId, msg.reply_to_message.message_id);
    }
  }
});



bot.onText(/\/pin(.*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const senderDoc = await db.users.findOne({ _id: msg.from.id });
    if (senderDoc && senderDoc.admin && msg.reply_to_message) {
      const chatId = msg.chat.id;
      const replyMessageId = msg.reply_to_message.message_id;
      if (match[1] === ' silent') {
        await bot.pinChatMessage(chatId, replyMessageId, { disable_notification: true });
      } else {
        await bot.pinChatMessage(chatId, replyMessageId);
      }
      await bot.deleteMessage(chatId, msg.message_id);
    }
  }
});

bot.onText(/\/unpin/, async (msg) => {
  if (msg.chat.type !== 'channel') {
    const senderDoc = await db.users.findOne({ _id: msg.from.id });
    if (senderDoc && senderDoc.admin) {
      const chatId = msg.chat.id;
      await bot.unpinChatMessage(chatId);
      await bot.deleteMessage(chatId, msg.message_id);
    }
  }
});








bot.onText(/\/welcome ([^]*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    if (senderDoc && senderDoc.admin) {
      const firstWelcomeDoc = await db.data.findOne({ name: 'welcome' });
      if (firstWelcomeDoc) {
        await db.data.update({ name: 'welcome' }, { $set: { text: match[1] } });
      } else {
        await db.data.insert({
          name: 'welcome',
          text: match[1],
        });
      }
      await bot.sendMessage(chatId, 'Приветствие обновлено!');
    }
  }
});




bot.onText(/\/ping/, async (msg) => {
  if (msg.chat.type !== 'channel') {
    const senderDoc = await db.users.findOne({ _id: msg.from.id });
    if (senderDoc && senderDoc.admin) {
      const randomNum = Math.floor(Math.random() * 100) + 1;
      if (randomNum <= 20) {
        await bot.sendMessage(msg.chat.id, 'FATAL ERROR: PING IS ' + zalgo('CORRUPTED NaN NaN'));
      } else {
        await bot.sendMessage(msg.chat.id, zalgo('Pong!!!!'));
      }
    }
  }
});



bot.onText(/\/restart/, async (msg) => {
  if (msg.chat.type !== 'channel') {
    if (msg.from.id === 149136604) {
      await bot.sendMessage(testChatId, 'Перегружаюсь');
      pm2.restart('pptest', () => {
      });
    }
  }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  if (chatId !== ppChatId && chatId !== testChatId && msg.chat.type !== 'channel' && msg.chat.type !== 'private') {
    await bot.leaveChat(chatId);
  }
  const userId = msg.from.id;
  const senderDoc = await db.users.findOne({ _id: userId });
  if (!senderDoc) {
    await db.users.insert({
      _id: userId,
      username: msg.from.username,
      first_name: msg.from.first_name,
      ban: false,
      banDate: false,
      banChat: false,
      ugol: false,
      bet: false,
      betPoints: 0,
      betResult: false,
      admin: false,
    });
  } else if (senderDoc.ugol) {
    await bot.deleteMessage(chatId, msg.message_id);
    if (msg.reply_to_message) {
      await bot.sendMessage(chatId, `*@${msg.from.username} пробурчал из угла:* \`${msg.text}\``, { parse_mode: 'Markdown', reply_to_message_id: msg.reply_to_message.message_id });
    } else {
      await bot.sendMessage(chatId, `*@${msg.from.username} пробурчал из угла:* \`${msg.text}\``, { parse_mode: 'Markdown' });
    }
  } else if (senderDoc.username !== msg.from.username) {
    await db.users.update({ _id: msg.from.id }, { $set: { username: msg.from.username } });
  }
});

bot.on('new_chat_members', async (msg) => {
  if (msg.chat.type !== 'channel') {
    const chatId = msg.chat.id;
    const welcome = await db.data.findOne({ name: 'welcome' });
    await bot.sendMessage(chatId, welcome.text, {
      reply_markup: {
        inline_keyboard: [[{
          text: 'Прочти правила!',
          url: 'https://t.me/PiedModerBot?start=rules',
        }]],
      },
    });
  }
});


