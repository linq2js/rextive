import { logic, signal } from "rextive";
import { authLogic } from "./authLogic";

export const loginLogic = logic("loginLogic", () => {
  const { login } = authLogic();
  const username = signal("emilys", { name: "loginModal.username" });
  const password = signal("emilyspass", { name: "loginModal.password" });

  return {
    username,
    password,
    login() {
      return login({
        username: username(),
        password: password(),
      });
    },
  };
});

