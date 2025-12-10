import { provider } from "rextive/react";
import { typingGameLogic } from "./typingGame.logic";

export const [useTypingGame, TypingGameProvider] = provider<
  ReturnType<typeof typingGameLogic>
>({
  name: "TypingGame",
  raw: true,
});

