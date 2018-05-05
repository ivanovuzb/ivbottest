/* eslint-disable no-underscore-dangle,no-console,no-eval,no-await-in-loop,no-loop-func */
const Datastore = require('nedb-promise').datastore;
const TelegramBot = require('tgfancy');
const scheduler = require('node-schedule');
const pm2 = require('pm2');
const Koa = require('koa');
const Router = require('koa-router');
// const koaBody = require('koa-body');
const IFTTTMaker = require('iftttmaker')('h9cjQR4SL3SEMaWad5zyETq3oAeN9l29iAsw3jDVDZ6');
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
const app = new Koa();
const router = new Router();
const banArr = [];
const testChatId = -1001384812689;
const ppChatId = -1001384812689;
const bettingStartRule = new scheduler.RecurrenceRule();
const bettingEndRule = new scheduler.RecurrenceRule();
bettingStartRule.hour = [9, 12, 15, 18, 21];
bettingStartRule.minute = 50;
bettingEndRule.hour = [9, 12, 15, 18, 21];
bettingEndRule.minute = 58;
let banCounter = 0;
let isBetting = false;

async function init() {
  const timedBanned = await db.users.find({
    banDate: {
      $ne: false,
    },
  });
  const ugolBanned = await db.users.find({ ugol: true });
  ugolBanned.forEach(async (ugolDoc) => {
    await db.users.update(
      { _id: ugolDoc._id },
      { $set: { ugol: false } },
    );
  });
  for (let i = 0; i < timedBanned.length; i += 1) {
    db.users.update(
      { username: timedBanned[i].username },
      { $set: { ban: banCounter, banDate: timedBanned[i].banDate } },
    );
    banArr[banCounter] = scheduler.scheduleJob(timedBanned[i].banDate, async () => {
      await bot.unbanChatMember(timedBanned[i].banChat, timedBanned[i]._id);
      await bot.sendMessage(timedBanned[i].banChat, `Бан для @${timedBanned[i].username} прошел`);
      await db.users.update(
        { username: timedBanned[i].username },
        { $set: { ban: false, banDate: false } },
      );
      console.log(`Scheduled unban for ${timedBanned[i].username}`);
    });
    banCounter += 1;
  }
  await bot.sendMessage(testChatId, 'Бот запущен!');
}

function declamaitionOfNum(number, titles) {
  const cases = [2, 0, 1, 1, 1, 2];
  return titles[(number % 100 > 4 && number % 100 < 20) ? 2 :
    cases[(number % 10 < 5) ? number % 10 : 5]];
}

function coinFlip() {
  return (Math.floor(Math.random() * 2) === 0);
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



bot.onText(/\/setux/, async (msg) => {
  if (msg.chat.type !== 'channel') {
    const chatId = msg.chat.id;
    if (msg.from.username === 'Setux' || msg.from.username === 'mnb3000') {
      if (coinFlip()) {
        await bot.sendMessage(chatId, '*@Setux переходит в ПП!*', { parse_mode: 'Markdown' });
      } else {
        await bot.sendMessage(chatId, '@Setux не переходит в ПП(');
      }
    } else {
      await bot.sendMessage(chatId, 'Ты не Сетух!');
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

bot.onText(/\/mute(.*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    let error = 0;
    if (senderDoc && senderDoc.admin) {
      const atPos = match[0].search('@');
      const timeMatch = match[0].match(/\/mute(?: )?(?:@.[^ ]*)?(?: )?(\d+h)?(?: )?(\d+m)?/);
      if (timeMatch[1] || timeMatch[2]) {
        let muteHour = 0;
        let muteMinute = 0;
        if (timeMatch[1]) {
          muteHour = parseInt(timeMatch[1].replace('h', ''), 10);
        }
        if (timeMatch[2]) {
          muteMinute = parseInt(timeMatch[2].replace('m', ''), 10);
        }
        if (atPos !== -1) {
          const username = match[0].match(/\/mute(?: )?(?:@)(.[^ ]*)/)[1];
          const muteDoc = await db.users.findOne({ username });
          if (muteDoc) {
            try {
              await bot.restrictChatMember(chatId, muteDoc._id, {
                until_date: Math.round((Date.now() + (muteHour * 3600000) +
                  (muteMinute * 60000)) / 1000),
                can_send_messages: false,
                can_send_media_messages: false,
                can_send_other_messages: false,
                can_add_web_page_previews: false,
              });
            } catch (err) {
              error = err.response.body.error_code;
            }
            if (!error) {
              await bot.sendMessage(chatId, `@${username} был заткнут на ${muteHour} ${declamaitionOfNum(muteHour, ['час', 'часа', 'часов'])} и ${muteMinute} ${declamaitionOfNum(muteMinute, ['минуту', 'минуты', 'минут'])}`);
            } else {
              await bot.sendMessage(chatId, 'Либо у меня нету прав администратора, либо вы пытаетесь заткнуть админа.');
            }
          } else {
            await bot.sendMessage(chatId, 'Пользователь не писал ничего в этот чат, не могу заткнуть.');
          }
        } else if (msg.reply_to_message) {
          try {
            await bot.restrictChatMember(chatId, msg.reply_to_message.from.id, {
              until_date: Math.round((Date.now() + (muteHour * 3600000) +
                (muteMinute * 60000)) / 1000),
              can_send_messages: false,
              can_send_media_messages: false,
              can_send_other_messages: false,
              can_add_web_page_previews: false,
            });
          } catch (err) {
            error = err.response.body.error_code;
          }
          if (!error) {
            await bot.sendMessage(chatId, `@${msg.reply_to_message.from.username} был заткнут на ${muteHour} ${declamaitionOfNum(muteHour, ['час', 'часа', 'часов'])} и ${muteMinute} ${declamaitionOfNum(muteMinute, ['минуту', 'минуты', 'минут'])}`);
          } else {
            await bot.sendMessage(chatId, 'Либо у меня нету прав администратора, либо вы пытаетесь заткнуть админа.');
          }
        }
      }
    }
  }
});

bot.onText(/\/unmute(.*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    let error = 0;
    if (senderDoc && senderDoc.admin) {
      const atPos = match[0].search('@');
      if (atPos !== -1) {
        const username = match[0].slice(atPos + 1);
        const unmuteDoc = await db.users.findOne({ username });
        if (unmuteDoc) {
          try {
            await bot.restrictChatMember(chatId, unmuteDoc._id, {
              until_date: Math.round((Date.now() / 1000) + 5),
              can_send_messages: true,
              can_send_media_messages: true,
              can_send_other_messages: true,
              can_add_web_page_previews: true,
            });
          } catch (err) {
            error = err.response.body.error_code;
          }
          if (!error) {
            await bot.sendMessage(chatId, `@${username} может говорить `);
          } else {
            await bot.sendMessage(chatId, 'Либо у меня нету прав администратора, либо вы пытаетесь РАЗМУТИТЬ админа. (вы чо, тупые?)');
          }
        } else {
          await bot.sendMessage(chatId, 'Пользователь ничего не писал в чат');
        }
      } else if (msg.reply_to_message) {
        try {
          await bot.restrictChatMember(chatId, msg.reply_to_message.from.id, {
            until_date: Math.round((Date.now() / 1000) + 5),
            can_send_messages: true,
            can_send_media_messages: true,
            can_send_other_messages: true,
            can_add_web_page_previews: true,
          });
        } catch (err) {
          error = err.response.body.error_code;
        }
        if (!error) {
          await bot.sendMessage(chatId, `@${msg.reply_to_message.from.username} может говорить `);
        } else {
          await bot.sendMessage(chatId, 'Либо у меня нету прав администратора, либо вы пытаетесь РАЗМУТИТЬ админа. (вы чо, тупые?)');
        }
      }
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

bot.onText(/\/rules ([^]*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    if (senderDoc && senderDoc.admin) {
      const firstRulesDoc = await db.data.findOne({ name: 'rules' });
      if (firstRulesDoc) {
        await db.data.update({ name: 'rules' }, { $set: { text: match[1] } });
      } else {
        await db.data.insert({
          name: 'rules',
          text: match[1],
        });
      }
      await bot.sendMessage(chatId, 'Правила обновлены!');
    }
  }
});

bot.onText(/\/startLs ([^]*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    const senderDoc = await db.users.findOne({ _id: userId });
    if (senderDoc && senderDoc.admin) {
      const firstStartLsDoc = await db.data.findOne({ name: 'startLs' });
      if (firstStartLsDoc) {
        await db.data.update({ name: 'startLs' }, { $set: { text: match[1] } });
      } else {
        await db.data.insert({
          name: 'startLs',
          text: match[1],
        });
      }
      await bot.sendMessage(chatId, 'Старт в личке обновлен!');
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
        await bot.sendMessage(msg.chat.id, 'Pong!');
      }
    }
  }
});

bot.onText(/\/start(.*)/, async (msg, match) => {
  if (msg.chat.type !== 'channel') {
    if (match[1] === ' rules') {
      const chatId = msg.chat.id;
      const rules = await db.data.findOne({ name: 'rules' });
      await bot.sendMessage(chatId, rules.text);
    } else if (msg.chat.id === msg.from.id) {
      const chatId = msg.chat.id;
      const rules = await db.data.findOne({ name: 'startLs' });
      await bot.sendMessage(chatId, rules.text);
    }
  }
});

bot.onText(/\/restart/, async (msg) => {
  if (msg.chat.type !== 'channel') {
    if (msg.from.id === 149136604) {
      await bot.sendMessage(testChatId, 'Перегружаюсь');
      pm2.restart('app', () => {
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

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3001);
