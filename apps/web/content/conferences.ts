/**
 * Sample conference configurations.
 *
 * These are clearly fictional fixtures used to demonstrate that conference
 * identity and branding come from configuration rather than from code. No real
 * university, person, or event is represented here.
 */

export type Locale = 'fa' | 'en';
export type LocalizedText = Record<Locale, string>;

export type Topic = {
  id: string;
  title: LocalizedText;
  keywords: LocalizedText;
};

export type TopicGroup = {
  id: string;
  title: LocalizedText;
  topics: Topic[];
};

export type ImportantDate = {
  id: string;
  label: LocalizedText;
  /** ISO date, formatted per locale at render time. */
  iso: string;
  note?: LocalizedText;
};

export type Conference = {
  id: string;
  slug: string;
  identity: {
    title: LocalizedText;
    edition: LocalizedText;
    intro: LocalizedText;
    venue: LocalizedText;
    secretariatPhone: string;
    secretariatEmail: string;
  };
  /** Approved token names only; the values live in globals.css. */
  brandTokens: {
    hero: string;
    primary: string;
    canvas: string;
  };
  hero: {
    eyebrow: LocalizedText;
    headline: LocalizedText;
    highlightedWord: LocalizedText;
    description: LocalizedText;
    primaryAction: LocalizedText;
    secondaryAction: LocalizedText;
  };
  importantDates: ImportantDate[];
  topicGroups: TopicGroup[];
};

export const conferences: Conference[] = [
  {
    id: 'ict-frontiers',
    slug: 'ict-frontiers',
    identity: {
      title: {
        fa: 'همایش بین‌المللی مرزهای نوین فناوری اطلاعات و ارتباطات',
        en: 'International Conference on New Frontiers in Information and Communication Technology',
      },
      edition: { fa: 'نشست چهارم', en: 'Fourth edition' },
      intro: {
        fa: 'این همایش فرصتی برای گفت‌وگوی علمی میان پژوهشگران دانشگاه‌ها و متخصصان صنعت است و به کاربردهای پایدار فناوری‌های نوین می‌پردازد. محتوای این صفحه نمونه است و برای نمایش چیدمان دوزبانه تهیه شده است.',
        en: 'A meeting for scientific exchange between university researchers and industry practitioners, focused on sustainable applications of emerging technology. The content on this page is sample material used to demonstrate the bilingual layout.',
      },
      venue: { fa: 'دانشگاه نمونه · حضوری و مجازی', en: 'Sample University · In-person and online' },
      secretariatPhone: '+98 21 0000 0000',
      secretariatEmail: 'secretariat@example.test',
    },
    brandTokens: {
      hero: 'hero-ict',
      primary: 'color-brand-500',
      canvas: 'color-canvas',
    },
    hero: {
      eyebrow: { fa: 'ثبت مقالات باز است', en: 'Call for papers is open' },
      headline: {
        fa: 'پژوهش‌های کاربردی در مرزهای نوین فناوری اطلاعات',
        en: 'Applied research on the new frontiers of information technology',
      },
      highlightedWord: { fa: 'فناوری اطلاعات', en: 'information technology' },
      description: {
        fa: 'مقالات پذیرفته‌شده در مجموعه‌ی همایش منتشر می‌شوند و هر مقاله پس از داوری متخصصان بازخورد ساختاری دریافت می‌کند.',
        en: 'Accepted papers appear in the conference proceedings, and each paper receives structured feedback from specialist reviewers.',
      },
      primaryAction: { fa: 'ارسال مقاله', en: 'Submit a paper' },
      secondaryAction: { fa: 'مشاهده‌ی محورهای همایش', en: 'Explore conference topics' },
    },
    importantDates: [
      {
        id: 'submission',
        label: { fa: 'مهلت ارسال مقاله', en: 'Paper submission deadline' },
        iso: '2026-12-06',
        note: {
          fa: 'تمدید مهلت در اطلاعیه‌ها اعلام می‌شود',
          en: 'Any extension will be announced in updates',
        },
      },
      {
        id: 'decision',
        label: { fa: 'اعلام نتایج داوری', en: 'Review decision notification' },
        iso: '2027-02-20',
      },
      {
        id: 'start',
        label: { fa: 'شروع همایش', en: 'Conference opening' },
        iso: '2027-04-08',
      },
      {
        id: 'end',
        label: { fa: 'پایان همایش', en: 'Conference close' },
        iso: '2027-04-09',
      },
    ],
    topicGroups: [
      {
        id: 'computing',
        title: { fa: 'رایانش و معماری سامانه‌ها', en: 'Computing and systems architecture' },
        topics: [
          {
            id: 'distributed',
            title: { fa: 'سامانه‌های توزیع‌شده و ابری', en: 'Distributed and cloud systems' },
            keywords: { fa: 'زمان‌بندی، مقیاس‌پذیری', en: 'scheduling, scalability' },
          },
          {
            id: 'security',
            title: { fa: 'امنیت و حریم خصوصی', en: 'Security and privacy' },
            keywords: { fa: 'رمزنگاری، کنترل دسترسی', en: 'cryptography, access control' },
          },
          {
            id: 'networks',
            title: { fa: 'شبکه و زیرساخت', en: 'Networks and infrastructure' },
            keywords: { fa: 'زیرساخت، تأخیر', en: 'infrastructure, latency' },
          },
        ],
      },
      {
        id: 'intelligence',
        title: { fa: 'هوش مصنوعی و داده', en: 'Artificial intelligence and data' },
        topics: [
          {
            id: 'learning',
            title: { fa: 'یادگیری ماشین کاربردی', en: 'Applied machine learning' },
            keywords: { fa: 'یادگیری عمیق، ارزیابی', en: 'deep learning, evaluation' },
          },
          {
            id: 'language',
            title: { fa: 'پردازش زبان فارسی', en: 'Persian language processing' },
            keywords: { fa: 'نرمال‌سازی، چکیده‌سازی', en: 'normalization, summarization' },
          },
        ],
      },
    ],
  },
  {
    id: 'sustainable-campus',
    slug: 'sustainable-campus',
    identity: {
      title: {
        fa: 'همایش ملی انرژی پاک و دانشگاه پایدار',
        en: 'National Conference on Clean Energy and the Sustainable Campus',
      },
      edition: { fa: 'نشست دوم', en: 'Second edition' },
      intro: {
        fa: 'تمرکز این نشست بر مصرف بهینه‌ی انرژی و آب در دانشگاه‌ها و انتقال تجربه‌های عملیاتی میان کارگاه‌ها است. محتوای این صفحه نمونه است و برای نمایش چیدمان دوزبانه تهیه شده است.',
        en: 'This edition focuses on efficient energy and water use across campuses and on transferring practical experience between workshops. The content here is sample material used to demonstrate the bilingual layout.',
      },
      venue: { fa: 'دانشگاه نمونه · ترکیب حضوری', en: 'Sample University · Hybrid attendance' },
      secretariatPhone: '+98 21 0000 0001',
      secretariatEmail: 'sustainability@example.test',
    },
    brandTokens: {
      hero: 'hero-sustainability',
      primary: 'color-accent-teal',
      canvas: 'color-canvas-alt',
    },
    hero: {
      eyebrow: { fa: 'در حال برنامه‌ریزی', en: 'Planning in progress' },
      headline: {
        fa: 'مسیر عملیاتی دانشگاه پایدار و انرژی پاک',
        en: 'The practical path to a sustainable campus and clean energy',
      },
      highlightedWord: { fa: 'دانشگاه پایدار', en: 'sustainable campus' },
      description: {
        fa: 'گزارش‌های اجرایی، سنجه‌های مصرف و تجربه‌ی میدانی در اولویت این نشست قرار دارد؛ متن و تاریخ‌های نمایش‌داده‌شده نمونه‌اند.',
        en: 'Operational reports, consumption metrics and field experience are the priorities of this edition; the text and dates shown are samples.',
      },
      primaryAction: { fa: 'ارسال مقاله', en: 'Submit a paper' },
      secondaryAction: { fa: 'مشاهده‌ی محورهای همایش', en: 'Explore conference topics' },
    },
    importantDates: [
      {
        id: 'submission',
        label: { fa: 'مهلت ارسال چکیده', en: 'Abstract submission deadline' },
        iso: '2027-01-18',
      },
      {
        id: 'decision',
        label: { fa: 'اعلام نتایج داوری', en: 'Review decision notification' },
        iso: '2027-03-04',
      },
      {
        id: 'start',
        label: { fa: 'شروع همایش', en: 'Conference opening' },
        iso: '2027-05-19',
      },
      {
        id: 'end',
        label: { fa: 'پایان همایش', en: 'Conference close' },
        iso: '2027-05-20',
      },
    ],
    topicGroups: [
      {
        id: 'energy',
        title: { fa: 'تولید و ذخیره‌ی انرژی', en: 'Energy generation and storage' },
        topics: [
          {
            id: 'solar',
            title: { fa: 'سامانه‌های خورشیدی دانشگاهی', en: 'Campus photovoltaic systems' },
            keywords: { fa: 'بازده، نگهداری', en: 'yield, maintenance' },
          },
          {
            id: 'storage',
            title: { fa: 'ذخیره‌سازی و مدیریت بار', en: 'Storage and load management' },
            keywords: { fa: 'باتری، شبکه‌ی داخلی', en: 'batteries, microgrid' },
          },
        ],
      },
      {
        id: 'consumption',
        title: { fa: 'مصرف بهینه و بهره‌وری', en: 'Consumption and efficiency' },
        topics: [
          {
            id: 'water',
            title: { fa: 'مدیریت آب در پردیس‌ها', en: 'Water management across campuses' },
            keywords: { fa: 'بازیافت، حسگر', en: 'recycling, sensing' },
          },
        ],
      },
    ],
  },
];

export const conferenceById = (id: string): Conference | undefined =>
  conferences.find((conference) => conference.id === id);

export const defaultConferenceId = conferences[0].id;