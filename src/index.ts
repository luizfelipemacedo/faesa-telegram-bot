import TelegramBot from "node-telegram-bot-api";
import { Prisma, PrismaClient } from '@prisma/client';

const botToken = process.env.BOT_TOKEN as string;
const bot = new TelegramBot(botToken, { polling: true });
const prisma = new PrismaClient();

console.info("Bot is running...");

const botCommands = [
  { command: '/start', description: 'Iniciar o bot' }
];

bot.setMyCommands(botCommands);

bot.onText(/\/start/, (message) => main(message));

async function main(message: TelegramBot.Message) {
  const isOutOfService = isBusinessOutOfService();

  if (!isOutOfService) {
    const botMessage = "Acesse o site da Faesa para mais informações: https://www.faesa.br/"
    return bot.sendMessage(message.chat.id, botMessage);
  }

  const botMessage = "Atendemos das 09:00 às 18:00. Informe seu e-mail para contato.";
  bot.sendMessage(message.chat.id, botMessage);

  return bot.onText(/(.+)/, async (message) => await saveEmail(message));
}

function isBusinessOutOfService() {
  const [actualISOString] = new Date().toISOString().split('T');

  const actualLocaleTimeString = new Date().toLocaleTimeString('pt-BR');
  const actualDate = new Date(`${actualISOString}T${actualLocaleTimeString}`);

  const beginOfTheDay = new Date(`${actualISOString}T09:00:00`);
  const endOfTheDay = new Date(`${actualISOString}T18:00:00`);

  return actualDate < beginOfTheDay || actualDate > endOfTheDay;
}

async function saveEmail(message: TelegramBot.Message) {
  const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
  const email = message.text ?? '';

  if (!emailRegex.test(email)) {
    return bot.sendMessage(message.chat.id, "Por favor, informe um e-mail válido.");
  }

  try {
    const dataToInsert = { data: { email } };
    await prisma.email.create(dataToInsert);

    const botMessage = `Recebemos sua mensagem. Entraremos em contato no e-mail ${email} assim que possível.`;
    return bot.sendMessage(message.chat.id, botMessage);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return bot.sendMessage(message.chat.id, "Este e-mail já foi cadastrado.");
    }
    return bot.sendMessage(message.chat.id, "Ocorreu um erro ao tentar cadastrar o e-mail.");
  }
}