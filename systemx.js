const TelegramBot = require('node-telegram-bot-api');
const admin = require('firebase-admin');

// এনভায়রনমেন্ট ভেরিয়েবল থেকে টোকেন ও ডাটাবেজ ইউআরএল লোড করা (Render-এর জন্য সুরক্ষিত)
const token = process.env.TELEGRAM_BOT_TOKEN;
const dbUrl = process.env.FIREBASE_DATABASE_URL;

// ফায়ারবেস ইনিশিয়ালাইজেশন (Render-এর Environment Variables বা Service Account দিয়ে)
// যদি Render-এ JSON ফাইল সরাসরি ব্যবহার না করতে চান, তবে সরাসরি URL দিয়ে ডাটাবেজ কানেক্ট করা যায়:
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // অথবা সার্ভিস অ্যাকাউন্ট কনফিগারেশন
  databaseURL: dbUrl
});

const db = admin.database();
const bot = new TelegramBot(token, { polling: true });

// অনুমোদিত এডমিনের টেলিগ্রাম আইডি (নিরাপত্তার জন্য আপনার টেলিগ্রাম ID এখানে দিতে পারেন)
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; 

// ১. /start কমান্ড
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "স্বাগতম! এটি আপনার কমান্ড সেন্টার। নিচের কমান্ডগুলো ব্যবহার করতে পারেন:\n\n" +
                          "/help - সাহায্য ও কমান্ড লিস্ট দেখুন\n" +
                          "/status - ডিভাইস স্ট্যাটাস চেক করুন\n" +
                          "/hello - অ্যাপে হ্যালো মেসেজ পাঠান\n" +
                          "/custom <command> - যেকোনো কাস্টম কমান্ড পাঠান");
});

// ২. /help কমান্ড
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📋 **উপলব্ধ কমান্ড তালিকা:**\n\n" +
                          "• /status - ডিভাইসের বর্তমান অবস্থা জানতে\n" +
                          "• /hello - অ্যাপে টেস্ট মেসেজ পাঠাতে\n" +
                          "• সরাসরি যেকোনো টেক্সট লিখলে তা সরাসরি ইউজার অ্যাপে কমান্ড হিসেবে চলে যাবে।");
});

// ৩. /status কমান্ড
bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  sendCommandToFirebase("get_status", chatId);
});

// ৪. /hello কমান্ড
bot.onText(/\/hello/, (msg) => {
  const chatId = msg.chat.id;
  sendCommandToFirebase("hello", chatId);
});

// ৫. সাধারণ টেক্সট বা যেকোনো কাস্টম কমান্ড হ্যান্ডেল করার জন্য
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // স্লাশযুক্ত কমান্ডগুলো উপরে হ্যান্ডেল হয়েছে, তাই বাদ দিচ্ছি
  if (!text || text.startsWith('/')) return;

  // সিকিউরিটি চেক (অপশনাল): শুধুমাত্র আপনি চাইলে কমান্ড পাঠাতে পারবেন
  // if (chatId.toString() !== ADMIN_CHAT_ID) {
  //   return bot.sendMessage(chatId, "আপনার এই বট ব্যবহারের অনুমতি নেই।");
  // }

  // সরাসরি টেক্সট ফায়ারবেসে পাঠিয়ে দেওয়া
  sendCommandToFirebase(text, chatId);
});

// ফায়ারবেসে কমান্ড পাঠানোর ফাংশন
function sendCommandToFirebase(commandText, chatId) {
  db.ref('commands').set({
    command: commandText,
    timestamp: Date.now()
  })
  .then(() => {
    bot.sendMessage(chatId, `✅ সফলভাবে কমান্ড পাঠানো হয়েছে: *${commandText}*`, { parse_mode: "Markdown" });
  })
  .catch((error) => {
    bot.sendMessage(chatId, `❌ কমান্ড পাঠাতে সমস্যা হয়েছে: ${error.message}`);
  });
}

console.log("Telegram Bot is running...");
