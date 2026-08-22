const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8791729528:AAHcXhuGUIwPlkgcfLKGSpbQIrRwrBeqphU');

let giveaway = {
    active: false,
    prize: '',
    channel: '',
    winnersCount: 1,
    participants: new Set()
};

const GIVEAWAY_GIF = 'https://media2.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif';
const ROULETTE_GIF = 'https://media3.giphy.com/media/3o7TKSjRrfIPjeiByM/giphy.gif';
const WINNER_GIF = 'https://media4.giphy.com/media/l0HlRnAWXxn0MhOBK/giphy.gif';

async function checkAdmin(ctx) {
    if (ctx.chat.type === 'private') return true;
    try {
        const member = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
        return ['administrator', 'creator'].includes(member.status);
    } catch (e) {
        return false;
    }
}

bot.command('help', async (ctx) => {
    const isAdmin = await checkAdmin(ctx);
    if (!isAdmin) {
        return ctx.reply('❌ Այս հրամանը նախատեսված է միայն ադմինների համար:');
    }

    ctx.reply(
        `🤖 **ԱԴՄԻՆԻ ՀՐԱՄԱՆՆԵՐ** 🤖\n\n` +
        `🔹 /create - Ստեղծել խաղարկություն\n` +
        `🔹 /participants - Մասնակիցների ցանկ\n` +
        `🔹 /endgiveaway - Ավարտել սովորական ձևով\n` +
        `🔹 /roulette - Ավարտել ռուլետկայով`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('create', async (ctx) => {
    if (!(await checkAdmin(ctx))) {
        return ctx.reply('❌ Միայն ադմինների համար:');
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3) {
        return ctx.reply('⚠️ Օգտագործիր՝ /create [Մրցանակ] [Քանակ] [@ալիք]');
    }

    const winnersCount = parseInt(args[args.length - 2]);
    const channel = args[args.length - 1];
    const prizeText = args.slice(0, args.length - 2).join(' ');

    giveaway = {
        active: true,
        prize: prizeText,
        channel: channel,
        winnersCount: isNaN(winnersCount) ? 1 : winnersCount,
        participants: new Set()
    };

    await ctx.replyWithAnimation(GIVEAWAY_GIF, {
        caption: 
            `🎉 **ՆՈՐ ԽԱՂԱՐԿՈՒԹՅՈՒՆ** 🎉\n\n` +
            `🎁 **Մրցանակ՝** ${giveaway.prize}\n` +
            `📢 **Պայման՝** բաժանորդագրվել ${giveaway.channel}\n` +
            `👥 **Հաղթողներ՝** ${giveaway.winnersCount}\n\n` +
            `👇 Սեղմիր մասնակցելու համար:`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎁 Մասնակցել', 'join_giveaway')],
            [Markup.button.callback('🔍 Ստուգել', 'check_status')]
        ])
    });
});

bot.action('join_giveaway', async (ctx) => {
    if (!giveaway.active) {
        return ctx.answerCbQuery('❌ Ակտիվ խաղարկություն չկա:', { show_alert: true });
    }

    const userId = ctx.from.id;
    const username = ctx.from.username;

    if (!username) {
        return ctx.answerCbQuery('❌ Պարտադիր է ունենալ Telegram Username (@)!', { show_alert: true });
    }

    const displayName = `@${username}`;

    try {
        const chatMember = await bot.telegram.getChatMember(giveaway.channel, userId);
        const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status);

        if (!isMember) {
            return ctx.answerCbQuery(`❌ Պետք է բաժանորդագրվես ${giveaway.channel} ալիքին:`, { show_alert: true });
        }

        giveaway.participants.add(JSON.stringify({ id: userId, name: displayName }));
        ctx.answerCbQuery('✅ Դու հաջողությամբ միացար խաղարկությանը!');
    } catch (error) {
        ctx.answerCbQuery('⚠️ Սխալ: Համոզվիր, որ բոտն ալիքի ադմին է:', { show_alert: true });
    }
});

bot.action('check_status', (ctx) => {
    if (!giveaway.active) {
        return ctx.answerCbQuery('❌ Ակտիվ խաղարկություն չկա:', { show_alert: true });
    }

    const userId = ctx.from.id;
    const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));
    const isJoined = participantsArr.some(p => p.id === userId);

    if (isJoined) {
        ctx.answerCbQuery('✅ Այո, դու մասնակցում ես:', { show_alert: true });
    } else {
        ctx.answerCbQuery('❌ Դու դեռ չես մասնակցում:', { show_alert: true });
    }
});

bot.command('participants', async (ctx) => {
    if (!(await checkAdmin(ctx))) {
        return ctx.reply('❌ Միայն ադմինների համար:');
    }

    if (!giveaway.active) {
        return ctx.reply('❌ Ակտիվ խաղարկություն չկա:');
    }

    const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));
    if (participantsArr.length === 0) {
        return ctx.reply('📋 Մասնակիցներ չկան:');
    }

    let list = participantsArr.map((p, index) => `${index + 1}. ${p.name}`).join('\n');
    await bot.telegram.sendMessage(ctx.from.id, `📋 **ՄԱՍՆԱԿԻՑՆԵՐ**\n\n${list}`, { parse_mode: 'Markdown' });
    if (ctx.chat.type !== 'private') {
        ctx.reply('✅ Մասնակիցների ցանկն ուղարկվեց անձնական չաթ (DM):');
    }
});

bot.command('endgiveaway', async (ctx) => {
    if (!(await checkAdmin(ctx))) {
        return ctx.reply('❌ Միայն ադմինների համար:');
    }

    if (!giveaway.active) {
        return ctx.reply('❌ Ակտիվ խաղարկություն չկա:');
    }

    const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));
    if (participantsArr.length === 0) {
        giveaway.active = false;
        return ctx.reply('😔 Մասնակիցներ չկան:');
    }

    const winners = [];
    const count = Math.min(giveaway.winnersCount, participantsArr.length);
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * participantsArr.length);
        winners.push(participantsArr.splice(randomIndex, 1)[0]);
    }

    giveaway.active = false;
    let winnersList = winners.map((w, index) => `🏆 ${index + 1}. ${w.name}`).join('\n');

    await ctx.replyWithAnimation(WINNER_GIF, {
        caption: `🏁 **ԱՎԱՐՏՎԵՑ** 🏁\n\n🎁 **Մրցանակ՝** ${giveaway.prize}\n\n✨ **Հաղթողներ՝**\n${winnersList}`,
        parse_mode: 'Markdown'
    });
});

bot.command('roulette', async (ctx) => {
    if (!(await checkAdmin(ctx))) {
        return ctx.reply('❌ Միայն ադմինների համար:');
    }

    if (!giveaway.active) {
        return ctx.reply('❌ Ակտիվ խաղարկություն չկա:');
    }

    const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));
    if (participantsArr.length === 0) {
        giveaway.active = false;
        return ctx.reply('😔 Մասնակիցներ չկան:');
    }

    await ctx.replyWithAnimation(ROULETTE_GIF, {
        caption: `🎡 **Ռուլետկան պտտվում է...**`,
        parse_mode: 'Markdown'
    });

    await new Promise(resolve => setTimeout(resolve, 4000));

    const winners = [];
    const count = Math.min(giveaway.winnersCount, participantsArr.length);
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * participantsArr.length);
        winners.push(participantsArr.splice(randomIndex, 1)[0]);
    }

    giveaway.active = false;
    let winnersList = winners.map((w, index) => `🏆 ${index + 1}. ${w.name}`).join('\n');

    await ctx.replyWithAnimation(WINNER_GIF, {
        caption: `🏁 **ՌՈՒԼԵՏԿԱՅԻ ԱՐԴՅՈՒՆՔ** 🏁\n\n🎁 **Մրցանակ՝** ${giveaway.prize}\n\n✨ **Հաղթողներ՝**\n${winnersList}`,
        parse_mode: 'Markdown'
    });
});

bot.launch();
