import { provider } from "rextive/react";
import { typingGameLogic } from "./typingGameLogic";

export const [useTypingGame, TypingGameProvider] = provider<
  ReturnType<typeof typingGameLogic>
>({
  name: "TypingGame",
  raw: true,
});

