export type Product = {
  identifier: string;
  values: {
    [key: string]: {
      data: any;
      locale: string;
      scope: string;
    }[];
  };
  _links: {
    next?: {
      href: string;
    };
    previous?: {
      href: string;
    };
  };
};
