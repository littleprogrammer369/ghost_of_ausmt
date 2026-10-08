# نقشهٔ اجرایی سامانهٔ مدیریت همایش و گردش‌کار GitHub

**نسخه:** 0.2
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

## ۲. وضعیت واقعی مخزن و گیت‌های قبل از کدنویسی

> **Snapshot:** ۸ اکتبر ۲۰۲۶؛ بر اساس خروجی ترمینالی که مالک محصول فرستاده است. وضعیت‌های بعدی باید با Git بررسی شوند، نه با حدس.

### موارد تأییدشده

- مخزن واقعی در `/home/jcode/claude_code/ghost_of_ausmt` است؛ `origin` برابر `https://github.com/littleprogrammer369/ghost_of_ausmt.git`، branch فعال `main` و upstream برابر `origin/main` است.
- commit پایه‌ی مستندات `8690bbc` با پیام `docs: add roadmap and coding-agent workflow` ساخته و به `main` push شده است. خروجی کاربر پس از push نشان داد branch با `origin/main` همگام و working tree پاک است.
- مخزن در این snapshot فقط مستندات/قواعد/README و markerهای Node دارد؛ اپلیکیشن، dependency install، CI، Compose و deploy پیاده‌سازی نشده‌اند.
- **هویت نویسنده‌ی `8690bbc` اشتباه است:** دستور ثبت‌شده مقدار نمونه‌ی `YOUR_VERIFIED_GITHUB_EMAIL_OR_NOREPLY` را عیناً به `user.email` داده است. این metadata را با amend/rebase/force-push تغییر نده؛ تاریخچه‌ی منتشرشده حفظ می‌شود. پیش از commit بعدی، email واقعی تأییدشده یا GitHub noreply را فقط در `git config --local` تنظیم کن؛ مقدار email را در گفتگو یا فایل پروژه منتشر نکن.
- کاربر یک بسته‌ی refresh می‌گیرد که فایل‌های پروژه را از ابتدا و یک‌دست جایگزین می‌کند. اسکریپت بسته باید قبل از تغییر backup زمان‌دار خارج از repo بگیرد، فقط مسیرهای فهرست‌شده را جایگزین کند، `.git` و تنظیمات بیرونی Claude Code را دست‌نخورده نگه دارد و خودش commit/push نکند.
- طبق خروجی Claude Code، تنظیم AgentRouter در `/home/jcode/claude_code/.claude/settings.json` گزارش شده؛ این مسیر بیرون از مخزن محصول است و با `/home/jcode/.claude/settings.json` یکی نیست. token را در مخزن یا bundle کپی نکن.
- در Claude Code پیام `API Usage Billing` و نرخ‌های دلاری دیده شده‌اند. اتصال سبز یا کارکرد ابزار، رایگان‌بودن را ثابت نمی‌کند. هیچ promptی—حتی P0—پیش از تأیید مستندِ هزینه‌ی صفر یا سهمیه‌ی رایگان معتبر اجرا نشود.

### روش امن استفاده از بسته‌ی refresh

1. ZIP را بیرون از repo استخراج کن؛ بسته حاوی `.git` نیست.
2. `apply.sh` فقط وقتی ادامه می‌دهد که ریشه، `origin`, branch `main`, upstream و working tree با مخزن مورد انتظار هم‌خوان باشند. اگر وضعیت فرق دارد، متوقف می‌شود.
3. پیش از جایگزینی، نسخه‌ی پشتیبان timestampدار بیرون از repo می‌سازد. فقط `README.md`، `AGENTS.md`، `CLAUDE.md`، `.gitignore`، `.nvmrc`، `.node-version` و `docs/` را جایگزین می‌کند؛ `.git`، remote، branch، history، `.claude/` بیرونی و هر مسیر دیگری را حذف نمی‌کند.
4. اسکریپت فایل‌ها را نصب و `git diff --check` را اجرا می‌کند؛ هیچ فایل را stage، commit یا push نمی‌کند. diff را بازبینی کن.
5. قبل از commit، اسکریپت `set-git-author.sh` را برای ثبت نام و ایمیل محلی اجرا کن. ایمیل از GitHub Settings → Emails کپی می‌شود؛ اسکریپت آن را روی صفحه چاپ نمی‌کند و هیچ تنظیم global نمی‌سازد.
6. پس از بازبینی، فقط فایل‌های مشخص‌شده را stage کن؛ commit/push بعدی روی همان `main` و بدون force-push است.
7. گیت صفرِ هزینه جداست: تا شناسه‌ی دقیق مدل، route، قیمت/سهمیه و مجوز استفاده برای همان حساب ثابت نشده، هیچ درخواست Claude Code/AgentRouter نفرست.

## ۳. نقشهٔ milestoneها

| مرحله | هدف و خروجی | معیار عبور |
|---|---|---|
| **M0 — سلامت ریپو و آماده‌سازی کم‌هزینه** | تأیید clone/`origin`/branch، اعمال و بازبینی بسته‌ی refresh، هویت commit معتبر، کنترل secretها و تثبیت همان branch | `git status`، ریشه و `origin` درست باشند؛ refresh بدون حذف `.git` بازبینی و روی branch فعلی push شود؛ فایل secret در Git نباشد؛ هزینه‌ی صفر برای مسیر مدل تأیید شده باشد. |
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
- Before committing, verify the repo-local Git author is owner-confirmed and not a sample placeholder. If it is
  missing or uncertain, stop and ask the owner to set it locally; never print the email or change global identity.
- If validations and author identity pass, make a focused commit and push it to the same current branch on `origin`. Never force-push.
  If the remote branch is protected, diverged, or rejects the push, STOP; do not create another branch or rewrite
  history. Report the exact branch, commit hash, push result, and remaining issues.
- Read-only audit prompts must not edit, commit, or push anything.
```

## ۷. اقدام‌های بعدی، به ترتیب

1. **انجام شد طبق خروجی کاربر:** clone در `/home/jcode/claude_code/ghost_of_ausmt`، `origin` درست، branch `main` و `origin/main` همگام در commit `8690bbc`.
2. **انجام شد:** baseline اسناد در `8690bbc` به GitHub push شده است؛ هیچ کد اپلیکیشن نوشته نشده.
3. بسته‌ی refresh را با `apply.sh` نصب کن، backup path را نگه دار و diff را بازبینی کن؛ `.git`، history و تنظیمات `.claude` بیرونی را حذف نکن.
4. قبل از commit refresh، هویت Git را با `set-git-author.sh` به نام دلخواه و ایمیل تأییدشده/noreply به‌صورت local تنظیم کن. ایمیل نمونه‌ی commit قبلی را در تاریخچه بازنویسی نکن.
5. هزینه‌ی صفر و route دقیق مدل را مستنداً تأیید کن؛ اگر تأیید نشد، هیچ prompt مدلی، حتی P0، اجرا نشود.
6. بعد از review diff و `git diff --check`، تغییرات مستندات را به همان `main` commit/push کن؛ سپس P0 فقط‌خواندنی و در صورت تأیید، P1 را اجرا کن.
7. پیش از M3، نقش‌ها، شناسهٔ ورود و refresh-session را تصویب کن؛ پس از MVP، Ubuntu pilot و runbook استقرار دستی را آماده کن.
