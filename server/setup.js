/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
const fs = require("fs");
const readline = require("readline");
const { execSync } = require("child_process");
const crypto = require("crypto");

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

const emojis = {
  success: "✅",
  warning: "⚠️",
  info: "ℹ️",
  error: "❌",
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) =>
  new Promise((resolve) => rl.question(question, resolve));

(async function setup() {
  console.log(
    colors.cyan,
    `${emojis.info} Starting setup process...`,
    colors.reset
  );

  // 选择API提供商
  console.log(
    colors.cyan,
    `\n${emojis.info} Choose your AI API provider:`,
    colors.reset
  );
  console.log("1. OpenAI (GPT models)");
  console.log("2. DeepSeek (DeepSeek models)");
  
  let apiProvider;
  let apiKey;
  let envKeyName;
  
  while (true) {
    const choice = await ask(
      `${colors.yellow}Enter your choice (1 for OpenAI, 2 for DeepSeek): ${colors.reset}`
    );
    
    if (choice === "1") {
      apiProvider = "OpenAI";
      envKeyName = "OPENAI_API_KEY";
      apiKey = await ask(
        `${colors.yellow}Enter your OPENAI_API_KEY: ${colors.reset}`
      );
      break;
    } else if (choice === "2") {
      apiProvider = "DeepSeek";
      envKeyName = "DEEPSEEK_API_KEY";
      apiKey = await ask(
        `${colors.yellow}Enter your DEEPSEEK_API_KEY: ${colors.reset}`
      );
      break;
    } else {
      console.log(
        colors.red,
        `${emojis.error} Invalid choice. Please enter 1 or 2.`,
        colors.reset
      );
    }
  }

  console.log(
    colors.green,
    `${emojis.success} Selected ${apiProvider} as your AI provider.`,
    colors.reset
  );

  const mongodbUser = await ask(
    `${colors.yellow}Enter your MONGODB_USER: ${colors.reset}`
  );
  const mongodbPassword = await ask(
    `${colors.yellow}Enter your MONGODB_PASSWORD: ${colors.reset}`
  );
  const mongodbUrl = await ask(
    `${colors.yellow}Enter your MONGODB_URL: ${colors.reset}`
  );
  const mongodbDbName = await ask(
    `${colors.yellow}Enter your MONGODB_DB_NAME: ${colors.reset}`
  );
  const frontendUrl = "http://localhost:3000";

  const jwtSecretKey = crypto.randomBytes(16).toString("hex");

  const envContent = `
  ${envKeyName}="${apiKey}"
  API_PROVIDER="${apiProvider}"
  MONGODB_USER="${mongodbUser}"
  MONGODB_PASSWORD="${mongodbPassword}"
  MONGODB_URL="${mongodbUrl}"
  MONGODB_DB_NAME="${mongodbDbName}"
  FRONTEND_URL="${frontendUrl}"
  JWT_SECRET_KEY="${jwtSecretKey}"
  PORT=5000
  `.trim();

  fs.writeFileSync(".env", envContent);

  console.log(
    colors.green,
    `${emojis.success} .env file created successfully.`,
    colors.reset
  );

  console.log(
    colors.cyan,
    `${emojis.info} Installing dependencies...`,
    colors.reset
  );
  execSync("npm i", { stdio: "inherit" });

  console.log(colors.cyan, `${emojis.info} Installing types...`, colors.reset);
  execSync("npm i --save-dev @types/node", { stdio: "inherit" });

  console.log(
    colors.cyan,
    `${emojis.info} Building the project...`,
    colors.reset
  );
  execSync("npm run build", { stdio: "inherit" });

  const adminUsername = await ask(
    `${colors.yellow}Enter a username for the admin user: ${colors.reset}`
  );
  const adminPassword = await ask(
    `${colors.yellow}Enter a password for the admin user: ${colors.reset}`
  );

  console.log(
    colors.cyan,
    `${emojis.info} Creating admin user...`,
    colors.reset
  );
  execSync(
    `node build/server.js create-user ${adminUsername} ${adminPassword}`,
    { stdio: "inherit" }
  );

  rl.close();
  console.log(colors.green, `${emojis.success} Setup complete!`, colors.reset);
  console.log(
    colors.cyan,
    `${emojis.info} You can now start the server with: npm run dev`,
    colors.reset
  );
})();
