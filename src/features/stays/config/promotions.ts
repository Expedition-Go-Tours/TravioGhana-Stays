export type PromotionMeta = {
  bookDates?: string;
  stayDates?: string;
  discount?: string;
};

export type PromotionCard = {
  key: string;
  title: string;
  description: string;
  isNew?: boolean;
  meta?: PromotionMeta;
  removable?: boolean;
  /** The dedicated promotion flow, once one exists. */
  to?: string;
};

/** The promotion catalogue shown on the Special Offers landing page. */
export const PROMOTIONS: PromotionCard[] = [
  {
    key: "property-deal",
    title: "Create a New Property Deal",
    description: "Get your first bookings faster by giving 20% off for a limited time",
    to: "/stays/special-offers/property-deal",
  },
  {
    key: "black-friday",
    title: "Black Friday Deal",
    description:
      "Attract new travellers while demand is high. Give a discount and join the biggest shopping event of the year.",
    isNew: true,
    meta: {
      bookDates: "From 19 Nov 2026 to 2 Dec 2026",
      stayDates: "From 19 Nov 2026 to 31 Dec 2027",
      discount: "minimum 30%",
    },
  },
  {
    key: "basic-deal",
    title: "Basic Deal",
    description: "Give your guests a discount – in just a few clicks",
    to: "/stays/special-offers/basic-deal",
  },
  {
    key: "early-booker",
    title: "Early Booker Deal",
    description: "Get a head start and appeal to eager bookers",
    to: "/stays/special-offers/early-booker",
  },
  {
    key: "last-minute",
    title: "Last Minute Deal",
    description: "Attract last-minute bookers to your properties",
    to: "/stays/special-offers/last-minute",
  },
  {
    key: "early-2027",
    title: "Early 2027 Deal",
    description: "Secure advance bookings and get the new year off to a strong start",
    isNew: true,
    meta: {
      bookDates: "From 3 Dec 2026 to 1 Apr 2027",
      stayDates: "From 1 Jan 2027 to 1 Apr 2027",
      discount: "minimum 15%",
    },
  },
  {
    key: "late-escape",
    title: "Late Escape Deal",
    description: "Get on average 11% more bookings until 7 Jan 2027",
    to: "/stays/special-offers/late-escape",
    meta: {
      bookDates: "From 3 Sept 2026 to 7 Jan 2027",
      stayDates: "From 1 Oct 2026 to 7 Jan 2027",
      discount: "minimum 15%",
    },
  },
];
