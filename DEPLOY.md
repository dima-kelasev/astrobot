# Астробот на сервере

Схема: сайт, мини-апп и бот живут на российском сервере. Сайт открывается по адресу `https://astro.nordvale.org`, мини-апп — по `https://astro.nordvale.org/app/`. К `api.telegram.org` бот ходит через SSH-туннель на зарубежный сервер, потому что напрямую из России Telegram недоступен. К нейросети сервер ходит напрямую.

В командах замените:

- `FOREIGN_IP` — адрес зарубежного сервера
- `USER` — ваше имя на GitHub

## 1. Код на GitHub

На своём компьютере, в папке проекта:

```bash
git init -b main
git add .
git status
```

В списке не должно быть файла `.env` и папок `node_modules`, `dist`, `data`. Если всё так:

```bash
git commit -m "Астробот"
```

Создайте на github.com приватный репозиторий `astrobot` без README и отправьте код:

```bash
git remote add origin git@github.com:USER/astrobot.git
git push -u origin main
```

## 2. Адрес

В DNS добавьте запись типа A: имя `astro`, значение — адрес российского сервера. В Cloudflare облачко у записи должно быть серым (DNS only), иначе в России мини-апп будет открываться медленно или не откроется.

## 3. Node.js на российском сервере

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git
node -v
```

Должна быть версия 22 или новее.

## 4. Код на сервере

```bash
ssh-keygen -t ed25519 -f /root/.ssh/astrobot_deploy -N ""
cat /root/.ssh/astrobot_deploy.pub
```

Выведенную строку добавьте в репозитории на GitHub: Settings → Deploy keys → Add deploy key. Затем:

```bash
GIT_SSH_COMMAND="ssh -i /root/.ssh/astrobot_deploy" git clone git@github.com:USER/astrobot.git /opt/astrobot
cd /opt/astrobot
git config core.sshCommand "ssh -i /root/.ssh/astrobot_deploy"
```

## 5. Туннель до Telegram

На российском сервере создайте ключ:

```bash
ssh-keygen -t ed25519 -f /root/.ssh/tgtunnel -N ""
cat /root/.ssh/tgtunnel.pub
```

На зарубежном сервере заведите отдельного пользователя без входа в систему:

```bash
useradd -m -s /usr/sbin/nologin tgtunnel
mkdir -p /home/tgtunnel/.ssh
nano /home/tgtunnel/.ssh/authorized_keys
```

В файл вставьте одну строку: сначала ограничения, потом через пробел ключ из `tgtunnel.pub`.

```
restrict,port-forwarding,permitopen="api.telegram.org:443" ssh-ed25519 AAAA...
```

С такой строкой этот ключ умеет только одно: соединяться с `api.telegram.org`. Дальше там же:

```bash
chown -R tgtunnel:tgtunnel /home/tgtunnel/.ssh
chmod 700 /home/tgtunnel/.ssh
chmod 600 /home/tgtunnel/.ssh/authorized_keys
```

На российском сервере включите туннель:

```bash
cp /opt/astrobot/deploy/tg-tunnel.service /etc/systemd/system/
nano /etc/systemd/system/tg-tunnel.service
systemctl daemon-reload
systemctl enable --now tg-tunnel
```

В файле замените `FOREIGN_IP`. Если SSH на зарубежном сервере слушает не 22-й порт, поправьте и `-p 22`.

Проверка:

```bash
curl -s -o /dev/null -w "%{http_code}\n" --socks5-hostname 127.0.0.1:11080 https://api.telegram.org
```

Ответ `302` или `200` значит, что туннель работает. Ответ `000` — не работает, причину покажет `journalctl -u tg-tunnel -n 20`.

## 6. Настройки

```bash
cd /opt/astrobot
cp .env.example .env
chmod 600 .env
nano .env
```

Что вписать:

```
BOT_TOKEN=токен бота
BOT_USERNAME=имя бота без @
WEBAPP_URL=https://astro.nordvale.org/app/
TELEGRAM_PROXY=socks5h://127.0.0.1:11080
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=ключ нейросети
LLM_MODEL=название модели
PORT=3005
```

`DEV_USER_ID` оставьте пустым. В `TELEGRAM_PROXY` нужна именно буква `h` в `socks5h`. `BOT_USERNAME` попадает в кнопку на сайте, после его изменения нужна новая сборка.

## 7. Запуск

Сначала остановите бота на своём компьютере: с одним токеном может работать только одна копия.

```bash
cd /opt/astrobot
npm ci
npm run build
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
pm2 logs astrobot --lines 20
```

Если сборка падает из-за нехватки памяти, добавьте файл подкачки и повторите:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
```

В журнале должны быть строки «Бот ходит в Telegram через прокси.» и «Бот запущен.». Если туннель упадёт, бот сам подключится снова, когда тот поднимется.

## 8. nginx и сертификат

```bash
cp /opt/astrobot/deploy/nginx.conf /etc/nginx/conf.d/astrobot.conf
nano /etc/nginx/conf.d/astrobot.conf
nginx -t
systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d astro.nordvale.org
```

Если в `.env` порт не 3005, поправьте его и в этом файле. После этого `https://astro.nordvale.org` должен открывать сайт с кнопкой «Открыть в Telegram».

## 9. Telegram

В @BotFather: ваш бот → Mini Apps → Main App → адрес `https://astro.nordvale.org/app/`. Кнопку меню бот обновит сам при запуске. Откройте бота и отправьте `/start`.

## Обновление

На своём компьютере: `git add . && git commit -m "что изменилось" && git push`.

На сервере:

```bash
cd /opt/astrobot
git pull
npm ci
npm run build
pm2 restart astrobot
```

## Резервная копия

Все данные лежат в одном файле `/opt/astrobot/data/astrobot.db`.
