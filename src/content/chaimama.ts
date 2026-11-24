import type { Localized } from './types';

/**
 * Chai Mama — the tea brand's website. Two blends:
 *  - Heritage Blend (the saffron pack) and The Lovely Blend (the red pack): their names, sizes and
 *    descriptions are the owner's own words (2026-10-21); the facts and Kurdish lines are printed on the
 *    packs (photos supplied by the owner). Nothing invented.
 *  - The headline is the packs' Kurdish slogan, never translated.
 * Kurdish copy beyond the packs is Claude's Sorani, for the owner to check.
 */
export type BlendId = 'heritage' | 'lovely';
export const BLENDS: readonly BlendId[] = ['heritage', 'lovely'];

/** The line icons beside a blend's facts (drawn in the page, CM-007). */
export type FactIcon = 'leaf' | 'citrus' | 'pod' | 'flower' | 'cup' | 'plain';

export interface ChaiBlend {
  /** As on the pack, e.g. "Heritage Blend". */
  name: string;
  /** "200g pouch". */
  size: string;
  /** The hero's line under the headline. */
  lede: string;
  /** The tea section's description. */
  description: string;
  /** Facts printed on the pack, each with its icon. */
  facts: readonly { text: string; icon: FactIcon }[];
  /** The pack's own Kurdish line about the blend. */
  packLine: string;
  /** The pouch on the ledge, for screen readers. */
  heroAlt: string;
  /** The product photo in the tea section. */
  packAlt: string;
}

export interface ChaiMamaContent {
  brand: {
    name: string;
    /** The Kurdish wordmark, as on the pack. */
    wordmark: string;
    /** The packs' Kurdish slogan — the homepage's headline. */
    slogan: string;
  };
  nav: {
    product: string;
    label: string;
    /** The homepage's own nav (CM-008). */
    home: string;
    about: string;
    shop: string;
    connect: string;
    menu: string;
    language: string;
  };
  hero: {
    eyebrow: string;
    scroll: string;
    /** The blend switch. */
    blends: string;
    /** What a screen reader hears after a switch. */
    switched: (name: string) => string;
  };
  blends: Record<BlendId, ChaiBlend>;
  product: { eyebrow: string; kind: string; mascotAlt: string };
  /**
   * The shop (CM-010). The prices are the owner's (src/site/order.ts); ordering is not open on
   * the site yet, and the page says so. No offers, delivery terms or guarantees: none are known.
   */
  shop: {
    eyebrow: string;
    /** The blend choice in the shop. */
    choose: string;
    order: string;
    pouch: string;
    carton: string;
    /** The pouch's weight, e.g. "200g". */
    weight: string;
    pouches: (n: string) => string;
    each: (price: string) => string;
    perCarton: (price: string) => string;
    quantity: string;
    less: string;
    more: string;
    summary: string;
    unit: string;
    delivery: string;
    deliveryValue: string;
    subtotal: string;
    subtotalNote: string;
    cta: string;
    ctaNote: string;
  };
  /** The section after the tea (CM-007): the other blend, in its own light. */
  other: { eyebrow: string; explore: string; blends: string; next: string; scroll: string };
  /**
   * About (CM-011): the owner's own words about the brand and how its tea is made (2026-10-22). It takes the
   * place of CM-007's curtain footer at the end of the page.
   */
  about: {
    title: string;
    lede: string;
    storyEyebrow: string;
    storyTitle: string;
    story: readonly string[];
    /** The name, from the owner's first paragraph: "Mama" is "uncle" in Kurdish. */
    name: { word: string; meaning: string };
    processEyebrow: string;
    processTitle: string;
    processLede: string;
    steps: readonly { title: string; body: string }[];
    close: string;
  };
  /** Connect (CM-008): no contact details or social links exist yet, and none are made up. */
  connect: { eyebrow: string; title: string; body: string };
  footer: {
    /** The giant outlined word behind the end of the page. */
    giant: string;
    top: string;
    label: string;
  };
  meta: { title: string; description: string };
}

const SLOGAN = 'هەر چاکەی مامە چاکە';
const HERITAGE_PACK_LINE = 'تێکەڵەیەکی ناوازەی چای ڕەشی سیلۆنی بە تامی ئێرڵ گرێی، هێل و گوڵ';
const LOVELY_PACK_LINE = 'تێکەڵەیەکی ناوازەی چای ڕەش (تامی چایخانە)';

export const chaimamaContent: Localized<ChaiMamaContent> = {
  en: {
    brand: { name: 'Chai Mama', wordmark: 'چای مامە', slogan: SLOGAN },
    nav: {
      product: 'The tea',
      label: 'Chai Mama',
      home: 'Home',
      about: 'About',
      shop: 'Shop',
      connect: 'Connect',
      menu: 'Menu',
      language: 'Language',
    },
    hero: {
      eyebrow: 'Black tea',
      scroll: 'Scroll',
      blends: 'Choose a blend',
      switched: (name) => `${name}, shown.`,
    },
    blends: {
      heritage: {
        name: 'Heritage Blend',
        size: '200g pouch',
        lede: 'A balanced family recipe with black tea, cardamom, and rose petals — made for a consistent cup, every time.',
        description:
          'Our signature family recipe — a balanced blend of Ceylon black tea, cornflower, rose petals, crushed cardamom, and earl grey. Packed to preserve freshness from first cup to last.',
        facts: [
          { text: 'Earl Grey flavour', icon: 'citrus' },
          { text: 'Cardamom flavour', icon: 'leaf' },
          { text: 'Rose petals', icon: 'flower' },
          { text: 'Cardamom pods', icon: 'pod' },
        ],
        packLine: HERITAGE_PACK_LINE,
        heroAlt:
          'A pouch of Chai Mama Heritage Blend on a mossy rock above green tea rows, in clear daylight',
        packAlt: 'The Chai Mama Heritage Blend pouch',
      },
      lovely: {
        name: 'The Lovely Blend',
        size: '200g pouch',
        lede: 'Pure Ceylon black tea only — the same quality base as our Heritage Blend, without the added flowers, cardamom, or earl grey. Simple, bold, and reliable.',
        description:
          'Pure Ceylon black tea only — the same quality base as our Heritage Blend, without the added flowers, cardamom, or earl grey. Simple, bold, and reliable.',
        facts: [
          { text: 'Blend of special black tea', icon: 'leaf' },
          { text: 'Unflavoured', icon: 'plain' },
          { text: 'Tea-house flavour', icon: 'cup' },
        ],
        packLine: LOVELY_PACK_LINE,
        heroAlt:
          'A pouch of Chai Mama The Lovely Blend on the same rock, the tea rows and the misty valley in the warm light late in the day',
        packAlt: 'The Chai Mama The Lovely Blend pouch',
      },
    },
    product: {
      eyebrow: 'The tea',
      kind: 'Black tea',
      mascotAlt: 'Mama, the Chai Mama mascot, holding a glass of tea',
    },
    shop: {
      eyebrow: 'Shop',
      choose: 'Choose your tea',
      order: 'Choose your order',
      pouch: 'Single pouch',
      carton: 'Master carton',
      weight: '200g',
      pouches: (n) => `${n} pouches`,
      each: (price) => `${price} each`,
      perCarton: (price) => `${price} / carton`,
      quantity: 'Quantity',
      less: 'One less',
      more: 'One more',
      summary: 'Order summary',
      unit: 'Unit price',
      delivery: 'Delivery',
      deliveryValue: 'Not included',
      subtotal: 'Subtotal',
      subtotalNote: 'Before delivery',
      cta: 'Ordering opens soon',
      ctaNote: 'Ordering on the site isn’t open yet, so nothing has been ordered.',
    },
    other: {
      eyebrow: 'Another flavour',
      explore: 'Explore this flavour',
      blends: 'Our blends',
      next: 'Next blend',
      scroll: 'Scroll to discover more',
    },
    about: {
      title: 'Our Story',
      lede: 'A journey of love, heritage, and the perfect cup of tea.',
      storyEyebrow: 'About',
      storyTitle: 'Chai Mama',
      story: [
        'Chai Mama is a Kurdish tea brand built on tradition, heritage, and community. The name “Mama” means “uncle” in Kurdish — a warm, familiar way people address each other, reflecting belonging and togetherness.',
        'Our flagship blend is a family recipe passed down through generations and perfected over seven years by a mother and father. Today, we carry their dream forward — crafted with care to bring the taste of our home into yours.',
        'Chai Mama is more than tea — it’s a story of Kurdish love and tradition. Every element — name, blend, packaging, storytelling — is designed to stand out, feel premium, and feel alive.',
      ],
      name: { word: 'مامە', meaning: '“Mama” — uncle, in Kurdish' },
      processEyebrow: 'Our Process',
      processTitle: 'How It’s Made',
      processLede: 'Each blend is built with a clear purpose — crafted with care, controlled with precision.',
      steps: [
        { title: 'Selected', body: 'Ingredients are selected to complement each other.' },
        { title: 'Controlled', body: 'Ratios are controlled for consistency.' },
        { title: 'Standardised', body: 'Every batch is produced to match the same standard.' },
      ],
      close: 'No variation. No guesswork.',
    },
    connect: {
      eyebrow: 'Connect',
      title: 'Connect with Chai Mama',
      body: "Chai Mama's contact details and social links aren't on the site yet.",
    },
    footer: {
      giant: 'CHAI MAMA',
      top: 'Back to the top',
      label: 'Chai Mama',
    },
    meta: {
      title: 'Chai Mama — black tea: Heritage Blend and The Lovely Blend',
      description:
        'Chai Mama black tea: Heritage Blend, a balanced family recipe with black tea, cardamom and rose petals, and The Lovely Blend, pure Ceylon black tea.',
    },
  },
  ckb: {
    brand: { name: 'چای مامە', wordmark: 'چای مامە', slogan: SLOGAN },
    nav: {
      product: 'چاکە',
      label: 'چای مامە',
      home: 'سەرەکی',
      about: 'دەربارە',
      shop: 'فرۆشگا',
      connect: 'پەیوەندی',
      menu: 'پێڕست',
      language: 'زمان',
    },
    hero: {
      eyebrow: 'چای ڕەش',
      scroll: 'سکڕۆڵ',
      blends: 'تێکەڵەیەک هەڵبژێرە',
      switched: (name) => `${name}، پیشان درا.`,
    },
    blends: {
      heritage: {
        name: 'تێکەڵەی ڕەسەن',
        size: 'پاکەتی ٢٠٠ گرامی',
        lede: 'ڕەچەتەیەکی خێزانیی هاوسەنگ لە چای ڕەش، هێل و پەڕەی گوڵ — بۆ پەرداخێکی هەمیشە یەکسان.',
        description:
          'ڕەچەتە تایبەتەکەی خێزانەکەمان — تێکەڵەیەکی هاوسەنگ لە چای ڕەشی سیلۆنی، گوڵەگەنمە، پەڕەی گوڵ، هێلی کوتراو و ئێرڵ گرێی. بە شێوەیەک پاکەت کراوە کە تازەیی لە یەکەم پەرداخەوە تا دواین پەرداخ بپارێزێت.',
        facts: [
          { text: 'تامی ئێرڵ گرێی', icon: 'citrus' },
          { text: 'تامی هێل', icon: 'leaf' },
          { text: 'پەڕەی گوڵ', icon: 'flower' },
          { text: 'دەنکی هێل', icon: 'pod' },
        ],
        packLine: HERITAGE_PACK_LINE,
        heroAlt:
          'پاکەتێکی چای مامە، تێکەڵەی ڕەسەن، لەسەر بەردێک لە سەروو گردە سەوزەکانی چا، لە ڕووناکیی ڕۆژدا',
        packAlt: 'پاکەتی چای مامە، تێکەڵەی ڕەسەن',
      },
      lovely: {
        name: 'تێکەڵە حەیاتەکە',
        size: 'پاکەتی ٢٠٠ گرامی',
        lede: 'تەنها چای ڕەشی سیلۆنیی پاک — هەمان بنەمای کوالیتیی تێکەڵەی ڕەسەن، بەبێ گوڵ، هێل یان ئێرڵ گرێی. سادە، بەهێز و جێی متمانە.',
        description:
          'تەنها چای ڕەشی سیلۆنیی پاک — هەمان بنەمای کوالیتیی تێکەڵەی ڕەسەن، بەبێ گوڵ، هێل یان ئێرڵ گرێی. سادە، بەهێز و جێی متمانە.',
        facts: [
          { text: 'تێکەڵەیەکی ناوازەی چای ڕەش', icon: 'leaf' },
          { text: 'بێ بۆن', icon: 'plain' },
          { text: 'تامی چایخانە', icon: 'cup' },
        ],
        packLine: LOVELY_PACK_LINE,
        heroAlt:
          'پاکەتێکی چای مامە، تێکەڵە حەیاتەکە، لەسەر هەمان بەرد، گردەکانی چا و دۆڵە تەماویەکە لە ڕووناکیی گەرمی ئێوارەدا',
        packAlt: 'پاکەتی چای مامە، تێکەڵە حەیاتەکە',
      },
    },
    product: {
      eyebrow: 'چاکە',
      kind: 'چای ڕەش',
      mascotAlt: 'مامە، نیشانەی چای مامە، پەرداخێک چای بە دەستەوە',
    },
    shop: {
      eyebrow: 'فرۆشگا',
      choose: 'چاکەت هەڵبژێرە',
      order: 'داواکارییەکەت هەڵبژێرە',
      pouch: 'یەک پاکەت',
      carton: 'کارتۆنی تەواو',
      weight: '٢٠٠ گرام',
      pouches: (n) => `${n} پاکەت`,
      each: (price) => `هەر پاکەتێک ${price}`,
      perCarton: (price) => `${price} بۆ هەر کارتۆنێک`,
      quantity: 'ژمارە',
      less: 'یەکێک کەمتر',
      more: 'یەکێک زیاتر',
      summary: 'پوختەی داواکاری',
      unit: 'نرخی یەکە',
      delivery: 'گەیاندن',
      deliveryValue: 'تێیدا نییە',
      subtotal: 'کۆی گشتی',
      subtotalNote: 'بەبێ گەیاندن',
      cta: 'داواکردن بەم زووانە دەکرێتەوە',
      ctaNote: 'داواکردن لە ماڵپەڕەکەوە هێشتا نەکراوەتەوە، بۆیە هیچ داواکارییەک نەکرا.',
    },
    other: {
      eyebrow: 'تامێکی تر',
      explore: 'ئەم تامە ببینە',
      blends: 'تێکەڵەکانمان',
      next: 'تێکەڵەی دواتر',
      scroll: 'بۆ زیاتر سکڕۆڵ بکە',
    },
    about: {
      title: 'چیرۆکی ئێمە',
      lede: 'گەشتێکی خۆشەویستی، میرات و پەرداخێکی تەواوی چا.',
      storyEyebrow: 'دەربارە',
      storyTitle: 'چای مامە',
      story: [
        'چای مامە براندێکی چای کوردییە کە لەسەر نەریت، میرات و کۆمەڵگا بنیات نراوە. «مامە» لە کوردیدا واتە مام — شێوازێکی گەرم و ئاشنا کە خەڵک یەکتری پێ بانگ دەکەن، و هەستی سەر بە یەکبوون و پێکەوەبوون دەردەبڕێت.',
        'تێکەڵە سەرەکییەکەمان ڕەچەتەیەکی خێزانییە کە نەوە دوای نەوە گوازراوەتەوە و دایک و باوکێک ماوەی حەوت ساڵ کاریان لەسەر کرد تا تەواویان کرد. ئەمڕۆ ئێمە خەونەکەیان درێژە پێدەدەین — بە وردی و خۆشەویستی دروستی دەکەین، بۆ ئەوەی تامی ماڵی ئێمە بگاتە ماڵی ئێوە.',
        'چای مامە لە چا زیاترە — چیرۆکی خۆشەویستی و نەریتی کوردییە. هەموو بەشێکی — ناو، تێکەڵە، پاکەت و چیرۆک — بۆ ئەوە دیزاین کراوە کە جیاواز بێت، هەستی کوالیتیی بەرز بدات و زیندوو بێت.',
      ],
      name: { word: 'مامە', meaning: '«مامە» — مام، بە کوردی' },
      processEyebrow: 'پرۆسەکەمان',
      processTitle: 'چۆن دروست دەکرێت',
      processLede:
        'هەر تێکەڵەیەک بە ئامانجێکی ڕوون دروست دەکرێت — بە وردی ئامادە دەکرێت و بە وردبینی کۆنترۆڵ دەکرێت.',
      steps: [
        { title: 'هەڵبژاردن', body: 'پێکهاتەکان بە شێوەیەک هەڵدەبژێردرێن کە یەکتر تەواو بکەن.' },
        { title: 'کۆنترۆڵ', body: 'ڕێژەکان کۆنترۆڵ دەکرێن بۆ ئەوەی تام هەمیشە یەک بێت.' },
        { title: 'ستاندارد', body: 'هەموو بەرهەمێک بە هەمان ستاندارد بەرهەم دەهێنرێت.' },
      ],
      close: 'بێ جیاوازی. بێ مەزەندە.',
    },
    connect: {
      eyebrow: 'پەیوەندی',
      title: 'پەیوەندی بە چای مامەوە',
      body: 'زانیاریی پەیوەندی و تۆڕە کۆمەڵایەتییەکانی چای مامە هێشتا لەسەر ماڵپەڕەکە نین.',
    },
    footer: {
      giant: 'چای مامە',
      top: 'گەڕانەوە بۆ سەرەوە',
      label: 'چای مامە',
    },
    meta: {
      title: 'چای مامە — چای ڕەش',
      description: 'چای مامە: تێکەڵەی ڕەسەن و تێکەڵە حەیاتەکە.',
    },
  },
};
