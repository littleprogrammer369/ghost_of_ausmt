# ghost_of_ausmt — سامانهٔ مدیریت همایش

سامانه‌ای پیکربندی‌محور برای مدیریت همایش‌های دانشگاهی؛ یک کدبیس مشترک با استقرار مستقل روی سرور هر دانشگاه و تنظیمات برند/داده‌ی جداگانه.

## وضعیت فعلی

این مخزن در فاز مستندات و آماده‌سازی است؛ **هنوز اپلیکیشن، API، پایگاه‌داده، CI یا deployment ساخته نشده‌اند**. اسناد پایه در commit `8690bbc` روی branch `main` push شده‌اند. بسته‌ی refresh همراه پروژه، یک به‌روزرسانی اسنادی است و تاریخچه‌ی Git را reset یا بازنویسی نمی‌کند.

وضعیت عملیاتی، هشدار هویت commit و ترتیب کار در [`docs/08-current-state-and-next-steps.md`](docs/08-current-state-and-next-steps.md) آمده است. نقشه‌ی کامل اجرا در [`docs/07-implementation-roadmap-and-github-workflow.md`](docs/07-implementation-roadmap-and-github-workflow.md) است.

## اصول محصول

- فارسی و انگلیسی از روز اول، با RTL/LTR کامل.
- یک کدبیس؛ نصب و برند مستقل برای هر دانشگاه، بدون forkهای مشتری‌محور.
- سایت شرکتی با Neumorphism کنترل‌شده، سایت همایش با Glassmorphism کنترل‌شده و پنل دانشگاه با Claymorphism کنترل‌شده؛ خوانایی و دسترس‌پذیری اولویت دارند.
- هیچ ایموجی در UI یا عنوان‌ها؛ آیکون‌های کتابخانه‌ای مثل Lucide.
- دسترسی tenant-scoped با `conference_id`، رویدادهای audit/history و فایل‌های مقاله خصوصی.
- AI باید مسیر محلی/قاعده‌محور داشته باشد؛ ارسال بیرونی اختیاری و تابع مجوز است.
- MVP بدون درگاه پرداخت.

## از کجا شروع کنیم

1. قواعد ایجنت را بخوان: [`AGENTS.md`](AGENTS.md) و [`CLAUDE.md`](CLAUDE.md).
2. فهرست اسناد و وضعیتشان: [`docs/README.md`](docs/README.md).
3. پیش از هر درخواست Claude Code/Cline، گیت هزینه‌ی صفر را در سند ۰۸ پاس کن. موفقیت اتصال یا عبارت “free” کافی نیست.
4. P0 در سند ۰۶ فقط‌خواندنی است؛ آن هم تا تأیید هزینه‌ی صفر اجرا نشود.
5. هر تغییر پس از اعتبارسنجی روی همان branch موجود commit و push می‌شود؛ branch جدید، force-push و secret در Git ممنوع است.

## نسخه‌های هدف فعلی

- Node.js: `24.21.0` — در `.nvmrc` و `.node-version`.
- Next.js، NestJS، Prisma و PostgreSQL: فقط پس از bootstrap و بررسی نسخه‌های پایدار، در lockfile/container قفل می‌شوند؛ این مخزن هنوز dependency ندارد.

## English summary

A configuration-driven academic conference platform: one codebase, independently deployed per university, with bilingual Persian/English UX, tenant-scoped data, private paper files, an offline/rule-based AI fallback, and no payment gateway in the initial MVP. This repository is currently in the documentation/planning stage; no application code or runtime has been scaffolded.
