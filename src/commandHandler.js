import {
  handleStart
} from "./commands/start.js";

import {
  handleSaldo
} from "./commands/saldo.js";

export async function handleCommand(
  text,
  chatId,
  env
) {

  if (await handleStart(
    text,
    chatId,
    env
  )) {
    return true;
  }

  if (await handleSaldo(
    text,
    chatId,
    env
  )) {
    return true;
  }

  return false;

}