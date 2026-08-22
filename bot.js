const { Telegraf, Markup } = require('telegraf');

const bot = new Telegraf('8791729528:AAHcXhuGUIwPlkgcfLKGSpbQIrRwrBeqphU');

let giveaway = {
    active: false,
    prize: '',
    channel: '',
    winnersCount: 1,
    participants: new Set()
};

const GIVEAWAY_GIF = 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif';
const WINNER_GIF = 'https://media.giphy.com/media/l0HlRnAWXxn0MhOBK/giphy.gif';

bot.command('help', (ctx) => {
    ctx.reply(
        `🤖 **ԲՈՏԻ ՀՐԱՄԱՆՆԵՐԻ ՈՒՂԵՑՈՒՅՑ** 🤖\n\n` +
        `🔹 **/create [Մրցանակ] [Քանակ] [@ալիք]**\n` +
        `Ստեղծում և հրապարակում է նոր խաղարկություն:\n` +
        `*Օրինակ՝* \`/create Telegram Premium 1 @my_channel\`\n\n` +
        `🔹 **/participants**\n` +
        `(Միայն ադմինների համար) Ուղարկում է մասնակիցների ցանկը ձեզ անձնական հաղորդագրությամբ (DM):\n\n` +
        `🔹 **/endgiveaway**\n` +
        `Ավարտում է խաղարկությունը, պատահականության սկզբունքով ընտրում հաղթողներին և հրապարակում արդյունքները խմբում:`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('create', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 3) {
        return ctx.reply('⚠️ **Սխալ հրաման:** Օգտագործիր այսպես՝\n`/create [Մրցանակ] [Քանակ] [@ալիք]`\n\n*Օրինակ՝* `/create Telegram Premium 1 @my_channel`', { parse_mode: 'Markdown' });
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
            `📢 **Պայման՝** բաժանորդագրվել ${giveaway.channel} ալիքին\n` +
            `👥 **Հաղթողների քանակ՝** ${giveaway.winnersCount}\n\n` +
            `👇 *Մասնակցելու համար սեղմիր ներքևի կոճակը:*`,
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🎁 Մասնակցել', 'join_giveaway')],
            [Markup.button.callback('🔍 Ստուգել մասնակցությունը', 'check_status')]
        ])
    });
});

bot.action('join_giveaway', async (ctx) => {
    if (!giveaway.active) {
        return ctx.answerCbQuery('❌ Այս պահին ակտիվ խաղարկություն չկա:', { show_alert: true });
    }

    const userId = ctx.from.id;
    const displayName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;

    try {
        const chatMember = await bot.telegram.getChatMember(giveaway.channel, userId);
        const isMember = ['member', 'administrator', 'creator'].includes(chatMember.status);

        if (!isMember) {
            return ctx.answerCbQuery(`❌ Խաղարկությանը մասնակցելու համար պարտադիր պետք է բաժանորդագրվես ${giveaway.channel} ալիքին:`, { show_alert: true });
        }

        giveaway.participants.add(JSON.stringify({ id: userId, name: displayName }));
        ctx.answerCbQuery('✅ Շնորհավորում եմ, դու հաջողությամբ միացար խաղարկությանը!');

    } catch (error) {
        console.error(error);
        ctx.answerCbQuery('⚠️ Տեղի ունեցավ սխալ: Համոզվիր, որ բոտն ալիքի ադմինիստրատոր է:', { show_alert: true });
    }
});

bot.action('check_status', (ctx) => {
    if (!giveaway.active) {
        return ctx.answerCbQuery('❌ Այս պահին ակտիվ խաղարկություն չկա:', { show_alert: true });
    }

    const userId = ctx.from.id;
    const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));
    const isJoined = participantsArr.some(p => p.id === userId);

    if (isJoined) {
        ctx.answerCbQuery('✅ Այո, դու արդեն մասնակցում ես խաղարկությանը:', { show_alert: true });
    } else {
        ctx.answerCbQuery('❌ Դու դեռ չես մասնակցում (կամ չես բաժանորդագրվել ալիքին):', { show_alert: true });
    }
});

bot.command('participants', async (ctx) => {
    try {
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        
        const memberInfo = await ctx.telegram.getChatMember(chatId, userId);
        const isAdmin = ['administrator', 'creator'].includes(memberInfo.status);

        if (!isAdmin) {
            return ctx.reply('❌ Այս հրամանը նախատեսված է միայն ադմինիստրատորների համար:');
        }

        if (!giveaway.active) {
            return ctx.reply('❌ Այս պահին ակտիվ խաղարկություն չկա:');
        }

        const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));

        if (participantsArr.length === 0) {
            return ctx.reply('📋 Խաղարկությանը դեռևս մասնակիցներ չկան:');
        }

        let list = participantsArr.map((p, index) => `${index + 1}. ${p.name}`).join('\n');

        await bot.telegram.sendMessage(
            userId,
            `📋 **ՄԱՍՆԱԿԻՑՆԵՐԻ ՑԱՆԿ**\n\n` +
            `👥 **Ընդհանուր քանակը՝** ${participantsArr.length}\n\n` +
            `${list}`,
            { parse_mode: 'Markdown' }
        );

        if (ctx.chat.type !== 'private') {
            await ctx.reply('✅ Մասնակիցների ցանկը ուղարկվեց քեզ անձնական հաղորդագրությամբ (DM):');
        }
    } catch (error) {
        console.error(error);
        ctx.reply('⚠️ Սխալ տեղի ունեցավ: Համոզվիր, որ գոնե մեկ անգամ գրել ես բոտին անձնական չաթում, որպեսզի կարողանա հաղորդագրություն ուղարկել:');
    }
});

bot.command('endgiveaway', async (ctx) => {
    if (!giveaway.active) {
        return ctx.reply('❌ Ակտիվ խաղարկություն չկա:');
    }

    const participantsArr = Array.from(giveaway.participants).map(p => JSON.parse(p));

    if (participantsArr.length === 0) {
        giveaway.active = false;
        return ctx.reply('😔 Խաղարկությանը ոչ ոք չի մասնակցել:');
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
        caption: 
            `🏁 **ԽԱՂԱՐԿՈՒԹՅՈՒՆՆ ԱՎԱՐՏՎԵՑ** 🏁\n\n` +
            `🎁 **Մրցանակ՝** ${giveaway.prize}\n\n` +
            `✨ **Հաղթողներն են՝**\n${winnersList}\n\n` +
            `🎉 *Շնորհավորում ենք հաղթողներին:*`,
        parse_mode: 'Markdown'
    });
});

bot.launch();
console.log('Բոտը հաջողությամբ միացավ...');