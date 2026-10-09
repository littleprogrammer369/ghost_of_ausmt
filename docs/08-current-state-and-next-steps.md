# وضعیت واقعی مخزن و قدم‌های بعدی

**Snapshot:** ۸ اکتبر ۲۰۲۶، بر اساس خروجی ترمینالی‌ای که مالک پروژه فرستاد. این سند یک عکس لحظه‌ای است؛ قبل از هر عملیات Git وضعیت واقعی را دوباره بررسی کن.

**توجه:** تصمیمات جاری مالک در `docs/adr/0001-mvp-foundations-and-roles.md` ثبت شده و فرض‌های قدیمی این snapshot را باطل می‌کند. وضعیت این سند را سند تاریخی در نظر بگیر.

## وضعیت تأییدشده

- مسیر مخزن: `/home/jcode/claude_code/ghost_of_ausmt`
- Remote: `https://github.com/littleprogrammer369/ghost_of_ausmt.git`
- Branch و upstream: `main` → `origin/main`
- commit پایه‌ی اسناد: `8690bbc docs: add roadmap and coding-agent workflow`
- نتیجه‌ی گزارش‌شده پس از push: `main` با `origin/main` همگام و working tree پاک.
- این commit شامل اسناد و قواعد ایجنت است؛ اپلیکیشن، API، database، dependency install، CI، Compose یا deployment هنوز پیاده‌سازی نشده‌اند.

## هشدار مهم درباره‌ی Git author

فرمان ثبت‌شده برای تنظیم `user.email` این متن نمونه را عیناً وارد کرده است:

```text
YOUR_VERIFIED_GITHUB_EMAIL_OR_NOREPLY
```

پس commit `8690bbc` با metadata نویسنده‌ی اشتباه ساخته شده است. این موضوع push یا اتصال remote را خراب نمی‌کند، اما ممکن است commit در GitHub به حساب نویسنده وصل نشود.

- commit قبلی را amend/rebase نکن و برای اصلاحش force-push نکن؛ تاریخچه‌ی منتشرشده را حفظ کن.
- قبل از commit بعدی، نام و ایمیل معتبر را فقط در تنظیمات local همین repo بگذار.
- ایمیل را در این گفتگو، prompt، log یا فایل پروژه منتشر نکن.
- از اسکریپت `set-git-author.sh` همراه بسته استفاده کن؛ ایمیل را در ترمینال به‌صورت مخفی وارد می‌کند و از `--global` استفاده نمی‌کند.

## بسته‌ی پاک‌سازی و جایگزینی

بسته‌ی `ghost_of_ausmt-clean-refresh.zip` شامل یک نسخه‌ی مرتب و یک‌دست از اسناد و قواعد، README ریشه، `.gitignore`، markerهای Node و اسکریپت‌های نصب امن است. این **جایگزینی فایل‌های پروژه است، نه حذف/ساخت مجدد مخزن Git**.

`apply.sh` باید از دایرکتوری استخراج‌شده، بیرون از repo اجرا شود. این اسکریپت:

1. فقط مسیر `/home/jcode/claude_code/ghost_of_ausmt`، remote مورد انتظار، branch `main`، upstream، پاک‌بودن worktree و SHA شاخه‌ی زنده‌ی GitHub برابر با `HEAD` محلی را می‌پذیرد؛ بررسی remote read-only است. اگر هرکدام متفاوت باشند، متوقف می‌شود.
2. پیش از تغییر، از مسیرهای هدف در یک دایرکتوری پشتیبان timestampدار **کنار repo و بیرون از آن** کپی می‌گیرد.
3. فقط `README.md`، `AGENTS.md`، `CLAUDE.md`، `.gitignore`، `.nvmrc`، `.node-version` و `docs/` را جایگزین می‌کند.
4. به `.git`، branch، remote، commit history، مسیر تنظیمات Claude در `/home/jcode/claude_code/.claude/` یا فایل‌های خارج از فهرست بالا دست نمی‌زند.
5. فایل‌ها را stage، commit یا push نمی‌کند؛ diff را خودت بازبینی می‌کنی.

## دستورهای نصب بسته

ZIP را بیرون از repo، مثلاً در Downloads، قرار بده. اگر مسیر دانلود متفاوت است، فقط مقدار `ZIP` را تغییر بده:

```bash
ZIP="$HOME/Downloads/ghost_of_ausmt-clean-refresh.zip"
PACK="/home/jcode/claude_code/ghost_of_ausmt-clean-refresh"
mkdir -p "$PACK"
unzip -q "$ZIP" -d "$PACK"
cd "$PACK"
bash ./apply.sh /home/jcode/claude_code/ghost_of_ausmt
```

اسکریپت پیش از جایگزینی مسیرهای هدف و مقصد پشتیبان را نشان می‌دهد و برای ادامه تأیید می‌خواهد. اگر شرایط دقیق برقرار نباشند یا تأیید نکنی، هیچ فایلی را تغییر نمی‌دهد.

پس از اتمام، این‌ها را اجرا و خروجی را خودت بررسی کن:

```bash
cd /home/jcode/claude_code/ghost_of_ausmt
git status --short --branch
git diff --check
git add AGENTS.md CLAUDE.md README.md .gitignore .nvmrc .node-version docs/
git diff --cached --check
git diff --cached --name-only
git diff --cached --stat
git diff --cached
```

انتظار می‌رود فقط تغییرات اسنادی/قواعدی دیده شود؛ اسکریپت نصب و فایل ZIP در خود repo کپی نمی‌شوند.

## هویت Git برای commit بعدی

بعد از نصب و پیش از هر commit:

```bash
cd /home/jcode/claude_code/ghost_of_ausmt
bash /home/jcode/claude_code/ghost_of_ausmt-clean-refresh/set-git-author.sh /home/jcode/claude_code/ghost_of_ausmt
```

در صورت جابه‌جایی پوشه‌ی بسته، مسیر اسکریپت را به مسیر واقعی تغییر بده. اسکریپت از GitHub Settings → Emails می‌خواهد نام و ایمیل معتبر/noreply را وارد کنی، ایمیل را روی صفحه چاپ نمی‌کند و فقط `git config --local` را تغییر می‌دهد.

پس از بازبینی diff stageشده و اطمینان از نبود secret، commit/push کن:

```bash
cd /home/jcode/claude_code/ghost_of_ausmt
git commit -m "docs: refresh project guidance and status"
git push origin main
git status --short --branch
git log -1 --oneline
```

از `git add .`، `git add -A`، `git reset --hard`، `git clean`، حذف `.git`، تعویض branch یا force-push استفاده نکن. اگر تست/بررسی یا push شکست خورد، متوقف شو و علت دقیق را گزارش کن.

## گیت صفرِ هزینه برای مسیر مدل ابزار coding-agent

در تنظیمات Claude Code پیام `API Usage Billing` و قیمت‌های دلاری دیده شده است. تا وقتی برای **شناسه‌ی دقیق مدل + مسیر provider + همان حساب** مدرک قابل‌بررسی از قیمت صفر یا سهمیه‌ی رایگان کافی در دست نیست:

- هیچ درخواست مدلی ارسال نکن؛ این محدودیت P0 فقط‌خواندنی را هم شامل می‌شود، چون خود prompt هزینه‌ی استنتاج دارد.
- سبزشدن اتصال، tool-call موفق، نامی که شامل `free` باشد، یا انتخاب مدل در فهرست به‌تنهایی مدرک رایگان‌بودن نیست.
- از مقاله‌ی واقعی، اطلاعات شخصی، `.env`، token یا credential برای smoke test استفاده نکن.
- اگر هزینه نامشخص است، فقط بررسی‌های محلی/قاعده‌محور انجام بده یا متوقف شو؛ هزینه را به مالک تحمیل نکن.

برای عبور از گیت باید دست‌کم این موارد مشخص باشند: شناسه‌ی واقعی مدل، endpoint/route، نرخ ورودی/خروجی یا منبع معتبر سهمیه‌ی رایگان، مدت/محدودیت سهمیه، و سازگاری Claude Code با tool calling در همان مسیر. شواهد و تاریخ بررسی را بدون افشای credential ثبت کن.

مالک در ۹ اکتبر ۲۰۲۶ مسیر 9Router → shit_combo → Fallback را با چرخش کلید و دسترسی صفر‌هزینه برای ۱۶ مسیر عضو تأیید کرد. این مجوز فقط به ابزار coding-agent مربوط است و Product AI را پوشش نمی‌دهد؛ Product AI مسیر مجزا و قابل تنظیم دارد و بدون اجازه صریح، هیچ متن مقاله به بیرون ارسال نمی‌شود. جزئیات را در `docs/adr/0001-mvp-foundations-and-roles.md` ببین.

## ترتیب ادامه‌ی پروژه

1. بسته را با backup نصب و diff را بازبینی کن.
2. Git author محلی را اصلاح کن؛ commit `8690bbc` را دست‌نخورده نگه دار.
3. تغییرات راهنما را پس از بررسی روی همان `main` commit و push کن.
4. پیش از P0 هر درخواست مدل را از گیت هزینه عبور بده.
5. پس از تأیید هزینه، P0 را فقط‌خواندنی اجرا؛ گزارشش را قبل از P1 بررسی کن.
6. Auth و schema دامنه تا تصویب ERD، نقش‌ها، شناسه‌ی ورود و refresh-session متوقف است.
