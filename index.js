require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.BOT_TOKEN);
const hfToken = process.env.HF_ACCESS_TOKEN;

bot.start((ctx) => {
    ctx.reply('Assalomu alaykum! Men rasmlarni sifatini yaxshilash va rang berish botiman (Hugging Face Free).\n\nMenga rasm yuboring, men uni qayta ishlayman.');
});

const userState = {};

bot.on('photo', (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const fileId = photo.file_id;
    userState[ctx.from.id] = { fileId };

    ctx.reply('Rasm qabul qilindi. Nima qilmoqchisiz?', Markup.inlineKeyboard([
        [Markup.button.callback('🔍 Sifatni yaxshilash (Upscale)', 'upscale')],
        [Markup.button.callback('🎨 Ranglash (Colorize)', 'colorize')]
    ]));
});

// Helper to call Hugging Face Inference API
async function callHuggingFace(modelId, imageBuffer) {
    const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelId}`,
        imageBuffer,
        {
            headers: {
                Authorization: `Bearer ${hfToken}`,
                'Content-Type': 'application/octet-stream',
            },
            responseType: 'arraybuffer',
            timeout: 60000 // 60s timeout for model inference
        }
    );
    return response.data;
}

bot.action('upscale', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;

    if (!userState[userId] || !userState[userId].fileId) {
        return ctx.reply('Iltimos, avval rasm yuboring.');
    }

    try {
        ctx.reply('Rasm tiniqlashtirilmoqda... (Hugging Face)\nBu biroz vaqt olishi mumkin.');
        const fileLink = await ctx.telegram.getFileLink(userState[userId].fileId);

        // Download image as buffer with increased timeout
        const imageResponse = await axios.get(fileLink.href, {
            responseType: 'arraybuffer',
            timeout: 30000 // 30s timeout for download
        });
        const imageBuffer = imageResponse.data;

        // Active Upscaling Model as of Dec 2024
        // Alternative: 'gemasai/4x_NMKD-Siax_200k' or 'bgs/Real-ESRGAN-x4-plus'
        const resultBuffer = await callHuggingFace('gemasai/4x_NMKD-Siax_200k', imageBuffer);

        await ctx.replyWithPhoto({ source: resultBuffer }, { caption: 'Mana natija! (Upscaled)' });
    } catch (error) {
        console.error('Upscale Error:', error.response?.data || error.message);
        const msg = error.message;
        ctx.reply('Xatolik yuz berdi: ' + msg + '\n\n(Agar "ETIMEDOUT" bo\'lsa, internetizni tekshiring)');
    }
});

bot.action('colorize', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;

    if (!userState[userId] || !userState[userId].fileId) {
        return ctx.reply('Iltimos, avval rasm yuboring.');
    }

    try {
        ctx.reply('Rasm ranglanmoqda... (Hugging Face)');
        const fileLink = await ctx.telegram.getFileLink(userState[userId].fileId);

        const imageResponse = await axios.get(fileLink.href, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        const imageBuffer = imageResponse.data;

        // Active Colorization Model
        const resultBuffer = await callHuggingFace('Hammad712/GAN-Colorization-Model', imageBuffer);

        await ctx.replyWithPhoto({ source: resultBuffer }, { caption: 'Mana natija! (Colorized)' });
    } catch (error) {
        console.error('Colorize Error:', error.response?.data || error.message);
        const msg = error.message;
        ctx.reply('Xatolik yuz berdi: ' + msg);
    }
});

bot.use((ctx, next) => {
    console.log('Update received:', ctx.updateType);
    return next();
});

bot.launch().then(() => {
    console.log('----------------------------------------');
    console.log('Bot muvaffaqiyatli ishga tushdi!');
    console.log('Telegram serveriga ulandi.');
    console.log('----------------------------------------');
}).catch((err) => {
    console.error('----------------------------------------');
    console.error('ISHGA TUSHISHDA XATOLIK:', err.message);
    if (err.message.includes('ETIMEDOUT')) {
        console.error('SABABI: Internet yoki VPN muammosi.');
    }
    console.error('----------------------------------------');
});

process.once('SIGINT', () => {
    console.log('Bot to\'xtatilmoqda...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('Bot to\'xtatilmoqda...');
    bot.stop('SIGTERM');
});
