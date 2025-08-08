const mineflayer = require('mineflayer');
const inquirer = require('inquirer');
const dns = require('dns');
const chalk = require('chalk');
const fs = require('fs');

// Map lỗi từ server sang tiếng Việt
const reasonMap = {
  'multiplayer.disconnect.duplicate_login': '⚠️ Tài khoản đã đăng nhập từ nơi khác!',
  'multiplayer.disconnect.kicked': '💥 Bạn đã bị kick khỏi server.',
  'disconnect.spam': '💢 Spam quá nhiều!',
  'multiplayer.disconnect.not_whitelisted': '🚫 Server yêu cầu whitelist.',
  // Có thể thêm lỗi khác ở đây
};

// Kiểm tra IP có hợp lệ hay không
function checkIP(host) {
  return new Promise((resolve) => {
    dns.lookup(host, (err, address) => {
      if (err) {
        console.log(chalk.red('❌ Lỗi: IP server không hợp lệ!'));
        resolve(false);
      } else {
        console.log(chalk.green(`✅ IP hợp lệ: ${address}`));
        resolve(true);
      }
    });
  });
}

// Tạo và quản lý bot
function startBot(username, host, port, version) {
  const prefix = chalk.blue(`[${username}]`);

  const connect = () => {
    const bot = mineflayer.createBot({ host, port, username, version });

    bot.on('spawn', () => {
      console.log(`${prefix} ✅ Đã vào server ${host}:${port}`);
    });

    bot.on('kicked', (reason) => {
      let msg = '';
      try {
        const parsed = JSON.parse(reason);
        const translate = parsed?.translate;
        msg = reasonMap[translate] || translate || JSON.stringify(parsed);
      } catch {
        msg = reason.toString();
      }
      console.log(`${prefix} 💥 Bị kick: ${msg}`);
    });

    bot.on('end', () => {
      console.log(`${prefix} ⚠️ Mất kết nối. Tự động kết nối lại sau 15 giây...`);
      setTimeout(connect, 15000);
    });

    bot.on('error', (err) => {
      console.log(`${prefix} ❌ Lỗi: ${err.message}`);
    });
  };

  connect();
}

// Đọc danh sách tài khoản từ file nếu có
function loadAccountsFromFile(file = 'accounts.txt') {
  if (fs.existsSync(file)) {
    const data = fs.readFileSync(file, 'utf-8');
    return data.split('\n').map(line => line.trim()).filter(Boolean);
  }
  return [];
}

// Hỏi người dùng nhập thông tin bot
async function promptUser(accountsFromFile) {
  let accounts = [];

  if (accountsFromFile.length > 0) {
    const { useFile } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'useFile',
        message: `📂 Tìm thấy ${accountsFromFile.length} tài khoản trong file. Dùng không?`,
        default: true
      }
    ]);

    if (useFile) {
      accounts = accountsFromFile;
    }
  }

  // Nếu không dùng file, hỏi thủ công
  if (accounts.length === 0) {
    while (true) {
      const { username } = await inquirer.prompt([
        {
          type: 'input',
          name: 'username',
          message: '🔤 Nhập tên tài khoản (để trống để dừng):'
        }
      ]);

      if (!username) break;
      accounts.push(username);
    }
  }

  if (accounts.length === 0) {
    console.log(chalk.red('❌ Không có tài khoản nào!'));
    process.exit(1);
  }

  const { host, port, version } = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: '🌐 Nhập IP server:',
      validate: (val) => val.length > 0 || 'Không được bỏ trống'
    },
    {
      type: 'input',
      name: 'port',
      message: '🔢 Nhập cổng (mặc định 25565):',
      default: '25565',
      validate: (val) => !isNaN(parseInt(val)) || 'Phải là số'
    },
    {
      type: 'input',
      name: 'version',
      message: '📦 Nhập phiên bản Minecraft (Enter nếu không rõ):',
      default: ''
    }
  ]);

  return {
    accounts,
    host,
    port: parseInt(port),
    version: version || false
  };
}

// === CHƯƠNG TRÌNH CHÍNH ===
(async () => {
  console.log(chalk.cyan.bold('\n💠 MINEFLAYER BOT LAUNCHER - by Tiến Đạt\n'));

  const accountsFromFile = loadAccountsFromFile();
  const { accounts, host, port, version } = await promptUser(accountsFromFile);

  const valid = await checkIP(host);
  if (!valid) return;

  accounts.forEach(username => {
    startBot(username, host, port, version);
  });
})();
