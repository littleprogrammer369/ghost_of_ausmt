# نقشهٔ اجرایی سامانهٔ مدیریت همایش و گردش‌کار GitHub

**نسخه:** 0.1
**تاریخ:** ۸ اکتبر ۲۰۲۶
**وضعیت:** نقشهٔ اجرایی؛ پیش از شروع پیاده‌سازی باید Git clone واقعی، منبع مستندات و مسیر رایگان/مجاز مدل کدنویسی تأیید شوند.

این نقشه بر اسناد ۰۰ تا ۰۶ و تصمیم‌های ثبت‌شدهٔ مالک محصول تکیه دارد. این سند زمان‌بندی تقویمی وعده نمی‌دهد؛ هر milestone با معیار خروج مشخص می‌شود تا تا وقتی آزمون‌ها و بازبینی آن مرحله پاس نشده، مرحلهٔ بعد شروع نشود.

## ۱. هدف و تصمیم‌های تغییرناپذیر

- یک کدبیس پیکربندی‌محور؛ استقرار مستقل روی سرور هر دانشگاه. تغییرات هر دانشگاه با داده و تنظیمات برند انجام می‌شود، نه fork جداگانه.
- سه سطح محصول: سایت شرکتی، سایت عمومی هر همایش، و پنل‌های نقش‌محور در اپ همایش.
- زبان‌های فارسی و انگلیسی از روز اول، با RTL/LTR واقعی و parity کلیدهای ترجمه.
- ظاهر: سایت شرکتی Neumorphism کنترل‌شده؛ سایت همایش Glassmorphism کنترل‌شده؛ پنل دانشگاه Claymorphism کنترل‌شده. متن، جدول و فرم باید کنتراست و خوانایی پایدار داشته باشند.
- هیچ ایموجی در UI یا عنوان‌ها؛ آیکون‌های Lucide.
- پرداخت آنلاین در MVP نیست.
- پردازش AI باید از قاعده‌محور/محلی به‌عنوان پایه استفاده کند و با قطع اینترنت همچنان مسیر معنادار داشته باشد. اتصال بیرونی اختیاری، قابل تنظیم و بدون ارسال مقالهٔ واقعی مگر با مجوز صریح است.
- هر دادهٔ دامنه‌ای باید در زمینهٔ `conference_id` مجاز شود؛ پنهان‌کردن دکمه جایگزین مجوز سمت سرور نیست.
- فایل مقاله خصوصی است؛ دسترسی فقط با کنترل مجوز و لینک کوتاه‌عمر، و دانلود حساس audit می‌شود.
- هر تغییر وضعیت مقاله در `status_history` و هر اقدام حساس در `audit_logs` ثبت می‌شود.
- هیچ API key، `.env`، اطلاعات شخصی یا فایل مقاله‌ای در Git، prompt، گزارش یا log قرار نمی‌گیرد.

## ۲. وضعیت فعلی و گیت‌های قبل از کدنویسی

### موارد تأییدشده

- `gh api user` حساب `littleprogrammer369` را برگردانده و `gh repo view` دسترسی به مخزن خصوصی `littleprogrammer369/ghost_of_ausmt` را تأیید کرده است.
- خطای اولیه‌ی `not a git repository` برطرف شد. طبق خروجی ترمینال کاربر، clone واقعی در `/home/jcode/claude_code/ghost_of_ausmt` قرار دارد؛ ریشهٔ Git همان مسیر است، `origin` به `https://github.com/littleprogrammer369/ghost_of_ausmt.git` وصل است و branch `main` با `origin/main` همگام و working tree تمیز است.
- احراز هویت GitHub و دسترسی به مخزن خصوصی تأیید شده؛ این به‌تنهایی هنوز write/push آزمایشی انجام نداده و هیچ کدی commit/push نشده است.
- طبق خروجی Claude Code، تنظیم AgentRouter فعلاً در `/home/jcode/claude_code/.claude/settings.json` است، در حالی که تنظیم کاربری `/home/jcode/.claude/settings.json` خالی گزارش شده. پس نباید فرض کرد تنظیم پروژه پس از رفتن به clone تازه هم اعمال می‌شود.
- اسناد اولیه ۰۰/۰۱/۰۳ مسیر توسعه از طریق 9Router را فرض کرده بودند؛ وضعیت فعلی کاربر استفادهٔ مستقیم Claude Code از AgentRouter است. این تغییر فقط مسیر ابزار توسعه را توصیف می‌کند و معماری AI داخل محصول را عوض نمی‌کند.
- رابط مدل Claude Code پیام `API Usage Billing` و نرخ‌های دلاری نشان داده است. موفق‌شدن احراز هویت به معنی رایگان‌بودن استفاده نیست؛ قیمت نمایش‌داده‌شده در Claude Code نیز به‌تنهایی قیمت واقعی AgentRouter را ثابت نمی‌کند.

### اقدامات ایمن برای آماده‌سازی ریپو

1. `git init` را روی پوشهٔ فعلی اجرا نکن و پوشهٔ تنظیمات Claude Code را به ریپوی محصول تبدیل نکن.
2. مقصد انتخاب‌شدهٔ مالک محصول `/home/jcode/claude_code/ghost_of_ausmt` است. این اسکریپت پوشهٔ موجود را بررسی می‌کند، داده‌ای را حذف نمی‌کند و فقط در صورت خالی‌بودن پوشه clone می‌کند:

   ```bash
   PROJECT=/home/jcode/claude_code/ghost_of_ausmt
   if git -C "$PROJECT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
     echo "این مسیر از قبل Git worktree است."
     git -C "$PROJECT" remote -v
   elif [ ! -e "$PROJECT" ]; then
     gh repo clone littleprogrammer369/ghost_of_ausmt "$PROJECT"
   elif [ -z "$(find "$PROJECT" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]; then
     rmdir "$PROJECT" && gh repo clone littleprogrammer369/ghost_of_ausmt "$PROJECT"
   else
     echo "مسیر وجود دارد و خالی نیست؛ هیچ فایلی تغییر نکرد. فهرست را بازبینی کن."
     ls -la "$PROJECT"
   fi
   ```

3. clone را تأیید کن:

   ```bash
   git -C /home/jcode/claude_code/ghost_of_ausmt rev-parse --show-toplevel
   git -C /home/jcode/claude_code/ghost_of_ausmt remote -v
   git -C /home/jcode/claude_code/ghost_of_ausmt status --short --branch
   git -C /home/jcode/claude_code/ghost_of_ausmt branch --show-current
   ```

4. باید ریشهٔ Git و `origin` مربوط به مخزن موردنظر دیده شود. نام branch را از خروجی واقعی ثبت کن؛ اسم آن را حدس نزن.
5. پیش از اجرای Claude Code در clone جدید، تنظیم AgentRouter باید در تنظیمات کاربری امن و خارج از مخزن محصول قرار گیرد؛ توکن را در فایل‌های ریپو کپی نکن. کلیدی را که قبلاً در گفتگو فرستاده شده دوباره استفاده نکن.
6. پیش از prompt کدنویسی، مدل انتخابی و سیاست اعتبار حساب باید صریحاً `0$` یا پوشش رایگان معتبر را نشان دهند. تا آن زمان هیچ promptی که درخواست مدل بفرستد اجرا نشود.
7. اسناد مرجع ۰۰ تا ۰۷، `AGENTS.md` و `CLAUDE.md` اکنون در clone محلی هستند؛ تا وقتی docs-only commit و push انجام نشده‌اند، در GitHub نیستند.

## ۳. نقشهٔ milestoneها

| مرحله | هدف و خروجی | معیار عبور |
|---|---|---|
| **M0 — دسترسی و سلامت ریپو** | clone واقعی، `origin` صحیح، branch فعال، احراز هویت GitHub، کنترل secretها، انتقال اسناد مرجع و تثبیت استفاده از همان branch | `git status`، ریشه و `origin` درست باشند؛ branch مشخص باشد؛ فایل secret در Git نباشد؛ مدل کدنویسی برای استفادهٔ موردنظر واقعاً رایگان تأیید شده باشد. |
| **M1 — ممیزی و اسکلت مونوریپو** | اجرای P0 فقط‌خواندنی؛ سپس P1 برای ریشهٔ pnpm/Turborepo، نسخه‌های قفل‌شده، `README`، تنظیم TypeScript/lint/format و lockfile | نصب frozen تکرارپذیر باشد؛ اسکریپت‌های افزوده‌شده واقعاً اجرا شوند؛ CI پایه lint/typecheck/test/build را اجرا کند؛ تمام تغییرات روی branch موجود push شوند. |
| **M2 — پوستهٔ UI و API** | P2: پوستهٔ سایت شرکتی و همایش، design tokens، `fa/en` و RTL/LTR؛ P3: پوستهٔ NestJS، پیکربندی معتبر، liveness/readiness و error envelope | build هر app موفق؛ ترجمه‌ها parity داشته باشند؛ تست locale و health پاس شود؛ هنوز schema دامنه و auth ساخته نشده باشد. |
| **M3 — تثبیت نیازمندی و قرارداد داده** | بازبینی و تصویب سند ۰۲ و ۰۳؛ نهایی‌کردن ERD، ماشین وضعیت، permission matrix، قرارداد API و ADRهای ابهام‌دار | مالک محصول موارد باز را صریحاً تأیید کند. تا آن زمان Prisma schema دامنه و احراز هویت کامل ممنوع است. |
| **M4 — پایهٔ داده، tenant و حسابرسی** | PostgreSQL/Prisma، migrationهای شماره‌دار، scope اجباری `conference_id`، `status_history`، `audit_logs` و ذخیره‌سازی فایل خصوصی | تست integration برای جداسازی همایش‌ها، rollback کنترل‌شدهٔ migration، عدم دسترسی مستقیم وب به DB، و تست مجوز فایل پاس شود. |
| **M5 — هویت و مجوزها** | احراز هویت پس از تصویب شناسهٔ ورود، Argon2id، access JWT کوتاه‌عمر، refresh session چرخشی در cookie امن، عضویت همایش و نقش‌ها | تست‌های login، انقضا/لغو/چرخش session، privilege escalation و دسترسی cross-conference پاس شوند؛ هیچ کاربری نقش خود را تعیین نکند. |
| **M6 — محتوای همایش و ثبت‌نام** | تنظیم برند و محتوای همایش، صفحهٔ اصلی، محورهای گروه‌بندی‌شده، تاریخ‌ها، اخبار، کمیته، FAQ، تماس، صفحه‌های پویا و فرم ثبت‌نام قابل تنظیم | مسیرهای فارسی/انگلیسی و RTL/LTR؛ فرم‌ها validation و ذخیرهٔ امن داشته باشند؛ سقف ارسال مقاله در سطح همایش atomically enforce شود؛ درگاه پرداخت وجود نداشته باشد. |
| **M7 — ارسال مقاله و دستیار AI** | آپلود `.docx` امن، استخراج قاعده‌محور عنوان/چکیده/کلیدواژه/منابع/نویسندگان، بازبینی انسانی، تطبیق محور، وضعیت و نسخه‌های اصلاحی | فایل بد/بزرگ رد شود؛ نتیجه با برچسب استخراج خودکار و قابل اصلاح باشد؛ مسیر offline/degraded آزموده شود؛ هیچ مقالهٔ واقعی بدون اجازه به بیرون ارسال نشود. |
| **M8 — داوری و تصمیم** | تعریف داور و تخصص، دعوت و پذیرش/رد، تخصیص مقاله، فرم داوری، داوری کور بر اساس تنظیم همان همایش، تداخل منافع، نظرات اصلاحی و تصمیم نهایی ادیتور | داور فقط پروندهٔ مجاز خود را ببیند؛ هر transition تاریخچه و audit داشته باشد؛ نویسنده فقط اطلاعاتی را ببیند که سیاست داوری اجازه می‌دهد. |
| **M9 — گواهی، اعلان و گزارش پایه** | بارگذاری قالب گواهی، جای‌گذاری فیلد، PDF، تاریخ عددی/نوشتاری، QR و اعتبارسنجی عمومی، صدور گروهی، پیام‌های داخل پنل و SMTP/SMS adapter، گزارش پایه | PDF فارسی قابل‌خواندن باشد؛ QR قابل‌اعتبارسنجی؛ صدور/ابطال audit شود؛ سرویس پیام قطع باشد اما جریان اصلی سامانه از کار نیفتد. |
| **M10 — تثبیت MVP و pilot** | E2E مسیر کامل از ثبت‌نام تا دریافت گواهی، امنیت و دسترس‌پذیری، staging، Compose، HTTPS، health، log و backup/restore | یک همایش آزمایشی end-to-end؛ تست بازیابی واقعی؛ image/version قفل‌شده؛ runbook نصب/ارتقا/rollback؛ هیچ دادهٔ واقعی یا secret در demo/test نباشد. |
| **M11 — توسعهٔ پس از MVP** | پرداخت با adapter پس از انتخاب سرویس و تأیید مالک؛ کارگاه، همراهان، غذا، کارت شناسایی، تخفیف/گروه، فرم‌ساز پیشرفته، کتابچه و خروجی ISC، نشست‌ها و داوری چندسطحی، گزارش‌های گرافیکی | هر قابلیت با ADR، آزمون و migration مستقل؛ اتصال مالی با idempotency، webhook signature و تطبیق تراکنش؛ خارج از MVP اولیه. |
| **M12 — محصول‌سازی و رشد** | نصب مستقل آسان برای دانشگاه‌ها، config برند، بستهٔ update/backup، license امضاشده و اعتبارسنجی آفلاین، پنل ادمین شرکت و در صورت نیاز داشبورد ناوگان نصب‌ها؛ مسیر ارزیابی/آموزش مدل اختصاصی با دادهٔ مجاز و ناشناس | نصب جداگانه بدون fork؛ upgrade و rollback آزمایش‌شده؛ هیچ وابستگی اجباری به سرویس مرکزی؛ آموزش مدل فقط پس از رضایت، ناشناس‌سازی و ارزیابی مجموعهٔ طلایی. |

## ۴. تصمیم‌های باز که باید پیش از milestone مرتبط نهایی شوند

1. **نقش‌ها:** اسناد موجود در شمار/نام نقش‌ها یکسان نیستند: در نقشهٔ پنل ۴ فضای اصلی دیده می‌شود، در قواعد ایجنت `super_admin`, `editor`, `support`, `reviewer`, `committee`, `author` آمده است. پیش از M3 باید ماتریس نقش/مجوز توسط مالک محصول تأیید شود.
2. **شناسهٔ ورود:** ایمیل، موبایل، یا هر دو؛ سیاست verification و بازیابی حساب.
3. **Refresh session:** محل ذخیره، rotation، reuse detection، لغو و مدت اعتبار.
4. **مدل استقرار:** در فاز نخست هر نصب یک همایش دارد، اما تمام داده‌های دامنه از ابتدا `conference_id` دارند. هر انحراف از این تصمیم نیازمند تأیید است.
5. **سرویس‌های بیرونی:** ارائه‌دهندهٔ ایمیل، پیامک، دامنه و نمونهٔ گواهی؛ به صورت adapter و قابل تنظیم.
6. **AI:** هر نوع ارسال بیرونی، سطح رضایت، سقف هزینه و سیاست نگهداری داده. وضعیت API/رایگان‌بودن AgentRouter هنوز مجوز ارسال مقالهٔ واقعی نیست.
7. **نام‌گذاری:** مخزن GitHub `ghost_of_ausmt` است؛ سند قدیمی نام داخلی `hamayesh-platform` را ذکر می‌کند. نام پوشه/مخزن را خودسرانه تغییر نده؛ نام داخلی packageها با تصمیم مالک محصول نهایی شود.

## ۵. گیت کیفیت پایان هر vertical slice

- scope task محدود و مستند باشد؛ قبل از تغییر branch/status و فایل‌های مرتبط بررسی شوند.
- lint، typecheck، unit/integration/e2e/build مرتبط واقعاً اجرا شوند؛ خطای تست را پنهان یا تست‌نشده را passing اعلام نکن.
- ترجمهٔ فارسی/انگلیسی، RTL/LTR، keyboard/focus، empty/error/loading states و responsive بررسی شوند.
- مجوز سمت API، scope همایش، `audit_logs` و `status_history` در تغییرات مربوط پوشش داده شوند.
- secret scan و `git diff --check` انجام شود؛ فقط فایل‌های متعلق به همان task stage شوند.
- فقط پس از پاس‌شدن بررسی‌ها commit و push به همان branch انجام شود؛ هیچ force-push، تغییر branch یا deployment خودکاری وجود ندارد.
- گزارش نهایی شامل فایل‌ها، تست‌ها، فرض‌ها/گپ‌ها، branch، commit hash و وضعیت push باشد.

## ۶. قرارداد ثابت GitHub برای همهٔ پرامپت‌های کدنویسی

این بلوک انگلیسی باید در هر پرامپت تغییردهندهٔ کد حاضر باشد. P0 استثناست: فقط خواندن و گزارش branch/status و بدون commit/push.

```text
GITHUB / SAME-BRANCH POLICY (MANDATORY)
- Before editing, verify this is the intended Git working tree, `origin` points to the requested repository,
  the working tree state, and the currently checked-out branch. Record the initial status so pre-existing
  user changes are not accidentally included.
- Work only on the branch already checked out. Do not create, switch, rename, rebase, reset, or delete a
  branch. Do not run `git init` or clone another repository from this coding task. If there is no Git worktree,
  no `origin`, detached HEAD, an unexpected branch, or a dirty state you cannot safely isolate, STOP and report.
- Never stage with `git add .` or `git add -A`. Stage only files changed for this task. Never stage `.env`, API
  keys, tokens, Claude settings containing secrets, private data, or generated artifacts.
- After implementation, run the relevant tests, inspect the full diff, run `git diff --check`, and verify the
  staged diff contains no secrets. If a required validation fails, do not commit or push; report the failure.
- If validations pass, make a focused commit and push it to the same current branch on `origin`. Never force-push.
  If the remote branch is protected, diverged, or rejects the push, STOP; do not create another branch or rewrite
  history. Report the exact branch, commit hash, push result, and remaining issues.
- Read-only audit prompts must not edit, commit, or push anything.
```

## ۷. اقدام‌های بعدی، به ترتیب

1. **انجام شد:** clone در `/home/jcode/claude_code/ghost_of_ausmt`، `origin` درست، branch `main` و working tree تمیز و sync با `origin/main`.
2. **استخراج محلی انجام شد:** اسناد ۰۰ تا ۰۷ و `AGENTS.md`/`CLAUDE.md` در clone حاضرند و هنوز untracked هستند. پیش از baseline docs-only commit، فایل‌ها و نبود secret بازبینی شوند.
3. قرار دادن AgentRouter در تنظیمات user-level خارج از Git؛ بررسی اینکه `ANTHROPIC_API_KEY` با `ANTHROPIC_AUTH_TOKEN` هم‌زمان تنظیم نشده باشد.
4. تأیید کتبی/شفاف اینکه مدل انتخابی واقعاً رایگان یا با اعتبار مجاز پوشش داده می‌شود؛ در غیر این صورت اجرای prompt مدل متوقف بماند.
5. اجرای P0 فقط‌خواندنی روی clone و بازبینی گزارش؛ پس از آن P1 و هر milestone با diff/test/commit/push جداگانه روی همان branch.
6. پیش از P4، M3 را کامل و نقش‌ها، شناسهٔ ورود و refresh-session را تصویب کن.
7. پس از پاس‌شدن MVP، استقرار آزمایشی روی Ubuntu و سپس آماده‌سازی runbook برای دیپلوی دستی روی سرور دیگر؛ هرگز server credential را در Git یا prompt نگذار.
